import { supabase } from '../../api/supabase';

export interface ParentAccountStats {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  child_count: number;
  total_outstanding: number;
  total_invoices: number;
  avg_payment_days: number;
  last_activity: string;
  address?: any;
  contact_info?: any;
  metadata?: any;
}

export interface ChildLocation {
  id: string;
  name: string;
  code: string;
  status: string;
  total_outstanding: number;
  last_invoice_date?: string;
  invoice_count: number;
  address?: any;
  contact_info?: any;
}

export interface InvoiceSummary {
  month: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  invoice_count: number;
  child_location_count: number;
}

/**
 * Service for managing parent account aggregation
 * Handles 150-300+ child locations efficiently
 */
export class ParentAccountService {
  constructor(private organizationId: string) {}

  /**
   * Get parent accounts with aggregated statistics
   */
  async getParentAccountsWithStats(
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    data: ParentAccountStats[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      // Get paginated parent accounts with stats
      const { data, error } = await supabase.rpc('get_parent_clients_with_stats', {
        org_id: this.organizationId,
        page_number: page,
        page_size: pageSize
      });

      if (error) throw error;

      // Get total count for pagination
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', this.organizationId)
        .is('parent_id', null);

      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize
      };
    } catch (error) {
      console.error('Error fetching parent accounts:', error);
      throw error;
    }
  }

  /**
   * Get child locations for a parent account
   */
  async getChildLocations(parentId: string): Promise<ChildLocation[]> {
    try {
      const { data, error } = await supabase.rpc('get_child_locations', {
        parent_id: parentId,
        org_id: this.organizationId
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching child locations:', error);
      throw error;
    }
  }

  /**
   * Get invoice summary for parent account
   */
  async getParentInvoiceSummary(
    parentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<InvoiceSummary[]> {
    try {
      const { data, error } = await supabase.rpc('get_parent_account_invoice_summary', {
        parent_id: parentId,
        org_id: this.organizationId,
        start_date: startDate?.toISOString().split('T')[0] || null,
        end_date: endDate?.toISOString().split('T')[0] || null
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching invoice summary:', error);
      throw error;
    }
  }

  /**
   * Link child locations to parent account
   */
  async linkChildToParent(childId: string, parentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ parent_id: parentId })
        .eq('id', childId)
        .eq('organization_id', this.organizationId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error linking child to parent:', error);
      return false;
    }
  }

  /**
   * Unlink child from parent account
   */
  async unlinkChildFromParent(childId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ parent_id: null })
        .eq('id', childId)
        .eq('organization_id', this.organizationId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error unlinking child from parent:', error);
      return false;
    }
  }

  /**
   * Create bulk invoices for all child locations
   */
  async createBulkInvoicesForParent(
    parentId: string,
    billingPeriod: { start: Date; end: Date },
    dueDate: Date
  ): Promise<{
    created: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      created: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Get all child locations
      const children = await this.getChildLocations(parentId);

      // Create invoices for each child
      for (const child of children) {
        try {
          // Check if invoice already exists for this period
          const { data: existing } = await supabase
            .from('invoices')
            .select('id')
            .eq('client_id', child.id)
            .eq('organization_id', this.organizationId)
            .gte('billing_period_start', billingPeriod.start.toISOString())
            .lte('billing_period_end', billingPeriod.end.toISOString())
            .single();

          if (existing) {
            results.errors.push(`Invoice already exists for ${child.name}`);
            continue;
          }

          // Create invoice
          const { error } = await supabase
            .from('invoices')
            .insert({
              organization_id: this.organizationId,
              client_id: child.id,
              invoice_number: await this.generateInvoiceNumber(child.code),
              status: 'draft',
              issue_date: new Date().toISOString(),
              due_date: dueDate.toISOString(),
              billing_period_start: billingPeriod.start.toISOString(),
              billing_period_end: billingPeriod.end.toISOString(),
              subtotal: 0,
              total_amount: 0,
              metadata: {
                parent_account_id: parentId,
                bulk_created: true,
                created_at: new Date().toISOString()
              }
            });

          if (error) throw error;

          results.created++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to create invoice for ${child.name}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error creating bulk invoices:', error);
      throw error;
    }
  }

  /**
   * Generate consolidated statement for parent account
   */
  async generateConsolidatedStatement(
    parentId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    parent: ParentAccountStats;
    children: ChildLocation[];
    invoices: any[];
    summary: {
      total_amount: number;
      paid_amount: number;
      outstanding_amount: number;
      overdue_amount: number;
    };
  }> {
    try {
      // Get parent account info
      const { data: parentData } = await supabase.rpc('get_parent_clients_with_stats', {
        org_id: this.organizationId,
        page_number: 1,
        page_size: 1
      });

      const parent = parentData?.[0];
      if (!parent) throw new Error('Parent account not found');

      // Get child locations
      const children = await this.getChildLocations(parentId);

      // Get all invoices for parent and children
      const clientIds = [parentId, ...children.map(c => c.id)];
      
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*, clients!inner(name, code)')
        .in('client_id', clientIds)
        .gte('issue_date', period.start.toISOString())
        .lte('issue_date', period.end.toISOString())
        .order('issue_date', { ascending: false });

      if (error) throw error;

      // Calculate summary
      const summary = {
        total_amount: 0,
        paid_amount: 0,
        outstanding_amount: 0,
        overdue_amount: 0
      };

      const today = new Date();
      invoices?.forEach(invoice => {
        summary.total_amount += Number(invoice.total_amount);
        
        if (invoice.status === 'paid') {
          summary.paid_amount += Number(invoice.total_amount);
        } else if (invoice.status === 'sent' || invoice.status === 'overdue') {
          summary.outstanding_amount += Number(invoice.total_amount);
          
          if (new Date(invoice.due_date) < today) {
            summary.overdue_amount += Number(invoice.total_amount);
          }
        }
      });

      return {
        parent,
        children,
        invoices: invoices || [],
        summary
      };
    } catch (error) {
      console.error('Error generating consolidated statement:', error);
      throw error;
    }
  }

  /**
   * Get payment performance metrics for parent account
   */
  async getPaymentPerformance(parentId: string): Promise<{
    avg_payment_days: number;
    on_time_payment_rate: number;
    total_paid: number;
    total_outstanding: number;
    payment_trend: 'improving' | 'stable' | 'declining';
  }> {
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*, clients!inner(parent_id)')
        .or(`client_id.eq.${parentId},clients.parent_id.eq.${parentId}`)
        .eq('organization_id', this.organizationId)
        .in('status', ['paid', 'sent', 'overdue']);

      if (!invoices || invoices.length === 0) {
        return {
          avg_payment_days: 0,
          on_time_payment_rate: 0,
          total_paid: 0,
          total_outstanding: 0,
          payment_trend: 'stable'
        };
      }

      let totalPaymentDays = 0;
      let paidCount = 0;
      let onTimeCount = 0;
      let total_paid = 0;
      let total_outstanding = 0;

      invoices.forEach(invoice => {
        if (invoice.status === 'paid' && invoice.paid_date) {
          const paymentDays = Math.floor(
            (new Date(invoice.paid_date).getTime() - new Date(invoice.issue_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          totalPaymentDays += paymentDays;
          paidCount++;
          total_paid += Number(invoice.total_amount);

          if (new Date(invoice.paid_date) <= new Date(invoice.due_date)) {
            onTimeCount++;
          }
        } else {
          total_outstanding += Number(invoice.total_amount);
        }
      });

      // Calculate trend (simplified - could be more sophisticated)
      const recentInvoices = invoices.filter(i => 
        new Date(i.issue_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      );
      const olderInvoices = invoices.filter(i => 
        new Date(i.issue_date) <= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      );

      let payment_trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentInvoices.length > 0 && olderInvoices.length > 0) {
        const recentOnTime = recentInvoices.filter(i => 
          i.status === 'paid' && i.paid_date && new Date(i.paid_date) <= new Date(i.due_date)
        ).length / recentInvoices.length;
        
        const olderOnTime = olderInvoices.filter(i => 
          i.status === 'paid' && i.paid_date && new Date(i.paid_date) <= new Date(i.due_date)
        ).length / olderInvoices.length;

        if (recentOnTime > olderOnTime + 0.1) payment_trend = 'improving';
        else if (recentOnTime < olderOnTime - 0.1) payment_trend = 'declining';
      }

      return {
        avg_payment_days: paidCount > 0 ? Math.round(totalPaymentDays / paidCount) : 0,
        on_time_payment_rate: paidCount > 0 ? (onTimeCount / paidCount) * 100 : 0,
        total_paid,
        total_outstanding,
        payment_trend
      };
    } catch (error) {
      console.error('Error getting payment performance:', error);
      throw error;
    }
  }

  private async generateInvoiceNumber(clientCode: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', this.organizationId)
      .gte('created_at', `${year}-${month}-01`);

    const sequence = String((count || 0) + 1).padStart(4, '0');
    return `${clientCode}-${year}${month}-${sequence}`;
  }
}

export default ParentAccountService;