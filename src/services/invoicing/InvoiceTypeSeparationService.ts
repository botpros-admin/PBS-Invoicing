import { supabase } from '../../api/supabase';

export type InvoiceType = 'SNF' | 'Invalids' | 'Hospice' | 'Regular';

export interface LineItemWithType {
  id?: string;
  accession_number: string;
  patient_name?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_dob?: string;
  patient_mrn?: string;
  cpt_code: string;
  description: string;
  service_date: string;
  units: number;
  unit_price: number;
  invoice_type: InvoiceType;
}

export interface SeparatedInvoices {
  [key: string]: {
    type: InvoiceType;
    items: LineItemWithType[];
    subtotal: number;
    invoice_id?: string;
  };
}

/**
 * Invoice Type Separation Service
 * 
 * Automatically separates line items by type (SNF, Invalids, Hospice, Regular)
 * to prevent payment delays and improve cash flow
 */
export class InvoiceTypeSeparationService {
  // CPT code ranges for automatic type detection
  private readonly typeRules = {
    SNF: {
      // Skilled Nursing Facility codes
      cptRanges: [
        { start: '99304', end: '99310' }, // Initial nursing facility care
        { start: '99315', end: '99316' }, // Discharge services
        { start: '99318', end: '99318' }, // Annual assessment
      ],
      keywords: ['nursing', 'snf', 'skilled']
    },
    Invalids: {
      // Invalid/problematic codes requiring review
      cptRanges: [
        { start: '99999', end: '99999' }, // Invalid placeholder
      ],
      keywords: ['invalid', 'review', 'pending', 'unknown']
    },
    Hospice: {
      // Hospice care codes
      cptRanges: [
        { start: '99377', end: '99378' }, // Hospice care supervision
        { start: 'G0182', end: 'G0182' }, // Hospice supervision
      ],
      keywords: ['hospice', 'palliative', 'end-of-life']
    }
  };

  constructor(private organizationId: string) {}

  /**
   * Determine invoice type based on CPT code and description
   */
  determineInvoiceType(cptCode: string, description?: string): InvoiceType {
    const desc = (description || '').toLowerCase();
    
    // Check keywords first
    for (const [type, rules] of Object.entries(this.typeRules)) {
      if (rules.keywords.some(keyword => desc.includes(keyword))) {
        return type as InvoiceType;
      }
    }

    // Check CPT ranges
    for (const [type, rules] of Object.entries(this.typeRules)) {
      for (const range of rules.cptRanges) {
        if (cptCode >= range.start && cptCode <= range.end) {
          return type as InvoiceType;
        }
      }
    }

    // Check for invalid/problematic codes
    if (!cptCode || cptCode === '00000' || cptCode.includes('?')) {
      return 'Invalids';
    }

    // Default to Regular
    return 'Regular';
  }

  /**
   * Separate line items by invoice type
   */
  separateLineItems(items: LineItemWithType[]): SeparatedInvoices {
    const separated: SeparatedInvoices = {};

    for (const item of items) {
      // Determine type if not already set
      if (!item.invoice_type) {
        item.invoice_type = this.determineInvoiceType(item.cpt_code, item.description);
      }

      const type = item.invoice_type;
      
      if (!separated[type]) {
        separated[type] = {
          type,
          items: [],
          subtotal: 0
        };
      }

      separated[type].items.push(item);
      separated[type].subtotal += (item.units * item.unit_price);
    }

    return separated;
  }

