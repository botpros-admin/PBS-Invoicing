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
 * Fetch a paginated list of invoices
 * 
 * @param filters - Filter, sort and pagination options
 * @returns Paginated invoice list
 */
export async function getInvoices(filters?: FilterOptions): Promise<PaginatedResponse<Invoice>> {
  try {
    // Initialize query
    let query = supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        clinic:clinics(*),
        patient:patients(*),
        items:invoice_items(*)
      `, { count: 'exact' });
    
    // Apply filters
    if (filters?.search) {
      const search = `%${filters.search}%`;
      // Assuming 'name' exists on patients table for search, adjust if needed
      query = query.or(`invoice_number.ilike.${search},clients.name.ilike.${search},patients.first_name.ilike.${search},patients.last_name.ilike.${search}`); 
    }
    
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    
    if (filters?.dateFrom) {
      query = query.gte('date_created', filters.dateFrom);
    }
    
    if (filters?.dateTo) {
      query = query.lte('date_created', filters.dateTo);
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
          column = 'clients.name'; // Adjust if client name isn't directly sortable this way
          break;
        case 'dateCreated':
          column = 'date_created';
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
          column = 'date_created';
      }
      
      query = query.order(column, { 
        ascending: direction === 'asc',
        // Add nulls handling if necessary, e.g., nullsFirst: true 
        // foreignTable: filters.sortBy === 'client' ? 'clients' : undefined // Specify foreign table if needed
      });
    } else {
      // Default sort by date_created desc
      query = query.order('date_created', { ascending: false });
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
        // Handle case where data is null (e.g., RLS prevents access)
        return { data: [], total: 0, page, limit, totalPages: 0 };
    }
    
    // Transform to frontend Invoice type
    const invoices: Invoice[] = data.map((inv: any) => {
      // Create a properly typed converted object with all required fields
      const invoice: Invoice = {
        id: inv.id.toString(),
        clientId: inv.client_id.toString(),
        clinicId: inv.clinic_id.toString(),
        patientId: inv.patient_id.toString(),
        invoiceNumber: inv.invoice_number,
        dateCreated: inv.date_created,
        dateDue: inv.date_due,
        status: inv.status,
        invoiceType: inv.invoice_type,
        reasonType: inv.reason_type,
        icn: inv.icn,
        notes: inv.notes,
        subtotal: inv.subtotal,
        total: inv.total,
        amountPaid: inv.amount_paid,
        balance: inv.balance,
        writeOffAmount: inv.write_off_amount,
        writeOffReason: inv.write_off_reason,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
        
        // Convert related objects with all required fields
        client: inv.client ? {
          id: inv.client.id.toString(),
          name: inv.client.name,
          address: inv.client.address || '',
          organizationId: inv.client.organization_id?.toString() || '',
          createdAt: inv.client.created_at || '',
          updatedAt: inv.client.updated_at || '',
          clinics: [],
          invoiceParameters: undefined
        } : undefined,
        
        clinic: inv.clinic ? {
          id: inv.clinic.id.toString(),
          name: inv.clinic.name,
          address: inv.clinic.address || '',
          clientId: inv.clinic.client_id.toString(),
          isActive: inv.clinic.is_active === true,
          createdAt: inv.clinic.created_at || '',
          updatedAt: inv.clinic.updated_at || '',
          contacts: []
        } : undefined,
        
        patient: inv.patient ? {
          id: inv.patient.id.toString(),
          clientId: inv.patient.client_id.toString(),
          first_name: inv.patient.first_name || '',
          last_name: inv.patient.last_name || '',
          dob: inv.patient.dob,
          sex: inv.patient.sex,
          mrn: inv.patient.mrn,
          accessionNumber: inv.patient.accession_number,
          createdAt: inv.patient.created_at || '',
          updatedAt: inv.patient.updated_at || ''
        } : undefined,
        
        items: inv.items ? inv.items.map((item: any) => ({
          id: item.id.toString(),
          invoiceId: item.invoice_id.toString(),
          cptCodeId: item.cpt_code_id.toString(),
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
    throw error; // Re-throw after handling
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
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        clinic:clinics(*),
        patient:patients(*),
        items:invoice_items(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error(`Invoice with ID ${id} not found`);
    
    // Transform to frontend Invoice type (ensure all fields match)
    const invoice: Invoice = {
      id: data.id.toString(),
      clientId: data.client_id.toString(),
      clinicId: data.clinic_id.toString(),
      patientId: data.patient_id.toString(),
      invoiceNumber: data.invoice_number,
      dateCreated: data.date_created,
      dateDue: data.date_due,
      status: data.status,
      invoiceType: data.invoice_type,
      reasonType: data.reason_type,
      icn: data.icn,
      notes: data.notes,
      subtotal: data.subtotal,
      total: data.total,
      amountPaid: data.amount_paid,
      balance: data.balance,
      writeOffAmount: data.write_off_amount,
      writeOffReason: data.write_off_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      
      // Convert related objects with all required fields
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
        clientId: data.clinic.client_id.toString(),
        isActive: data.clinic.is_active === true,
        createdAt: data.clinic.created_at || '',
        updatedAt: data.clinic.updated_at || '',
        contacts: []
      } : undefined,
      
      patient: data.patient ? {
        id: data.patient.id.toString(),
        clientId: data.patient.client_id.toString(),
        first_name: data.patient.first_name || '',
        last_name: data.patient.last_name || '',
        dob: data.patient.dob,
        sex: data.patient.sex,
        mrn: data.patient.mrn,
        accessionNumber: data.patient.accession_number,
        createdAt: data.patient.created_at || '',
        updatedAt: data.patient.updated_at || ''
      } : undefined,
      
      items: data.items ? data.items.map((item: any) => ({
        id: item.id.toString(),
        invoiceId: item.invoice_id.toString(),
        cptCodeId: item.cpt_code_id.toString(),
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
  } catch (error) {
    handleSupabaseError(error, 'Get Invoice by ID');
    throw error; // Re-throw after handling
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
    // Generate a new invoice number
    const invoiceNumber = `INV-${Date.now().toString().substring(7)}`;
    const today = new Date().toISOString().split('T')[0];
    const dueDate = invoiceData.dateDue || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Insert the invoice into the database
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        client_id: invoiceData.clientId ? parseInt(invoiceData.clientId.toString()) : null,
        clinic_id: invoiceData.clinicId ? parseInt(invoiceData.clinicId.toString()) : null,
        patient_id: invoiceData.patientId ? parseInt(invoiceData.patientId.toString()) : null,
        invoice_number: invoiceNumber,
        date_created: invoiceData.dateCreated || today,
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
    
    // Fetch the created invoice with related data
    return await getInvoiceById(data.id);
  } catch (error) {
    handleSupabaseError(error, 'Create Invoice');
    throw error; // Re-throw after handling
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
    // Prepare update data
    const updateData: any = {};
    
    // Map invoice data to database fields
    if (invoiceData.clientId !== undefined) updateData.client_id = parseInt(invoiceData.clientId.toString());
    if (invoiceData.clinicId !== undefined) updateData.clinic_id = parseInt(invoiceData.clinicId.toString());
    if (invoiceData.patientId !== undefined) updateData.patient_id = parseInt(invoiceData.patientId.toString());
    if (invoiceData.invoiceNumber !== undefined) updateData.invoice_number = invoiceData.invoiceNumber;
    if (invoiceData.dateCreated !== undefined) updateData.date_created = invoiceData.dateCreated;
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
    
    // Update the invoice
    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    // Return the updated invoice
    return await getInvoiceById(id);
  } catch (error) {
    handleSupabaseError(error, 'Update Invoice');
    throw error; // Re-throw after handling
  }
}

/**
 * Delete an invoice
 * 
 * @param id - Invoice ID
 * @returns Success message
 */
export async function deleteInvoice(id: ID): Promise<{ message: string }> {
  try {
    // Delete the invoice from the database
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { message: `Invoice ${id} deleted successfully` };
  } catch (error) {
    handleSupabaseError(error, `Delete Invoice ${id}`);
    throw error; // Re-throw after handling
  }
}

/**
 * Add an item to an invoice
 * 
 * @param invoiceId - Invoice ID
 * @param itemData - New invoice item data
 * @returns The updated invoice with the new item
 */
export async function addInvoiceItem(invoiceId: ID, itemData: Partial<InvoiceItem>): Promise<Invoice> {
  try {
    // Insert the new item into the database
    const { data: newItemData, error: itemError } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoiceId,
        cpt_code_id: itemData.cptCodeId ? parseInt(itemData.cptCodeId.toString()) : null,
        description: itemData.description,
        date_of_service: itemData.dateOfService,
        quantity: itemData.quantity,
        unit_price: itemData.unitPrice,
        total: itemData.total,
        is_disputed: itemData.isDisputed,
        medical_necessity_provided: itemData.medicalNecessityProvided
      })
      .select()
      .single();

    if (itemError) throw itemError;

    // TODO: Recalculate invoice totals after adding item (potentially via a trigger or another API call)
    
    // Fetch and return the updated invoice
    return await getInvoiceById(invoiceId);
  } catch (error) {
    handleSupabaseError(error, 'Add Invoice Item');
    throw error; // Re-throw after handling
  }
}

/**
 * Update an invoice item
 * 
 * @param invoiceId - Invoice ID
 * @param itemId - Item ID
 * @param itemData - Updated item data
 * @returns The updated invoice
 */
export async function updateInvoiceItem(invoiceId: ID, itemId: ID, itemData: Partial<InvoiceItem>): Promise<Invoice> {
  try {
    // Prepare update data for the item
    const updateData: any = {};
    if (itemData.cptCodeId !== undefined) updateData.cpt_code_id = parseInt(itemData.cptCodeId.toString());
    // if (itemData.cptCode !== undefined) updateData.cpt_code = itemData.cptCode; // Removed as per schema
    if (itemData.description !== undefined) updateData.description = itemData.description;
    if (itemData.dateOfService !== undefined) updateData.date_of_service = itemData.dateOfService;
    if (itemData.quantity !== undefined) updateData.quantity = itemData.quantity;
    if (itemData.unitPrice !== undefined) updateData.unit_price = itemData.unitPrice;
    if (itemData.total !== undefined) updateData.total = itemData.total;
    if (itemData.isDisputed !== undefined) updateData.is_disputed = itemData.isDisputed;
    if (itemData.medicalNecessityProvided !== undefined) updateData.medical_necessity_provided = itemData.medicalNecessityProvided;
    // Add other fields as needed

    // Update the item in the database
    const { error: itemError } = await supabase
      .from('invoice_items')
      .update(updateData)
      .eq('id', itemId);

    if (itemError) throw itemError;

    // TODO: Recalculate invoice totals after updating item
    
    // Fetch and return the updated invoice
    return await getInvoiceById(invoiceId);
  } catch (error) {
    handleSupabaseError(error, 'Update Invoice Item');
    throw error; // Re-throw after handling
  }
}

/**
 * Remove an invoice item
 * 
 * @param invoiceId - Invoice ID
 * @param itemId - Item ID
 * @returns The updated invoice
 */
export async function removeInvoiceItem(invoiceId: ID, itemId: ID): Promise<Invoice> {
  try {
    // Delete the item from the database
    const { error: itemError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('id', itemId);

    if (itemError) throw itemError;

    // TODO: Recalculate invoice totals after removing item
    
    // Fetch and return the updated invoice
    return await getInvoiceById(invoiceId);
  } catch (error) {
    handleSupabaseError(error, 'Remove Invoice Item');
    throw error; // Re-throw after handling
  }
}

/**
 * Update invoice status
 * 
 * @param invoiceId - Invoice ID
 * @param status - New status
 * @param notes - Optional notes about the status change
 * @returns The updated invoice
 */
export async function updateInvoiceStatus(invoiceId: ID, status: InvoiceStatus, notes?: string): Promise<Invoice> {
  try {
    // Update the status in the database
    const { error } = await supabase
      .from('invoices')
      .update({ status: status, notes: notes }) // Include notes if provided
      .eq('id', invoiceId);

    if (error) throw error;

    // Fetch and return the updated invoice
    return await getInvoiceById(invoiceId);
  } catch (error) {
    handleSupabaseError(error, `Update Invoice Status ${invoiceId}`);
    throw error; // Re-throw after handling
  }
}

/**
 * Submit a dispute for an invoice item
 * 
 * @param invoiceId - Invoice ID
 * @param dispute - Dispute details
 * @returns The updated invoice
 */
export async function submitDispute(invoiceId: ID, dispute: DisputeRequest): Promise<Invoice> {
  try {
    // Update the invoice item to mark as disputed
    const { error: itemError } = await supabase
      .from('invoice_items')
      .update({ 
        is_disputed: true, 
        dispute_reason: dispute.reason,
        dispute_date: new Date().toISOString().split('T')[0] 
        // TODO: Handle dispute_by_client_user_id if applicable
      })
      .eq('id', dispute.invoiceItemId);

    if (itemError) throw itemError;

    // Optionally update the invoice status to 'dispute'
    // This might be better handled by a trigger or based on whether *any* item is disputed
    await updateInvoiceStatus(invoiceId, 'dispute', `Item ${dispute.invoiceItemId} disputed: ${dispute.reason}`);

    // Fetch and return the updated invoice
    return await getInvoiceById(invoiceId);
  } catch (error) {
    handleSupabaseError(error, `Submit Dispute for Invoice ${invoiceId}`);
    throw error; // Re-throw after handling
  }
}

/**
 * Resolve a dispute for an invoice item
 * 
 * @param invoiceId - Invoice ID
 * @param resolution - Resolution details
 * @returns The updated invoice
 */
export async function resolveDispute(invoiceId: ID, resolution: DisputeResolution): Promise<Invoice> {
  try {
    // Prepare update data for the item
    const updateData: any = {
      is_disputed: resolution.resolution !== 'rejected',
      dispute_resolved_at: new Date().toISOString(),
      dispute_resolution_notes: resolution.notes
      // TODO: Handle dispute_resolved_by_user_id
    };

    // Adjust total if needed (this might be better handled by triggers/payments/adjustments)
    if (resolution.resolution === 'accepted') {
      // Need to fetch the item first to get its total for adjustment, or handle via trigger/payment
      console.warn("Dispute accepted - manual adjustment or payment write-off likely needed.");
    } else if (resolution.resolution === 'partial' && resolution.adjustmentAmount !== undefined) {
       console.warn("Partial dispute resolution - manual adjustment or payment write-off likely needed.");
       // updateData.total = ??? // Need original total - adjustmentAmount
    }

    // Update the item
    const { error: itemError } = await supabase
      .from('invoice_items')
      .update(updateData)
      .eq('id', resolution.invoiceItemId);

    if (itemError) throw itemError;

    // TODO: Recalculate invoice totals and potentially update invoice status if all disputes resolved
    
    // Fetch and return the updated invoice
    return await getInvoiceById(invoiceId);
  } catch (error) {
    handleSupabaseError(error, `Resolve Dispute for Invoice ${invoiceId}`);
    throw error; // Re-throw after handling
  }
}

/**
 * Send an invoice to the client
 * 
 * @param invoiceId - Invoice ID
 * @param options - Sending options
 * @returns The updated invoice
 */
export async function sendInvoice(
  invoiceId: ID, 
  options: { 
    emailRecipients?: string[]; 
    includeAttachment?: boolean; 
    message?: string 
  }
): Promise<Invoice> {
  try {
    // Update invoice status to 'sent'
    await updateInvoiceStatus(invoiceId, 'sent', 'Invoice sent to client');
    
    // TODO: Implement actual email sending logic (e.g., call a Supabase function)
    console.log(`TODO: Implement email sending for invoice ${invoiceId} to ${options.emailRecipients?.join(', ')}`);

    // Fetch and return the updated invoice
    return await getInvoiceById(invoiceId);
  } catch (error) {
    handleSupabaseError(error, `Send Invoice ${invoiceId}`);
    throw error; // Re-throw after handling
  }
}

/**
 * Generate a PDF for an invoice
 * 
 * @param invoiceId - Invoice ID
 * @returns PDF blob
 */
export async function generateInvoicePdf(invoiceId: ID): Promise<Blob> {
  try {
    // TODO: Replace mock development behavior with actual API implementation
    if (import.meta.env.DEV) {
      console.log('API: Mock generateInvoicePdf', invoiceId);
      await delay(1500);
      
      // In development, return an empty PDF blob
      return new Blob(['PDF content would go here'], { type: 'application/pdf' });
    }
    
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/invoices/${invoiceId}/pdf`, {
      method: 'GET',
      headers: {
        // Authorization header would be added here in a real implementation
        // 'Authorization': `Bearer ${getAuthToken()}`,
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error(`Failed to generate PDF for invoice ${invoiceId}:`, error);
    throw error;
  }
}

/**
 * Get invoice history (audit trail)
 * 
 * @param invoiceId - Invoice ID
 * @returns Array of history events
 */
export async function getInvoiceHistory(invoiceId: ID): Promise<Array<{
  id: ID;
  timestamp: string;
  user?: { id: ID; name: string };
  clientUser?: { id: ID; name: string };
  eventType: string;
  description: string;
  previousValue?: string;
  newValue?: string;
}>> {
  try {
    // TODO: Replace mock history events with actual API implementation
    if (import.meta.env.DEV) {
      console.log('API: Mock getInvoiceHistory', invoiceId);
      await delay(700);
      
      // Generate mock history events for development only
      return [
        {
          id: 'hist-1',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          user: { id: '1', name: 'Admin User' },
          eventType: 'created',
          description: 'Invoice created'
        },
        {
          id: 'hist-2',
          timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          user: { id: '1', name: 'Admin User' },
          eventType: 'item_added',
          description: 'Item added to invoice'
        },
        {
          id: 'hist-3',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          user: { id: '1', name: 'Admin User' },
          eventType: 'status_changed',
          description: 'Status changed from draft to sent',
          previousValue: 'draft',
          newValue: 'sent'
        },
        {
          id: 'hist-4',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          clientUser: { id: 'client-1', name: 'Client User' },
          eventType: 'item_disputed',
          description: 'Item disputed by client'
        },
        {
          id: 'hist-5',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          user: { id: '2', name: 'AR Manager' },
          eventType: 'dispute_resolved',
          description: 'Dispute resolved'
        },
        {
          id: 'hist-6',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          user: { id: '2', name: 'AR Manager' },
          eventType: 'payment_applied',
          description: 'Payment of $125.00 applied to invoice'
        }
      ];
    }
    
    // For production, use the actual API
    return await apiRequest<Array<{
      id: ID;
      timestamp: string;
      user?: { id: ID; name: string };
      clientUser?: { id: ID; name: string };
      eventType: string;
      description: string;
      previousValue?: string;
      newValue?: string;
    }>>(`/invoices/${invoiceId}/history`);
  } catch (error) {
    console.error(`Failed to get history for invoice ${invoiceId}:`, error);
    throw error;
  }
}
