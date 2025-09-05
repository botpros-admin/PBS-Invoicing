/**
 * Invoice Service V2 - Laboratory Migration Version
 * 
 * This service handles all invoice-related operations using the new _lab_mig tables.
 * Supports laboratory hierarchy, accession numbers, and bulk operations.
 * 
 * Key differences from V1:
 * - Uses _lab_mig tables instead of original tables
 * - Supports accession_number for invoice line items
 * - Handles laboratory/clinic hierarchy
 * - Optimized for 10,000+ line items per invoice
 */

import { apiRequest, delay, supabase, handleSupabaseError } from '../client';
import { 
  Invoice, 
  InvoiceItem, 
  InvoiceStatus, 
  FilterOptions, 
  PaginatedResponse,
  ID,
  Patient,
  Client,
  Clinic
} from '../../types';
import { 
  CompatInvoice, 
  CompatInvoiceItem, 
  convertToInvoice, 
  convertToInvoiceItem 
} from '../../types/compatibility';

/**
 * Extended InvoiceItem interface for laboratory features
 */
export interface LabInvoiceItem extends InvoiceItem {
  accessionNumber: string;
  patientName: string;
  units?: number;
  disputeId?: string;
  disputeReason?: string;
}

/**
 * Helper function to calculate invoice total from items
 */
function calculateInvoiceTotal(items: any[]): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((sum, item) => {
    const itemTotal = item.total_price ?? (item.units * item.unit_price) ?? 0;
    return sum + itemTotal;
  }, 0);
}

/**
 * Helper function to calculate invoice balance
 */
function calculateInvoiceBalance(total: number, paidAmount: number): number {
  return (total ?? 0) - (paidAmount ?? 0);
}

/**
 * Fetch a paginated list of invoices using new laboratory tables
 * 
 * @param filters - Filter, sort and pagination options
 * @returns Paginated invoice list
 */