  /**
   * Create separate invoices for each type
   */
  async createSeparatedInvoices(
    clientId: string,
    items: LineItemWithType[],
    billingPeriod: { start: Date; end: Date },
    metadata?: any
  ): Promise<SeparatedInvoices> {
    const separated = this.separateLineItems(items);
    const createdInvoices: SeparatedInvoices = {};
    const baseInvoiceNumber = await this.generateBaseInvoiceNumber();

    for (const [type, group] of Object.entries(separated)) {
      if (group.items.length === 0) continue;

      try {
        // Create invoice for this type
        const invoiceNumber = `${baseInvoiceNumber}-${type}`;
        
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            organization_id: this.organizationId,
            client_id: clientId,
            invoice_number: invoiceNumber,
            status: type === 'Invalids' ? 'draft' : 'sent', // Invalids need review
            issue_date: new Date().toISOString(),
            due_date: this.calculateDueDate(type),
            billing_period_start: billingPeriod.start.toISOString(),
            billing_period_end: billingPeriod.end.toISOString(),
            subtotal: group.subtotal,
            total_amount: group.subtotal, // Add tax calculation if needed
            notes: `Invoice Type: ${type}`,
            metadata: {
              ...metadata,
              invoice_type: type,
              base_invoice_number: baseInvoiceNumber,
              auto_separated: true
            }
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Create line items for this invoice
        const lineItems = group.items.map(item => ({
          organization_id: this.organizationId,
          invoice_id: invoice.id,
          accession_number: item.accession_number,
          patient_first_name: item.patient_first_name,
          patient_last_name: item.patient_last_name,
          patient_dob: item.patient_dob,
          patient_mrn: item.patient_mrn,
          cpt_code: item.cpt_code,
          description: item.description,
          service_date: item.service_date,
          units: item.units,
          unit_price: item.unit_price,
          line_total: item.units * item.unit_price,
          invoice_type: type
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(lineItems);

        if (itemsError) throw itemsError;

        createdInvoices[type] = {
          ...group,
          invoice_id: invoice.id
        };

        // Log the separation
        await this.logSeparation(invoice.id, type, group.items.length);

      } catch (error) {
        console.error(`Failed to create ${type} invoice:`, error);
        // Continue with other types even if one fails
      }
    }

    return createdInvoices;
  }

  /**
   * Split an existing mixed invoice into separate type-based invoices
   */
  async splitExistingInvoice(invoiceId: string): Promise<SeparatedInvoices> {
    // Get the original invoice
    const { data: originalInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !originalInvoice) {
      throw new Error('Invoice not found');
    }

    // Get line items
    const items: LineItemWithType[] = originalInvoice.invoice_items.map(item => ({
      ...item,
      invoice_type: item.invoice_type || this.determineInvoiceType(item.cpt_code, item.description)
    }));

    // Separate by type
    const separated = this.separateLineItems(items);

    // If only one type, no need to split
    if (Object.keys(separated).length <= 1) {
      return separated;
    }

    // Create new invoices for each type
    const createdInvoices = await this.createSeparatedInvoices(
      originalInvoice.client_id,
      items,
      {
        start: new Date(originalInvoice.billing_period_start),
        end: new Date(originalInvoice.billing_period_end)
      },
      {
        ...originalInvoice.metadata,
        split_from: invoiceId,
        split_date: new Date().toISOString()
      }
    );

    // Mark original invoice as superseded
    await supabase
      .from('invoices')
      .update({
        status: 'cancelled',
        notes: `Split into separate invoices by type: ${Object.keys(createdInvoices).join(', ')}`,
        metadata: {
          ...originalInvoice.metadata,
          split_into: Object.values(createdInvoices).map(i => i.invoice_id),
          split_date: new Date().toISOString()
        }
      })
      .eq('id', invoiceId);

    return createdInvoices;
  }

  /**
   * Analyze invoice mix to recommend separation
   */
  async analyzeInvoiceMix(invoiceId: string): Promise<{
    recommendation: 'keep' | 'split';
    reason: string;
    typeBreakdown: { [key: string]: number };
    potentialDelayRisk: 'low' | 'medium' | 'high';
  }> {
    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('cpt_code, description, unit_price, units')
      .eq('invoice_id', invoiceId);

    if (error || !items) {
      throw new Error('Failed to analyze invoice');
    }

    // Count items by type
    const typeBreakdown: { [key: string]: number } = {};
    let hasInvalids = false;
    let totalValue = 0;
    let invalidsValue = 0;

    for (const item of items) {
      const type = this.determineInvoiceType(item.cpt_code, item.description);
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
      
      const itemValue = item.units * item.unit_price;
      totalValue += itemValue;
      
      if (type === 'Invalids') {
        hasInvalids = true;
        invalidsValue += itemValue;
      }
    }

    // Determine recommendation
    const typeCount = Object.keys(typeBreakdown).length;
    const invalidsPercentage = (invalidsValue / totalValue) * 100;

    let recommendation: 'keep' | 'split' = 'keep';
    let reason = '';
    let potentialDelayRisk: 'low' | 'medium' | 'high' = 'low';

    if (typeCount === 1) {
      recommendation = 'keep';
      reason = 'Invoice contains only one type - no separation needed';
      potentialDelayRisk = 'low';
    } else if (hasInvalids && invalidsPercentage > 10) {
      recommendation = 'split';
      reason = `Invoice contains ${invalidsPercentage.toFixed(1)}% invalid items that will delay payment`;
      potentialDelayRisk = 'high';
    } else if (typeCount > 2) {
      recommendation = 'split';
      reason = 'Invoice contains multiple types that may have different payment timelines';
      potentialDelayRisk = 'medium';
    } else {
      recommendation = 'keep';
      reason = 'Mixed types but low risk of payment delay';
      potentialDelayRisk = 'low';
    }

    return {
      recommendation,
      reason,
      typeBreakdown,
      potentialDelayRisk
    };
  }

  /**
   * Calculate due date based on invoice type
   */
  private calculateDueDate(type: InvoiceType): string {
    const today = new Date();
    let daysToAdd = 30; // Default Net 30

    switch (type) {
      case 'SNF':
        daysToAdd = 30; // Standard terms for SNF
        break;
      case 'Invalids':
        daysToAdd = 60; // Extra time for review and correction
        break;
      case 'Hospice':
        daysToAdd = 45; // Hospice often has different terms
        break;
      case 'Regular':
      default:
        daysToAdd = 30;
        break;
    }

    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return dueDate.toISOString();
  }

  /**
   * Generate base invoice number for related invoices
   */
  private async generateBaseInvoiceNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Get count of invoices this month
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', this.organizationId)
      .gte('created_at', `${year}-${month}-01`);

    const sequence = String((count || 0) + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  /**
   * Log invoice separation for audit trail
   */
  private async logSeparation(invoiceId: string, type: string, itemCount: number) {
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: this.organizationId,
        entity_type: 'invoice',
        entity_id: invoiceId,
        action: 'invoice_type_separation',
        details: {
          invoice_type: type,
          item_count: itemCount,
          separated_at: new Date().toISOString()
        }
      });
  }

  /**
   * Get separation statistics
   */
  async getSeparationStats(startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from('invoices')
      .select('metadata')
      .eq('organization_id', this.organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error || !data) return null;

    const stats = {
      total_invoices: data.length,
      auto_separated: 0,
      manually_split: 0,
      by_type: {
        SNF: 0,
        Invalids: 0,
        Hospice: 0,
        Regular: 0
      }
    };

    data.forEach(invoice => {
      const metadata = invoice.metadata as any;
      if (metadata?.auto_separated) stats.auto_separated++;
      if (metadata?.split_from) stats.manually_split++;
      if (metadata?.invoice_type) {
        stats.by_type[metadata.invoice_type as InvoiceType]++;
      }
    });

    return stats;
  }
}

export default InvoiceTypeSeparationService;