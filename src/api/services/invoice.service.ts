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
        items:invoice_line_items!invoice_line_items_invoice_id_fkey(*)
      `, { count: 'exact' });
    
    // Apply filters
    if (filters?.search) {
      const search = `%${filters.search}%`;
      query = query.or(`invoice_number.ilike.${search},clients.name.ilike.${search}`); 
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
          column = 'clients.name';
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
        return { data: [], total: 0, page, limit, totalPages: 0 };
    }
    
    // Transform to frontend Invoice type
    const invoices: Invoice[] = data.map((inv: any) => {
      const invoice: Invoice = {
        id: inv.id ? inv.id.toString() : '',
        clientId: inv.client_id ? inv.client_id.toString() : '',
        clinicId: inv.clinic_id ? inv.clinic_id.toString() : '',
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
    // Get invoice with related data, including the patient for each line item
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        clinic:clinics(*),
        items:invoice_line_items!invoice_line_items_invoice_id_fkey(
          *,
          patient:patients(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error(`Invoice with ID ${id} not found`);
    
    const invoice: Invoice = {
      id: data.id.toString(),
      clientId: data.client_id ? data.client_id.toString() : '',
      clinicId: data.clinic_id ? data.clinic_id.toString() : '',
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
    const invoiceNumber = `INV-${Date.now().toString().substring(7)}`;
    const today = new Date().toISOString().split('T')[0];
    const dueDate = invoiceData.dateDue || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        client_id: invoiceData.clientId ? parseInt(invoiceData.clientId.toString()) : null,
        clinic_id: invoiceData.clinicId ? parseInt(invoiceData.clinicId.toString()) : null,
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
    const updateData: any = {};
    
    if (invoiceData.clientId !== undefined) updateData.client_id = parseInt(invoiceData.clientId.toString());
    if (invoiceData.clinicId !== undefined) updateData.clinic_id = parseInt(invoiceData.clinicId.toString());
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
// ... (rest of the file remains the same)
