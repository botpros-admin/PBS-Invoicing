import { supabase } from '../../api/supabase';

export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected' | 'escalated';
export type DisputePriority = 'low' | 'normal' | 'high' | 'urgent';
export type DisputeCategory = 'pricing' | 'duplicate' | 'invalid_cpt' | 'patient_info' | 'coverage' | 'other';

export interface Dispute {
  id: string;
  organization_id: string;
  invoice_id?: string;
  invoice_item_id?: string;
  client_id?: string;
  dispute_number: string;
  disputed_amount: number;
  reason_category: DisputeCategory;
  reason_details: string;
  status: DisputeStatus;
  priority: DisputePriority;
  source: string;
  resolution_type?: string;
  resolution_details?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  created_by: string;
  assigned_to?: string;
  metadata?: any;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  user_id: string;
  message: string;
  attachments?: string[];
  created_at: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export interface DisputeStats {
  total: number;
  open: number;
  in_review: number;
  resolved: number;
  rejected: number;
  total_disputed_amount: number;
  avg_resolution_time: number;
  by_category: { [key: string]: number };
  by_priority: { [key: string]: number };
}

/**
 * Service for managing dispute tickets
 */
export class DisputeService {
  constructor(private organizationId: string) {}

  /**
   * Create a new dispute ticket
   */
  async createDispute(dispute: Partial<Dispute>): Promise<Dispute> {
    const disputeNumber = await this.generateDisputeNumber();

    const { data, error } = await supabase
      .from('disputes')
      .insert({
        ...dispute,
        organization_id: this.organizationId,
        dispute_number: disputeNumber,
        status: dispute.status || 'open',
        priority: dispute.priority || 'normal',
        source: dispute.source || 'portal',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // If dispute is for an invoice item, update the item
    if (dispute.invoice_item_id) {
      await this.updateInvoiceItemDisputeStatus(dispute.invoice_item_id, true, dispute.reason_details);
    }

    // Create initial audit log
    await this.createAuditLog(data.id, 'created', `Dispute created: ${dispute.reason_details}`);

    return data;
  }

  /**
   * Get disputes with filtering and pagination
   */
  async getDisputes(params: {
    status?: DisputeStatus;
    priority?: DisputePriority;
    client_id?: string;
    assigned_to?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: Dispute[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('disputes')
      .select('*, clients!inner(name), invoices(invoice_number)', { count: 'exact' })
      .eq('organization_id', this.organizationId);

    // Apply filters
    if (params.status) query = query.eq('status', params.status);
    if (params.priority) query = query.eq('priority', params.priority);
    if (params.client_id) query = query.eq('client_id', params.client_id);
    if (params.assigned_to) query = query.eq('assigned_to', params.assigned_to);

    // Apply sorting
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize
    };
  }

  /**
   * Get single dispute with details
   */
  async getDispute(disputeId: string): Promise<Dispute> {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        clients!inner(name, code),
        invoices(invoice_number, total_amount),
        invoice_items(
          accession_number,
          cpt_code,
          description,
          unit_price,
          units,
          line_total
        ),
        created_by_user:users!created_by(name, email),
        assigned_to_user:users!assigned_to(name, email)
      `)
      .eq('id', disputeId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update dispute status
   */
  async updateDisputeStatus(
    disputeId: string,
    status: DisputeStatus,
    resolution?: string
  ): Promise<boolean> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'resolved' || status === 'rejected') {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolution_details = resolution;
    }

    const { error } = await supabase
      .from('disputes')
      .update(updateData)
      .eq('id', disputeId)
      .eq('organization_id', this.organizationId);

    if (error) throw error;

    // Update invoice item if resolved
    if (status === 'resolved' || status === 'rejected') {
      const { data: dispute } = await supabase
        .from('disputes')
        .select('invoice_item_id')
        .eq('id', disputeId)
        .single();

      if (dispute?.invoice_item_id) {
        await this.updateInvoiceItemDisputeStatus(
          dispute.invoice_item_id,
          false,
          resolution || 'Dispute resolved'
        );
      }
    }

    await this.createAuditLog(disputeId, 'status_changed', `Status changed to ${status}`);

    return true;
  }

  /**
   * Assign dispute to user
   */
  async assignDispute(disputeId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('disputes')
      .update({
        assigned_to: userId,
        status: 'in_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', disputeId)
      .eq('organization_id', this.organizationId);

    if (error) throw error;

    await this.createAuditLog(disputeId, 'assigned', `Assigned to user ${userId}`);

    return true;
  }

  /**
   * Add message to dispute
   */
  async addMessage(
    disputeId: string,
    userId: string,
    message: string,
    attachments?: string[]
  ): Promise<DisputeMessage> {
    const { data, error } = await supabase
      .from('dispute_messages')
      .insert({
        dispute_id: disputeId,
        user_id: userId,
        message,
        attachments,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Update dispute's updated_at
    await supabase
      .from('disputes')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', disputeId);

    return data;
  }

  /**
   * Get messages for dispute
   */
  async getMessages(disputeId: string): Promise<DisputeMessage[]> {
    const { data, error } = await supabase
      .from('dispute_messages')
      .select(`
        *,
        user:users!inner(name, email, role)
      `)
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Bulk create disputes from import failures
   */
  async createBulkDisputes(
    invoiceItemIds: string[],
    category: DisputeCategory,
    reason: string
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

    for (const itemId of invoiceItemIds) {
      try {
        // Get invoice item details
        const { data: item } = await supabase
          .from('invoice_items')
          .select('invoice_id, line_total, accession_number, cpt_code')
          .eq('id', itemId)
          .single();

        if (!item) {
          results.errors.push(`Item ${itemId} not found`);
          results.failed++;
          continue;
        }

        // Get invoice details
        const { data: invoice } = await supabase
          .from('invoices')
          .select('client_id')
          .eq('id', item.invoice_id)
          .single();

        await this.createDispute({
          invoice_id: item.invoice_id,
          invoice_item_id: itemId,
          client_id: invoice?.client_id,
          disputed_amount: item.line_total,
          reason_category: category,
          reason_details: `${reason} - Accession: ${item.accession_number}, CPT: ${item.cpt_code}`,
          priority: 'normal'
        });

        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to create dispute for item ${itemId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Get dispute statistics
   */
  async getDisputeStats(startDate?: Date, endDate?: Date): Promise<DisputeStats> {
    let query = supabase
      .from('disputes')
      .select('*')
      .eq('organization_id', this.organizationId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const disputes = data || [];
    
    const stats: DisputeStats = {
      total: disputes.length,
      open: 0,
      in_review: 0,
      resolved: 0,
      rejected: 0,
      total_disputed_amount: 0,
      avg_resolution_time: 0,
      by_category: {},
      by_priority: {}
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    disputes.forEach(dispute => {
      // Status counts
      switch (dispute.status) {
        case 'open':
          stats.open++;
          break;
        case 'in_review':
          stats.in_review++;
          break;
        case 'resolved':
          stats.resolved++;
          break;
        case 'rejected':
          stats.rejected++;
          break;
      }

      // Total disputed amount
      stats.total_disputed_amount += Number(dispute.disputed_amount || 0);

      // Category counts
      const category = dispute.reason_category || 'other';
      stats.by_category[category] = (stats.by_category[category] || 0) + 1;

      // Priority counts
      const priority = dispute.priority || 'normal';
      stats.by_priority[priority] = (stats.by_priority[priority] || 0) + 1;

      // Resolution time
      if (dispute.resolved_at && dispute.created_at) {
        const resolutionTime = new Date(dispute.resolved_at).getTime() - new Date(dispute.created_at).getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    // Calculate average resolution time in days
    if (resolvedCount > 0) {
      stats.avg_resolution_time = Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24));
    }

    return stats;
  }

  /**
   * Generate dispute number
   */
  private async generateDisputeNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const { count } = await supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', this.organizationId)
      .gte('created_at', `${year}-${month}-01`);

    const sequence = String((count || 0) + 1).padStart(4, '0');
    return `DSP-${year}${month}-${sequence}`;
  }

  /**
   * Update invoice item dispute status
   */
  private async updateInvoiceItemDisputeStatus(
    itemId: string,
    isDisputed: boolean,
    reason: string
  ): Promise<void> {
    const updateData: any = {
      is_disputed: isDisputed,
      dispute_reason: isDisputed ? reason : null,
      dispute_date: isDisputed ? new Date().toISOString() : null
    };

    if (!isDisputed) {
      updateData.dispute_resolved_date = new Date().toISOString();
      updateData.dispute_resolution = reason;
    }

    await supabase
      .from('invoice_items')
      .update(updateData)
      .eq('id', itemId);
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    disputeId: string,
    action: string,
    details: string
  ): Promise<void> {
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: this.organizationId,
        entity_type: 'dispute',
        entity_id: disputeId,
        action,
        details: { message: details },
        created_at: new Date().toISOString()
      });
  }
}

export default DisputeService;