export async function getInvoices(filters?: FilterOptions): Promise<PaginatedResponse<Invoice>> {
  try {
    // Initialize query with new table structure
    let query = supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        items:invoice_line_items_lab_mig(*)
      `, { count: 'exact' });
    
    // Apply filters
    if (filters?.search) {
      const search = `%${filters.search}%`;
      query = query.or(`invoice_number.ilike.${search},client.name.ilike.${search}`); 
    }
    
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    
    // Apply sorting
    const orderColumn = filters?.sortBy === 'number' ? 'invoice_number' :
                       filters?.sortBy === 'date' ? 'created_at' :
                       filters?.sortBy === 'amount' ? 'total_amount' :
                       filters?.sortBy === 'client' ? 'client_id' :
                       'created_at';
    
    query = query.order(orderColumn, { ascending: filters?.sortOrder === 'asc' });
    
    // Apply pagination
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    // Transform the data to match frontend types
    const invoices: Invoice[] = (data || []).map((inv: any) => ({
      id: inv.id,
      clientId: inv.client_id,
      invoiceNumber: inv.invoice_number,
      date: inv.invoice_date || inv.created_at,
      dueDate: inv.due_date,
      status: (inv.status || 'draft') as InvoiceStatus,
      amount: inv.total_amount || calculateInvoiceTotal(inv.items),
      balance: calculateInvoiceBalance(
        inv.total_amount || calculateInvoiceTotal(inv.items),
        inv.paid_amount || 0
      ),
      paidAmount: inv.paid_amount || 0,
      client: inv.client ? {
        id: inv.client.id,
        name: inv.client.name,
        email: inv.client.email,
        phone: inv.client.phone,
        address: inv.client.address
      } : undefined,
      items: inv.items ? inv.items.map((item: any) => ({
        id: item.id,
        invoiceId: item.invoice_id,
        accessionNumber: item.accession_number,
        patientName: item.patient_name,
        cptCode: item.cpt_code,
        description: item.description,
        units: item.units || 1,
        unitPrice: item.unit_price,
        total: item.total_price || (item.units * item.unit_price),
        disputeId: item.dispute_id,
        disputeReason: item.dispute_reason
      })) : [],
      terms: inv.terms,
      notes: inv.notes,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at
    }));
    
    return {
      data: invoices,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize)
    };
  } catch (error) {
    handleSupabaseError(error, 'Get Invoices');
    throw error;
  }
}

/**
 * Fetch a single invoice by ID
 * 
 * @param id - Invoice ID
 * @returns Invoice with all related data
 */
export async function getInvoiceById(id: ID): Promise<Invoice> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        items:invoice_line_items_lab_mig(
          *,
          dispute:disputes_lab_mig(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error(`Invoice with ID ${id} not found`);
    
    // Transform to match frontend types
    const invoice: Invoice = {
      id: data.id,
      clientId: data.client_id,
      invoiceNumber: data.invoice_number,
      date: data.invoice_date || data.created_at,
      dueDate: data.due_date,
      status: (data.status || 'draft') as InvoiceStatus,
      amount: data.total_amount || calculateInvoiceTotal(data.items),
      balance: calculateInvoiceBalance(
        data.total_amount || calculateInvoiceTotal(data.items),
        data.paid_amount || 0
      ),
      paidAmount: data.paid_amount || 0,
      client: data.client ? {
        id: data.client.id,
        name: data.client.name,
        email: data.client.email,
        phone: data.client.phone,
        address: data.client.address
      } : undefined,
      items: data.items ? data.items.map((item: any) => ({
        id: item.id,
        invoiceId: item.invoice_id,
        accessionNumber: item.accession_number,
        patientName: item.patient_name,
        cptCode: item.cpt_code,
        description: item.description,
        units: item.units || 1,
        unitPrice: item.unit_price,
        total: item.total_price || (item.units * item.unit_price),
        disputeId: item.dispute_id,
        disputeReason: item.dispute_reason,
        dispute: item.dispute ? {
          id: item.dispute.id,
          status: item.dispute.status,
          reason: item.dispute.reason,
          resolutionNotes: item.dispute.resolution_notes,
          createdAt: item.dispute.created_at,
          resolvedAt: item.dispute.resolved_at
        } : undefined
      })) : [],
      terms: data.terms,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      sentAt: data.sent_at,
      viewedAt: data.viewed_at,
      paidAt: data.paid_at
    };
    
    return invoice;
  } catch (error) {
    handleSupabaseError(error, 'Get Invoice by ID');
    throw error;
  }
}

/**
 * Create a new invoice with laboratory support
 * 
 * @param invoiceData - Invoice data
 * @returns Created invoice
 */
export async function createInvoice(invoiceData: Partial<Invoice>): Promise<Invoice> {
  try {
    // Get current user and their laboratory context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('organization_id, current_laboratory_id')
      .eq('auth_id', user.id)
      .single();
    
    if (profileError) throw profileError;
    if (!userProfile) throw new Error('User profile not found');
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(userProfile.organization_id);
    
    // Prepare invoice data
    const insertData = {
      organization_id: userProfile.organization_id,
      invoice_number: invoiceNumber,
      client_id: invoiceData.clientId,
      invoice_date: invoiceData.date || new Date().toISOString(),
      due_date: invoiceData.dueDate,
      status: invoiceData.status || 'draft',
      total_amount: invoiceData.amount || 0,
      paid_amount: invoiceData.paidAmount || 0,
      terms: invoiceData.terms,
      notes: invoiceData.notes,
      created_by: user.id
    };
    
    const { data, error } = await supabase
      .from('invoices')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    
    // If items are provided, create them
    if (invoiceData.items && invoiceData.items.length > 0) {
      await createInvoiceItems(data.id, invoiceData.items);
    }
    
    return await getInvoiceById(data.id);
  } catch (error) {
    handleSupabaseError(error, 'Create Invoice');
    throw error;
  }
}

/**
 * Create invoice line items with accession number support
 * 
 * @param invoiceId - Invoice ID
 * @param items - Array of items to create
 */
async function createInvoiceItems(invoiceId: string, items: Partial<LabInvoiceItem>[]) {
  try {
    const insertData = items.map(item => ({
      invoice_id: invoiceId,
      accession_number: item.accessionNumber || '',
      patient_name: item.patientName || '',
      cpt_code: item.cptCode || '',
      description: item.description,
      units: item.units || 1,
      unit_price: item.unitPrice || 0,
      total_price: item.total || ((item.units || 1) * (item.unitPrice || 0))
    }));
    
    const { error } = await supabase
      .from('invoice_line_items_lab_mig')
      .insert(insertData);
    
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, 'Create Invoice Items');
    throw error;
  }
}

/**
 * Update an existing invoice
 * 
 * @param id - Invoice ID
 * @param updates - Fields to update
 * @returns Updated invoice
 */
export async function updateInvoice(id: ID, updates: Partial<Invoice>): Promise<Invoice> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.amount !== undefined) updateData.total_amount = updates.amount;
    if (updates.paidAmount !== undefined) updateData.paid_amount = updates.paidAmount;
    if (updates.terms !== undefined) updateData.terms = updates.terms;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    
    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    return await getInvoiceById(id);
  } catch (error) {
    handleSupabaseError(error, 'Update Invoice');
    throw error;
  }
}

/**
 * Bulk import invoice line items (optimized for 10,000+ items)
 * 
 * @param invoiceId - Invoice ID
 * @param items - Array of items to import
 * @param batchSize - Number of items to insert per batch
 */
export async function bulkImportInvoiceItems(
  invoiceId: string, 
  items: LabInvoiceItem[], 
  batchSize: number = 500
): Promise<{ success: boolean; imported: number; failed: number; errors: any[] }> {
  const results = {
    success: true,
    imported: 0,
    failed: 0,
    errors: [] as any[]
  };
  
  try {
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const insertData = batch.map(item => ({
        invoice_id: invoiceId,
        accession_number: item.accessionNumber,
        patient_name: item.patientName,
        cpt_code: item.cptCode,
        description: item.description,
        units: item.units || 1,
        unit_price: item.unitPrice || 0,
        total_price: item.total || ((item.units || 1) * (item.unitPrice || 0))
      }));
      
      const { error } = await supabase
        .from('invoice_line_items_lab_mig')
        .insert(insertData);
      
      if (error) {
        results.failed += batch.length;
        results.errors.push({ batch: i / batchSize, error });
        results.success = false;
      } else {
        results.imported += batch.length;
      }
      
      // Add small delay between batches to prevent rate limiting
      if (i + batchSize < items.length) {
        await delay(100);
      }
    }
    
    // Update invoice total after import
    const { data: updatedItems } = await supabase
      .from('invoice_line_items_lab_mig')
      .select('total_price')
      .eq('invoice_id', invoiceId);
    
    if (updatedItems) {
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
      
      await supabase
        .from('invoices')
        .update({ 
          total_amount: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
    }
    
  } catch (error) {
    results.success = false;
    results.errors.push({ general: error });
  }
  
  return results;
}

/**
 * Generate a unique invoice number for the organization
 * 
 * @param organizationId - Organization ID
 * @returns Generated invoice number
 */
async function generateInvoiceNumber(organizationId: string): Promise<string> {
  try {
    // Use a transaction-safe approach with advisory locks
    const { data, error } = await supabase.rpc('generate_invoice_number_v2', {
      p_organization_id: organizationId
    });
    
    if (error) {
      // Fallback to timestamp-based generation if RPC fails
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      return `INV-${timestamp}-${random}`;
    }
    
    return data || `INV-${Date.now()}`;
  } catch (error) {
    // Ultimate fallback
    return `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Delete an invoice (soft delete by changing status)
 * 
 * @param id - Invoice ID
 */
export async function deleteInvoice(id: ID): Promise<void> {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ 
        status: 'void',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, 'Delete Invoice');
    throw error;
  }
}

/**
 * Get invoice statistics for dashboard
 */
export async function getInvoiceStats(organizationId: string) {
  try {
    const { data, error } = await supabase.rpc('get_invoice_stats_v2', {
      p_organization_id: organizationId
    });
    
    if (error) throw error;
    
    return data || {
      total: 0,
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      overdueAmount: 0
    };
  } catch (error) {
    handleSupabaseError(error, 'Get Invoice Stats');
    throw error;
  }
}

export default {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  bulkImportInvoiceItems,
  getInvoiceStats
};