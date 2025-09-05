import { supabase } from '../../api/supabase';

export interface PriceResult {
  price: number;
  source: 'clinic_custom' | 'lab_default' | 'manual_review';
  confidence: 'high' | 'medium' | 'low';
  message?: string;
}

export interface PricingRule {
  id: string;
  cpt_code: string;
  price: number;
  effective_date?: string;
  end_date?: string;
}

/**
 * Dynamic Pricing Service with Mandatory Lab Default Fallback
 * 
 * Pricing hierarchy:
 * 1. Clinic custom price (if exists)
 * 2. Lab default price (MANDATORY fallback)
 * 3. Flag for manual review (if no lab default)
 * 
 * This ensures NO invoice fails due to missing prices
 */
export class DynamicPricingService {
  private cache: Map<string, PriceResult> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private lastCacheClean = Date.now();

  constructor(
    private organizationId: string,
    private laboratoryId: string
  ) {}

  /**
   * Get price for a CPT code with mandatory fallback logic
   */
  async getPrice(
    clinicId: string,
    cptCode: string,
    serviceDate: Date = new Date()
  ): Promise<PriceResult> {
    // Check cache first
    const cacheKey = `${clinicId}-${cptCode}-${serviceDate.toISOString().split('T')[0]}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Step 1: Check for clinic custom price
      const clinicPrice = await this.getClinicCustomPrice(clinicId, cptCode, serviceDate);
      if (clinicPrice) {
        const result: PriceResult = {
          price: clinicPrice.price,
          source: 'clinic_custom',
          confidence: 'high',
          message: `Custom price for clinic ${clinicId}`
        };
        this.setCache(cacheKey, result);
        return result;
      }

      // Step 2: MANDATORY - Check lab default price
      const labPrice = await this.getLabDefaultPrice(cptCode, serviceDate);
      if (labPrice) {
        const result: PriceResult = {
          price: labPrice.price,
          source: 'lab_default',
          confidence: 'high',
          message: `Default lab price for CPT ${cptCode}`
        };
        this.setCache(cacheKey, result);
        return result;
      }

      // Step 3: No price found - flag for manual review
      // BUT provide a suggested price based on similar CPTs
      const suggestedPrice = await this.getSuggestedPrice(cptCode);
      const result: PriceResult = {
        price: suggestedPrice || 0,
        source: 'manual_review',
        confidence: 'low',
        message: `No price found for CPT ${cptCode}. Manual review required.`
      };
      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Error in dynamic pricing:', error);
      // Even on error, return something to prevent import failure
      return {
        price: 0,
        source: 'manual_review',
        confidence: 'low',
        message: `Error retrieving price: ${error.message}`
      };
    }
  }

  /**
   * Get clinic custom price
   */
  private async getClinicCustomPrice(
    clinicId: string,
    cptCode: string,
    serviceDate: Date
  ): Promise<PricingRule | null> {
    const { data, error } = await supabase
      .from('clinic_pricing_overrides')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('cpt_code', cptCode)
      .eq('organization_id', this.organizationId)
      .lte('effective_date', serviceDate.toISOString())
      .or(`end_date.is.null,end_date.gte.${serviceDate.toISOString()}`)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      cpt_code: data.cpt_code,
      price: Number(data.price),
      effective_date: data.effective_date,
      end_date: data.end_date
    };
  }

  /**
   * Get lab default price (MANDATORY fallback)
   */
  private async getLabDefaultPrice(
    cptCode: string,
    serviceDate: Date
  ): Promise<PricingRule | null> {
    // First try the pricing_rules table
    const { data: labPrice, error: labError } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('cpt_code', cptCode)
      .eq('is_default', true)
      .lte('effective_date', serviceDate.toISOString())
      .or(`end_date.is.null,end_date.gte.${serviceDate.toISOString()}`)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (!labError && labPrice) {
      return {
        id: labPrice.id,
        cpt_code: labPrice.cpt_code,
        price: Number(labPrice.base_price),
        effective_date: labPrice.effective_date,
        end_date: labPrice.end_date
      };
    }

    // Fallback to fee_schedules table
    const { data: feeSchedule, error: feeError } = await supabase
      .from('fee_schedule_items')
      .select('*, fee_schedules!inner(*)')
      .eq('fee_schedules.laboratory_id', this.laboratoryId)
      .eq('fee_schedules.is_default', true)
      .eq('cpt_code', cptCode)
      .single();

    if (!feeError && feeSchedule) {
      return {
        id: feeSchedule.id,
        cpt_code: feeSchedule.cpt_code,
        price: Number(feeSchedule.price),
        effective_date: feeSchedule.fee_schedules.effective_date
      };
    }

    return null;
  }

  /**
   * Get suggested price based on similar CPT codes
   */
  private async getSuggestedPrice(cptCode: string): Promise<number | null> {
    // Extract CPT category (first 3 digits)
    const category = cptCode.substring(0, 3);

    // Find average price for similar CPTs
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('base_price')
      .eq('organization_id', this.organizationId)
      .like('cpt_code', `${category}%`)
      .eq('is_default', true)
      .limit(10);

    if (error || !data || data.length === 0) return null;

    const prices = data.map(d => Number(d.base_price));
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    return Math.round(average * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Bulk price lookup for import optimization
   */
  async getBulkPrices(
    clinicId: string,
    cptCodes: string[],
    serviceDate: Date = new Date()
  ): Promise<Map<string, PriceResult>> {
    const results = new Map<string, PriceResult>();

    // Process in batches for performance
    const batchSize = 50;
    for (let i = 0; i < cptCodes.length; i += batchSize) {
      const batch = cptCodes.slice(i, i + batchSize);
      const promises = batch.map(code => 
        this.getPrice(clinicId, code, serviceDate)
          .then(result => ({ code, result }))
      );

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ code, result }) => {
        results.set(code, result);
      });
    }

    return results;
  }

  /**
   * Update clinic custom price
   */
  async updateClinicPrice(
    clinicId: string,
    cptCode: string,
    price: number,
    effectiveDate: Date = new Date()
  ): Promise<boolean> {
    try {
      // End any existing price
      const { error: updateError } = await supabase
        .from('clinic_pricing_overrides')
        .update({ end_date: new Date().toISOString() })
        .eq('clinic_id', clinicId)
        .eq('cpt_code', cptCode)
        .eq('organization_id', this.organizationId)
        .is('end_date', null);

      // Insert new price
      const { error: insertError } = await supabase
        .from('clinic_pricing_overrides')
        .insert({
          organization_id: this.organizationId,
          clinic_id: clinicId,
          cpt_code: cptCode,
          price: price,
          effective_date: effectiveDate.toISOString(),
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Clear cache for this clinic
      this.clearClinicCache(clinicId);

      return true;
    } catch (error) {
      console.error('Error updating clinic price:', error);
      return false;
    }
  }

  /**
   * Update lab default price
   */
  async updateLabDefaultPrice(
    cptCode: string,
    price: number,
    effectiveDate: Date = new Date()
  ): Promise<boolean> {
    try {
      // End any existing default price
      const { error: updateError } = await supabase
        .from('pricing_rules')
        .update({ end_date: new Date().toISOString(), is_default: false })
        .eq('organization_id', this.organizationId)
        .eq('cpt_code', cptCode)
        .eq('is_default', true)
        .is('end_date', null);

      // Insert new default price
      const { error: insertError } = await supabase
        .from('pricing_rules')
        .insert({
          organization_id: this.organizationId,
          cpt_code: cptCode,
          base_price: price,
          is_default: true,
          effective_date: effectiveDate.toISOString(),
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Clear all cache (affects all clinics)
      this.cache.clear();

      return true;
    } catch (error) {
      console.error('Error updating lab default price:', error);
      return false;
    }
  }

  /**
   * Import lab default price schedule
   */
  async importLabDefaultPrices(prices: Array<{ cpt_code: string; price: number }>) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const item of prices) {
      const success = await this.updateLabDefaultPrice(item.cpt_code, item.price);
      if (success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`Failed to import price for CPT ${item.cpt_code}`);
      }
    }

    return results;
  }

  /**
   * Get pricing analytics
   */
  async getPricingAnalytics(startDate: Date, endDate: Date) {
    const { data: invoiceItems, error } = await supabase
      .from('invoice_items')
      .select('cpt_code, unit_price, service_date')
      .eq('organization_id', this.organizationId)
      .gte('service_date', startDate.toISOString())
      .lte('service_date', endDate.toISOString());

    if (error || !invoiceItems) return null;

    // Analyze pricing patterns
    const analytics = {
      totalItems: invoiceItems.length,
      uniqueCpts: new Set(invoiceItems.map(i => i.cpt_code)).size,
      averagePrice: 0,
      priceRanges: new Map<string, { min: number; max: number; avg: number }>(),
      missingPrices: 0
    };

    const cptPrices = new Map<string, number[]>();

    invoiceItems.forEach(item => {
      if (!item.unit_price || item.unit_price === 0) {
        analytics.missingPrices++;
      } else {
        if (!cptPrices.has(item.cpt_code)) {
          cptPrices.set(item.cpt_code, []);
        }
        cptPrices.get(item.cpt_code)!.push(Number(item.unit_price));
      }
    });

    // Calculate statistics
    cptPrices.forEach((prices, cpt) => {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      analytics.priceRanges.set(cpt, { min, max, avg });
    });

    const allPrices = Array.from(cptPrices.values()).flat();
    analytics.averagePrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;

    return analytics;
  }

  // Cache management
  private getCached(key: string): PriceResult | null {
    this.cleanCache();
    const cached = this.cache.get(key);
    return cached || null;
  }

  private setCache(key: string, value: PriceResult) {
    this.cache.set(key, value);
  }

  private clearClinicCache(clinicId: string) {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(clinicId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private cleanCache() {
    if (Date.now() - this.lastCacheClean > this.cacheExpiry) {
      this.cache.clear();
      this.lastCacheClean = Date.now();
    }
  }
}

export default DynamicPricingService;