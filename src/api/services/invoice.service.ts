/**
 * Invoice Service
 * 
 * This service handles all invoice-related operations including CRUD operations,
 * status transitions, dispute handling, and filtering.
 * Integrated with Supabase for database operations.
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
 * Interface for dispute submission
 */
export interface DisputeRequest {
  invoiceItemId: ID;
  reason: string;
  notes?: string;
  documentIds?: ID[];
}

/**
 * Interface for dispute resolution
 */
export interface DisputeResolution {
  invoiceItemId: ID;
  resolution: 'accepted' | 'rejected' | 'partial';
  notes?: string;
  adjustmentAmount?: number;
}

/**
 * Helper function to calculate invoice total from items
 */
function calculateInvoiceTotal(items: any[]): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((sum, item) => {
    // Use line_total if available (from DB), otherwise calculate
    const itemTotal = item.line_total ?? item.total ?? (item.quantity * item.unit_price) ?? 0;
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
 * Fetch a paginated list of invoices
 * 
 * @param filters - Filter, sort and pagination options
 * @returns Paginated invoice list
 */
export async function getInvoices(filters?: FilterOptions): Promise<PaginatedResponse<Invoice>> {
  try {
    // Initialize query
    // Use explicit foreign key hint to avoid PGRST201 error
    let query = supabase
      .from('invoices')
      .select(`
        *,
        client:clients!fk_invoices_client(*),
        items:invoice_items!fk_invoice_items_invoice(*)
      `, { count: 'exact' });
    
    // Apply filters
    if (filters?.search) {
      const search = `%${filters.search}%`;
      query = query.or(`invoice_number.ilike.${search}`); 
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
    
    if (filters?.clientId && filters.clientId.length > 0) {
      query = query.in('client_id', filters.clientId);
    }
    
    // Apply sorting
    if (filters?.sortBy) {
      const direction = filters.sortDirection || 'asc';
      let column = '';
      
      // Map frontend sort fields to database columns
      switch (filters.sortBy) {
        case 'invoiceNumber':
          column = 'invoice_number';
          break;
        case 'client':
          column = 'clients.name';
          break;
        case 'dateCreated':
          column = 'created_at';
          break;
        case 'dateDue':
          column = 'date_due';
          break;
        case 'total':
          column = 'total';
          break;
        case 'balance':
          column = 'balance';
          break;
        case 'status':
          column = 'status';
          break;
        default:
          column = 'created_at';
      }
      
      query = query.order(column, { 
        ascending: direction === 'asc',
      });
    } else {
      // Default sort by created_at desc
      query = query.order('created_at', { ascending: false });
    }
    
    // Apply pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const startIndex = (page - 1) * limit;
    
    query = query.range(startIndex, startIndex + limit - 1);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) throw error;
    if (!data) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
    }
    
    // Transform to frontend Invoice type
    const invoices: Invoice[] = data.map((inv: any) => {
      // Calculate total from items if not present or is null
      // Use total_amount if available (newer schema), otherwise total
      const calculatedTotal = inv.total_amount ?? inv.total ?? calculateInvoiceTotal(inv.items || []);
      const paidAmount = inv.paid_amount ?? inv.amount_paid ?? 0;
      const calculatedBalance = inv.balance_due ?? inv.balance ?? calculateInvoiceBalance(calculatedTotal, paidAmount);
      
      const invoice: Invoice = {
        id: inv.id ? inv.id.toString() : '',
        clientId: inv.client_id ? inv.client_id.toString() : '',
        clinicId: inv.clinic_id ? inv.clinic_id.toString() : '',
        invoiceNumber: inv.invoice_number,
        dateCreated: inv.created_at,
        dateDue: inv.date_due,
        status: inv.status,
        invoiceType: inv.invoice_type,
        reasonType: inv.reason_type,
        icn: inv.icn,
        notes: inv.notes,
        subtotal: inv.subtotal ?? calculatedTotal,
        total: calculatedTotal,
        amountPaid: paidAmount,
        balance: calculatedBalance,
        writeOffAmount: inv.write_off_amount,
        writeOffReason: inv.write_off_reason,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
        
        client: inv.client ? {
          id: inv.client.id ? inv.client.id.toString() : '',
          name: inv.client.name,
          address: inv.client.address || '',
          organizationId: inv.client.organization_id?.toString() || '',
          createdAt: inv.client.created_at || '',
          updatedAt: inv.client.updated_at || '',
          clinics: [],
          invoiceParameters: undefined
        } : undefined,
        
        clinic: inv.clinic ? {
          id: inv.clinic.id ? inv.clinic.id.toString() : '',
          name: inv.clinic.name,
          address: inv.clinic.address || '',
          clientId: inv.clinic.client_id ? inv.clinic.client_id.toString() : '',
          isActive: inv.clinic.is_active === true,
          createdAt: inv.clinic.created_at || '',
          updatedAt: inv.clinic.updated_at || '',
          contacts: []
        } : undefined,
        
        items: inv.items ? inv.items.map((item: any) => ({
          id: item.id ? item.id.toString() : '',
          invoiceId: item.invoice_id ? item.invoice_id.toString() : '',
          patientId: item.patient_id ? item.patient_id.toString() : '',
          accessionNumber: item.accession_number,
          cptCodeId: item.cpt_code_id ? item.cpt_code_id.toString() : '',
          cptCode: item.cpt_code || '',
          description: item.description,
          descriptionOverride: item.description_override,
          dateOfService: item.date_of_service,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.total,
          isDisputed: item.is_disputed,
          disputeReason: item.dispute_reason,
          disputeResolvedAt: item.dispute_resolved_at,
          disputeResolutionNotes: item.dispute_resolution_notes,
          medicalNecessityProvided: item.medical_necessity_provided,
          medicalNecessityDocumentPath: item.medical_necessity_document_path,
          createdAt: item.created_at || '',
          updatedAt: item.updated_at || ''
        })) : []
      };
      
      return invoice;
    });
    
    return {
      data: invoices,
      total: count || invoices.length,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 1
    };
  } catch (error) {
    handleSupabaseError(error, 'Fetch Invoices');
    throw error;
  }
}

/**
 * Get a single invoice by ID
 * 
 * @param id - Invoice ID
 * @returns The invoice with the specified ID
 */
export async function getInvoiceById(id: ID): Promise<Invoice> {
  try {
    // Get invoice with related data
    // Use explicit foreign key hint to avoid PGRST201 error
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients!fk_invoices_client(*),
        items:invoice_items!fk_invoice_items_invoice(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error(`Invoice with ID ${id} not found`);
    
    // Calculate total from items if not present or is null
    // Use total_amount if available (newer schema), otherwise total
    const calculatedTotal = data.total_amount ?? data.total ?? calculateInvoiceTotal(data.items || []);
    const paidAmount = data.paid_amount ?? data.amount_paid ?? 0;
    const calculatedBalance = data.balance_due ?? data.balance ?? calculateInvoiceBalance(calculatedTotal, paidAmount);
    
    const invoice: Invoice = {
      id: data.id.toString(),
      clientId: data.client_id ? data.client_id.toString() : '',
      clinicId: data.clinic_id ? data.clinic_id.toString() : '',
      invoiceNumber: data.invoice_number,
      dateCreated: data.created_at,
      dateDue: data.date_due,
      status: data.status,
      invoiceType: data.invoice_type,
      reasonType: data.reason_type,
      icn: data.icn,
      notes: data.notes,
      subtotal: data.subtotal ?? calculatedTotal,
      total: calculatedTotal,
      amountPaid: paidAmount,
      balance: calculatedBalance,
      writeOffAmount: data.write_off_amount,
      writeOffReason: data.write_off_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      
      client: data.client ? {
        id: data.client.id.toString(),
        name: data.client.name,
        address: data.client.address || '',
        organizationId: data.client.organization_id?.toString() || '',
        createdAt: data.client.created_at || '',
        updatedAt: data.client.updated_at || '',
        clinics: [],
        invoiceParameters: undefined
      } : undefined,
      
      clinic: data.clinic ? {
        id: data.clinic.id.toString(),
        name: data.clinic.name,
        address: data.clinic.address || '',
        clientId: data.clinic.client_id ? data.clinic.client_id.toString() : '',
        isActive: data.clinic.is_active === true,
        createdAt: data.clinic.created_at || '',
        updatedAt: data.clinic.updated_at || '',
        contacts: []
      } : undefined,
      
      items: data.items ? data.items.map((item: any) => ({
        id: item.id.toString(),
        invoiceId: item.invoice_id.toString(),
        patientId: item.patient_id ? item.patient_id.toString() : '',
        accessionNumber: item.accession_number,
        cptCodeId: item.cpt_code_id ? item.cpt_code_id.toString() : '',
        cptCode: item.cpt_code || '',
        description: item.description,
        descriptionOverride: item.description_override,
        dateOfService: item.date_of_service,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
        isDisputed: item.is_disputed,
        disputeReason: item.dispute_reason,
        disputeResolvedAt: item.dispute_resolved_at,
        disputeResolutionNotes: item.dispute_resolution_notes,
        medicalNecessityProvided: item.medical_necessity_provided,
        medicalNecessityDocumentPath: item.medical_necessity_document_path,
        createdAt: item.created_at || '',
        updatedAt: item.updated_at || '',
        patient: item.patient ? {
          id: item.patient.id.toString(),
          first_name: item.patient.first_name,
          last_name: item.patient.last_name,
        } : {
          id: 'unknown',
          first_name: 'Unknown',
          last_name: 'Patient',
        }
      })) : []
    };
    
    return invoice;
  } catch (error) {
    handleSupabaseError(error, 'Get Invoice by ID');
    throw error;
  }
}

/**
 * Create a new invoice
 * 
 * @param invoiceData - New invoice data
 * @returns The created invoice
 */
export async function createInvoice(invoiceData: Partial<Invoice>): Promise<Invoice> {
  try {
    // Get current user's laboratory_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Get user's laboratory_id from user_profiles or auth metadata
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) throw profileError;
    if (!userProfile?.organization_id) throw new Error('User organization not found');
    
    // Get laboratory_id from organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, laboratory_id')
      .eq('id', userProfile.organization_id)
      .single();
    
    if (orgError) throw orgError;
    if (!org?.laboratory_id) throw new Error('Organization laboratory not found');
    
    const today = new Date().toISOString().split('T')[0];
    const dueDate = invoiceData.dateDue || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Don't set invoice_number - let the database trigger generate it
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: userProfile.organization_id, // Required for RLS
        client_id: invoiceData.clientId ? parseInt(invoiceData.clientId.toString()) : null,
        clinic_id: invoiceData.clinicId ? parseInt(invoiceData.clinicId.toString()) : null,
        // invoice_number will be auto-generated by trigger
        created_at: invoiceData.dateCreated || today,
        date_due: dueDate,
        status: 'draft',
        invoice_type: invoiceData.invoiceType,
        reason_type: invoiceData.reasonType,
        notes: invoiceData.notes,
        subtotal: 0,
        total: 0,
        amount_paid: 0,
        balance: 0
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return await getInvoiceById(data.id);
  } catch (error) {
    handleSupabaseError(error, 'Create Invoice');
    throw error;
  }
}

/**
 * Update an existing invoice
 * 
 * @param id - Invoice ID
 * @param invoiceData - Updated invoice data
 * @returns The updated invoice
 */
export async function updateInvoice(id: ID, invoiceData: Partial<Invoice>): Promise<Invoice> {
  try {
    // First check if invoice is editable (only draft status can be edited)
    const currentInvoice = await getInvoiceById(id);
    
    // Only allow full edits for draft invoices
    if (currentInvoice.status !== 'draft' && !invoiceData.forceEdit) {
      // Only allow status updates and payment-related fields for non-draft invoices
      const allowedFields = ['status', 'amountPaid', 'balance', 'writeOffAmount', 'writeOffReason'];
      const attemptedFields = Object.keys(invoiceData);
      const invalidFields = attemptedFields.filter(field => !allowedFields.includes(field) && field !== 'forceEdit');
      
      if (invalidFields.length > 0) {
        throw new Error(`Cannot edit ${invalidFields.join(', ')} on a ${currentInvoice.status} invoice. Invoice must be in draft status.`);
      }
    }
    
    const updateData: any = {};
    
    if (invoiceData.clientId !== undefined) updateData.client_id = parseInt(invoiceData.clientId.toString());
    if (invoiceData.clinicId !== undefined) updateData.clinic_id = parseInt(invoiceData.clinicId.toString());
    if (invoiceData.invoiceNumber !== undefined) updateData.invoice_number = invoiceData.invoiceNumber;
    if (invoiceData.dateCreated !== undefined) updateData.created_at = invoiceData.dateCreated;
    if (invoiceData.dateDue !== undefined) updateData.date_due = invoiceData.dateDue;
    if (invoiceData.status !== undefined) updateData.status = invoiceData.status;
    if (invoiceData.invoiceType !== undefined) updateData.invoice_type = invoiceData.invoiceType;
    if (invoiceData.reasonType !== undefined) updateData.reason_type = invoiceData.reasonType;
    if (invoiceData.notes !== undefined) updateData.notes = invoiceData.notes;
    if (invoiceData.subtotal !== undefined) updateData.subtotal = invoiceData.subtotal;
    if (invoiceData.total !== undefined) updateData.total = invoiceData.total;
    if (invoiceData.amountPaid !== undefined) updateData.amount_paid = invoiceData.amountPaid;
    if (invoiceData.balance !== undefined) updateData.balance = invoiceData.balance;
    if (invoiceData.writeOffAmount !== undefined) updateData.write_off_amount = invoiceData.writeOffAmount;
    if (invoiceData.writeOffReason !== undefined) updateData.write_off_reason = invoiceData.writeOffReason;
    
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
 * Update invoice status with validation
 * Handles transitions like draft -> sent -> paid
 * 
 * @param id - Invoice ID
 * @param newStatus - New status to set
 * @param options - Additional options like freezing prices
 * @returns The updated invoice
 */
export async function updateInvoiceStatus(
  id: ID, 
  newStatus: InvoiceStatus,
  options?: {
    freezePrices?: boolean;
    userId?: ID;
  }
): Promise<Invoice> {
  try {
    const currentInvoice = await getInvoiceById(id);
    
    // Define valid status transitions
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      'draft': ['sent', 'cancelled'],
      'sent': ['viewed', 'partial', 'paid', 'overdue', 'disputed', 'cancelled'],
      'viewed': ['partial', 'paid', 'overdue', 'disputed', 'cancelled'],
      'partial': ['paid', 'overdue', 'disputed', 'cancelled'],
      'paid': ['disputed'], // Can still dispute after payment
      'overdue': ['partial', 'paid', 'disputed', 'cancelled'],
      'disputed': ['sent', 'paid', 'cancelled'], // Can resolve dispute
      'cancelled': [] // Terminal state
    };
    
    // Check if transition is valid
    const allowedTransitions = validTransitions[currentInvoice.status as InvoiceStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentInvoice.status} to ${newStatus}`);
    }
    
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    
    // Add timestamps for specific transitions
    if (newStatus === 'sent' && !currentInvoice.sentAt) {
      updateData.sent_at = new Date().toISOString();
    }
    if (newStatus === 'viewed' && !currentInvoice.viewedAt) {
      updateData.viewed_at = new Date().toISOString();
    }
    if (newStatus === 'paid' && !currentInvoice.paidAt) {
      updateData.paid_at = new Date().toISOString();
    }
    
    // When moving from draft to sent, freeze the prices
    if (currentInvoice.status === 'draft' && newStatus === 'sent' && options?.freezePrices) {
      // Store frozen prices (these would be new columns we'd add to the database)
      // For now, we'll just update the main totals to "lock" them
      updateData.subtotal = currentInvoice.subtotal;
      updateData.total = currentInvoice.total;
      updateData.total_amount = currentInvoice.total;
    }
    
    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    // Log the status change to audit log if userId provided
    if (options?.userId) {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: options.userId,
          action: 'invoice_status_change',
          resource_type: 'invoice',
          resource_id: id,
          details: {
            from_status: currentInvoice.status,
            to_status: newStatus
          }
        });
    }
    
    return await getInvoiceById(id);
  } catch (error) {
    handleSupabaseError(error, 'Update Invoice Status');
    throw error;
  }
}

/**
 * Finalize an invoice (shorthand for moving from draft to sent)
 * This locks the invoice for editing and freezes prices
 * 
 * @param id - Invoice ID
 * @returns The finalized invoice
 */
export async function finalizeInvoice(id: ID): Promise<Invoice> {
  return updateInvoiceStatus(id, 'sent', { freezePrices: true });
}

/**
 * Revert an invoice to draft status (admin only)
 * 
 * @param id - Invoice ID
 * @param reason - Reason for reverting
 * @returns The updated invoice
 */
export async function revertToDraft(id: ID, reason: string): Promise<Invoice> {
  try {
    const currentInvoice = await getInvoiceById(id);
    
    // Only allow reverting if not paid or cancelled
    if (currentInvoice.status === 'paid' || currentInvoice.status === 'cancelled') {
      throw new Error(`Cannot revert a ${currentInvoice.status} invoice to draft`);
    }
    
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'draft',
        sent_at: null, // Clear sent timestamp
        viewed_at: null, // Clear viewed timestamp
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    // Log the reversion
    await supabase
      .from('audit_logs')
      .insert({
        action: 'invoice_reverted_to_draft',
        resource_type: 'invoice',
        resource_id: id,
        details: {
          from_status: currentInvoice.status,
          reason: reason
        }
      });
    
    return await getInvoiceById(id);
  } catch (error) {
    handleSupabaseError(error, 'Revert Invoice to Draft');
    throw error;
  }
}

/**
 * Get the current invoice counter status for a laboratory
 * Shows the next invoice number that will be generated
 * 
 * @param laboratoryId - Laboratory ID (optional, uses current user's lab if not provided)
 * @param year - Year for the counter (optional, uses current year if not provided)
 * @returns Counter status including next number preview
 */
export async function getInvoiceCounterStatus(
  laboratoryId?: string,
  year?: number
): Promise<{
  prefix: string;
  year: number;
  lastValue: number;
  nextValue: number;
  formatPattern: string;
  sampleNumber: string;
}> {
  try {
    let labId = laboratoryId;
    
    // If no laboratory ID provided, get from current user
    if (!labId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userProfile?.organization_id) throw new Error('User organization not found');
      
      const { data: org } = await supabase
        .from('organizations')
        .select('laboratory_id')
        .eq('id', userProfile.organization_id)
        .single();
      
      if (!org?.laboratory_id) throw new Error('Organization laboratory not found');
      labId = org.laboratory_id;
    }
    
    // Call the RPC function to get counter status
    const { data, error } = await supabase
      .rpc('get_invoice_counter_status', {
        p_laboratory_id: labId,
        p_year: year || null
      })
      .single();
    
    if (error) throw error;
    
    // If no counter exists yet, return default values
    if (!data) {
      const currentYear = new Date().getFullYear();
      return {
        prefix: 'INV',
        year: currentYear,
        lastValue: 0,
        nextValue: 1,
        formatPattern: '{prefix}-{year}-{number:06d}',
        sampleNumber: `INV-${currentYear}-000001`
      };
    }
    
    return {
      prefix: data.prefix,
      year: data.year,
      lastValue: data.last_value,
      nextValue: data.next_value,
      formatPattern: data.format_pattern,
      sampleNumber: data.sample_number
    };
  } catch (error) {
    handleSupabaseError(error, 'Get Invoice Counter Status');
    throw error;
  }
}

/**
 * Manually generate an invoice number using the server-side function
 * This is useful for preview or when creating invoices through RPC
 * 
 * @param laboratoryId - Laboratory ID
 * @param prefix - Optional custom prefix
 * @returns The generated invoice number
 */
export async function generateInvoiceNumber(
  laboratoryId: string,
  prefix?: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .rpc('get_next_invoice_number', {
        p_laboratory_id: laboratoryId,
        p_prefix: prefix || null
      });
    
    if (error) throw error;
    if (!data) throw new Error('Failed to generate invoice number');
    
    return data;
  } catch (error) {
    handleSupabaseError(error, 'Generate Invoice Number');
    throw error;
  }
}

/**
 * Reset invoice counter for a laboratory (admin only)
 * Useful for testing or fixing sequence issues
 * 
 * @param laboratoryId - Laboratory ID
 * @param year - Year to reset (optional, uses current year)
 * @param newValue - New counter value (default 0)
 */
export async function resetInvoiceCounter(
  laboratoryId: string,
  year?: number,
  newValue: number = 0
): Promise<void> {
  try {
    const { error } = await supabase
      .rpc('reset_invoice_counter', {
        p_laboratory_id: laboratoryId,
        p_year: year || null,
        p_new_value: newValue
      });
    
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, 'Reset Invoice Counter');
    throw error;
  }
}
