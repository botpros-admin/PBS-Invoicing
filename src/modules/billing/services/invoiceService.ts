import { supabase } from '../../../api/supabase';
import type { 
  Invoice, 
  InvoiceItem, 
  CreateInvoiceInput, 
  CreateInvoiceItemInput,
  Client,
  CPTCode,
  PricingRule
} from '../../../types/database';

export class InvoiceService {
  /**
   * Generate a unique invoice number
   */
  static async generateInvoiceNumber(organizationId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Get the last invoice number for this organization
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('organization_id', organizationId)
      .like('invoice_number', `INV-${year}${month}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single();

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoice_number.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Calculate pricing for an invoice item based on pricing rules
   */
  static async calculateItemPrice(
    organizationId: string,
    clientId: string,
    cptCodeId: string,
    serviceDate: string,
    quantity: number = 1
  ): Promise<{ unitPrice: number; pricingRuleId?: string }> {
    // Find applicable pricing rules
    const { data: pricingRules } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('cpt_code_id', cptCodeId)
      .eq('is_active', true)
      .or(`client_id.eq.${clientId},client_id.is.null`)
      .lte('effective_date', serviceDate)
      .or(`expiration_date.gte.${serviceDate},expiration_date.is.null`)
      .order('priority', { ascending: false })
      .order('client_id', { ascending: false, nullsFirst: false });

    if (!pricingRules || pricingRules.length === 0) {
      throw new Error('No pricing rule found for this CPT code');
    }

    // Use the highest priority rule
    const rule = pricingRules[0] as PricingRule;
    let unitPrice = rule.base_price;

    // Apply discount if applicable
    if (rule.discount_percentage > 0) {
      unitPrice = unitPrice * (1 - rule.discount_percentage / 100);
    }

    // Apply min/max constraints
    if (rule.minimum_price && unitPrice < rule.minimum_price) {
      unitPrice = rule.minimum_price;
    }
    if (rule.maximum_price && unitPrice > rule.maximum_price) {
      unitPrice = rule.maximum_price;
    }

    return {
      unitPrice: Number(unitPrice.toFixed(2)),
      pricingRuleId: rule.id
    };
  }

  /**
   * Create a new invoice with items
   */
  static async createInvoice(
    organizationId: string,
    input: CreateInvoiceInput,
    createdBy: string
  ): Promise<Invoice> {
    // Start a transaction
    const invoiceNumber = await this.generateInvoiceNumber(organizationId);
    
    // Calculate totals
    let subtotal = 0;
    const itemsWithPricing = await Promise.all(
      input.items.map(async (item) => {
        const pricing = await this.calculateItemPrice(
          organizationId,
          input.client_id,
          item.cpt_code_id,
          item.service_date,
          item.quantity
        );
        
        const lineTotal = pricing.unitPrice * item.quantity;
        subtotal += lineTotal;
        
        return {
          ...item,
          unit_price: pricing.unitPrice,
          pricing_rule_id: pricing.pricingRuleId
        };
      })
    );

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        organization_id: organizationId,
        invoice_number: invoiceNumber,
        client_id: input.client_id,
        invoice_date: input.invoice_date || new Date().toISOString().split('T')[0],
        due_date: input.due_date,
        billing_period_start: input.billing_period_start,
        billing_period_end: input.billing_period_end,
        subtotal: subtotal,
        tax_amount: 0, // TODO: Implement tax calculation
        total_amount: subtotal,
        status: 'draft',
        terms: input.terms,
        notes: input.notes,
        created_by: createdBy
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create invoice items
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(
        itemsWithPricing.map(item => ({
          organization_id: organizationId,
          invoice_id: invoice.id,
          accession_number: item.accession_number,
          cpt_code_id: item.cpt_code_id,
          description: item.description,
          service_date: item.service_date,
          quantity: item.quantity,
          unit_price: item.unit_price,
          pricing_rule_id: item.pricing_rule_id,
          notes: item.notes
        }))
      );

    if (itemsError) throw itemsError;

    return invoice;
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(
    invoiceId: string,
    status: Invoice['status']
  ): Promise<Invoice> {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    
    // Add timestamps based on status
    if (status === 'sent' && !updateData.sent_at) {
      updateData.sent_at = new Date().toISOString();
    }
    if (status === 'viewed' && !updateData.viewed_at) {
      updateData.viewed_at = new Date().toISOString();
    }
    if (status === 'paid' && !updateData.paid_at) {
      updateData.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get invoice with all related data
   */
  static async getInvoiceWithDetails(invoiceId: string): Promise<{
    invoice: Invoice;
    items: InvoiceItem[];
    client: Client;
  }> {
    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    // Get invoice items with CPT codes
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select(`
        *,
        cpt_code:cpt_codes(*)
      `)
      .eq('invoice_id', invoiceId)
      .order('service_date', { ascending: true });

    if (itemsError) throw itemsError;

    // Get client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    if (clientError) throw clientError;

    return {
      invoice,
      items,
      client
    };
  }

  /**
   * Check for duplicate invoice items (accession + CPT)
   */
  static async checkDuplicateItem(
    organizationId: string,
    accessionNumber: string,
    cptCodeId: string,
    excludeInvoiceId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('invoice_items')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('accession_number', accessionNumber)
      .eq('cpt_code_id', cptCodeId);

    if (excludeInvoiceId) {
      query = query.neq('invoice_id', excludeInvoiceId);
    }

    const { data, error } = await query.limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  }

  /**
   * Send invoice via email
   */
  static async sendInvoice(invoiceId: string): Promise<void> {
    // Get invoice details
    const invoiceData = await this.getInvoiceWithDetails(invoiceId);
    
    // Call edge function to send email
    const { error } = await supabase.functions.invoke('send-invoice-email', {
      body: {
        invoice: invoiceData.invoice,
        items: invoiceData.items,
        client: invoiceData.client
      }
    });

    if (error) throw error;

    // Update invoice status to sent
    await this.updateInvoiceStatus(invoiceId, 'sent');
  }

  /**
   * Calculate aging for outstanding invoices
   */
  static async getAgingReport(organizationId: string): Promise<{
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
  }> {
    const today = new Date();
    const days30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days60 = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const days90 = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    const { data: invoices } = await supabase
      .from('invoices')
      .select('due_date, balance_due')
      .eq('organization_id', organizationId)
      .in('status', ['sent', 'viewed', 'partial', 'overdue'])
      .gt('balance_due', 0);

    const aging = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      over90: 0
    };

    invoices?.forEach(invoice => {
      const dueDate = new Date(invoice.due_date);
      const balance = Number(invoice.balance_due);

      if (dueDate >= today) {
        aging.current += balance;
      } else if (dueDate >= days30) {
        aging.days30 += balance;
      } else if (dueDate >= days60) {
        aging.days60 += balance;
      } else if (dueDate >= days90) {
        aging.days90 += balance;
      } else {
        aging.over90 += balance;
      }
    });

    return aging;
  }
}