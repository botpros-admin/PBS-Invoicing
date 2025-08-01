/**
 * Client Service
 * 
 * This service manages operations related to clients, clinics, and contacts,
 * including CRUD operations and data management.
 */

import { apiRequest, delay, supabase, handleSupabaseError, withAuthRetry } from '../client';
import { 
  Client, 
  Clinic, 
  ClinicContact, 
  InvoiceParameters,
  PaginatedResponse,
  ID,
  FilterOptions
} from '../../types';
import { 
  CompatClient, 
  CompatClinic, 
  CompatClinicContact,
  convertToClient,
  convertToClinic,
  convertToClinicContact,
  convertToInvoiceParameters
} from '../../types/compatibility';

/**
 * Get a paginated list of all clients
 * 
 * @param filters - Filter and pagination options
 * @returns Paginated list of clients
 */
export async function getClients(filters?: FilterOptions): Promise<PaginatedResponse<Client>> {
  try {
    // Use withAuthRetry to handle token refresh if needed
    return await withAuthRetry(async () => {
      // Initialize query with embedded selects to avoid N+1 queries
      let query = supabase
        .from('clients')
        .select(`
          *,
          clinics(*),
          invoice_parameters(*)
        `, { count: 'exact' });
      
      // Apply filters
      if (filters?.search) {
        const search = `%${filters.search}%`;
        query = query.or(`name.ilike.${search},address.ilike.${search}`);
      }
      
      // Apply sorting
      if (filters?.sortBy) {
        const direction = filters.sortDirection || 'asc';
        let column = '';
        
        switch (filters.sortBy) {
          case 'name':
            column = 'name';
            break;
          case 'createdAt':
            column = 'created_at';
            break;
          default:
            column = 'name';
        }
        
        query = query.order(column, { ascending: direction === 'asc' });
      } else {
        // Default sort by name
        query = query.order('name', { ascending: true });
      }
      
      // Apply pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const startIndex = (page - 1) * limit;
      
      query = query.range(startIndex, startIndex + limit - 1);
      
      console.log('Querying clients data from Supabase with embedded selects');
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
      
      if (!data) {
        // Handle case where data is null (e.g., RLS prevents access)
        console.warn('No clients data returned from Supabase');
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      
      console.log(`Retrieved ${data.length} clients with related data from database`);
    
      // Convert to frontend types
      const clients: Client[] = data.map((client: any) => {
        return {
          id: client.id.toString(),
          name: client.name,
          address: client.address || '',
          logoUrl: client.logo_url,
          organizationId: client.organization_id?.toString() || '',
          createdAt: client.created_at,
          updatedAt: client.updated_at,
          clinics: client.clinics?.map((clinic: any) => ({
            id: clinic.id.toString(),
            name: clinic.name,
            address: clinic.address || '',
            logoUrl: clinic.logo_url,
            clientId: client.id.toString(),
            isActive: clinic.is_active === true,
            parentClinicId: clinic.parent_clinic_id?.toString(),
            salesRep: clinic.sales_rep,
            preferredContactMethod: clinic.preferred_contact_method,
            billToAddress: clinic.bill_to_address,
            notes: clinic.notes,
            contractDocumentPath: clinic.contract_document_path,
            createdAt: clinic.created_at,
            updatedAt: clinic.updated_at,
            contacts: [] // Clinic contacts will be loaded when needed
          })) || [],
          invoiceParameters: client.invoice_parameters?.length > 0 ? {
            id: client.invoice_parameters[0].id.toString(),
            clientId: client.id.toString(),
            showLogo: client.invoice_parameters[0].show_logo,
            logoPosition: client.invoice_parameters[0].logo_position,
            headerStyle: client.invoice_parameters[0].header_style,
            footerStyle: client.invoice_parameters[0].footer_style,
            companyName: client.invoice_parameters[0].company_name,
            companyAddress: client.invoice_parameters[0].company_address,
            companyEmail: client.invoice_parameters[0].company_email,
            companyPhone: client.invoice_parameters[0].company_phone,
            customMessage: client.invoice_parameters[0].custom_message,
            primaryColor: client.invoice_parameters[0].primary_color,
            highlightColor: client.invoice_parameters[0].highlight_color,
            fontFamily: client.invoice_parameters[0].font_family,
            fontSize: client.invoice_parameters[0].font_size,
            createdAt: client.invoice_parameters[0].created_at,
            updatedAt: client.invoice_parameters[0].updated_at
          } : undefined
        };
      });
      
      return {
        data: clients,
        total: count || clients.length,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 1
      };
    });
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw error;
  }
}

/**
 * Get a single client by ID
 * 
 * @param id - Client ID
 * @returns The client with the specified ID
 */
export async function getClientById(id: ID): Promise<Client> {
  try {
    // Get all data in a single query using embedded selects
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select(`
        *,
        clinics(*),
        invoice_parameters(*)
      `)
      .eq('id', id.toString())
      .single();
    
    if (clientError) throw clientError;
    if (!clientData) throw new Error(`Client with ID ${id} not found`);
    
    // Transform to frontend type
    const client: Client = {
      id: clientData.id.toString(),
      name: clientData.name,
      address: clientData.address || '',
      logoUrl: clientData.logo_url,
      organizationId: clientData.organization_id?.toString() || '',
      createdAt: clientData.created_at,
      updatedAt: clientData.updated_at,
      clinics: clientData.clinics?.map((clinic: any) => ({
        id: clinic.id.toString(),
        name: clinic.name,
        address: clinic.address || '',
        logoUrl: clinic.logo_url,
        clientId: id.toString(),
        isActive: clinic.is_active === true,
        parentClinicId: clinic.parent_clinic_id?.toString(),
        salesRep: clinic.sales_rep,
        preferredContactMethod: clinic.preferred_contact_method,
        billToAddress: clinic.bill_to_address,
        notes: clinic.notes,
        contractDocumentPath: clinic.contract_document_path,
        createdAt: clinic.created_at,
        updatedAt: clinic.updated_at,
        contacts: [] // Clinic contacts will be loaded when needed
      })) || [],
      invoiceParameters: clientData.invoice_parameters?.length > 0 ? {
        id: clientData.invoice_parameters[0].id.toString(),
        clientId: id.toString(),
        showLogo: clientData.invoice_parameters[0].show_logo,
        logoPosition: clientData.invoice_parameters[0].logo_position,
        headerStyle: clientData.invoice_parameters[0].header_style,
        footerStyle: clientData.invoice_parameters[0].footer_style,
        companyName: clientData.invoice_parameters[0].company_name,
        companyAddress: clientData.invoice_parameters[0].company_address,
        companyEmail: clientData.invoice_parameters[0].company_email,
        companyPhone: clientData.invoice_parameters[0].company_phone,
        customMessage: clientData.invoice_parameters[0].custom_message,
        primaryColor: clientData.invoice_parameters[0].primary_color,
        highlightColor: clientData.invoice_parameters[0].highlight_color,
        fontFamily: clientData.invoice_parameters[0].font_family,
        fontSize: clientData.invoice_parameters[0].font_size,
        createdAt: clientData.invoice_parameters[0].created_at,
        updatedAt: clientData.invoice_parameters[0].updated_at
      } : undefined
    };
    
    return client;
  } catch (error) {
    console.error(`Failed to fetch client ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new client
 * 
 * @param clientData - New client data
 * @returns The created client
 */
export async function createClient(clientData: Partial<Client>): Promise<Client> {
  try {
    // Insert client
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: clientData.name,
        address: clientData.address,
        logo_url: clientData.logoUrl,
        organization_id: clientData.organizationId ? parseInt(clientData.organizationId.toString()) : null
      })
      .select()
      .single();
    
    if (clientError) throw clientError;
    
    // Insert default invoice parameters
    const { error: paramsError } = await supabase
      .from('invoice_parameters')
      .insert({
        client_id: newClient.id,
        show_logo: true,
        logo_position: 'top-left',
        header_style: 'modern',
        footer_style: 'simple',
        company_name: clientData.name,
        company_address: clientData.address || '',
        primary_color: '#0078D7',
        highlight_color: 'rgb(207, 240, 253)',
        font_family: 'Helvetica, Arial, sans-serif',
        font_size: '14px',
        custom_message: 'Thank you for your business.'
      });
    
    if (paramsError) {
      console.warn('Failed to create default invoice parameters:', paramsError);
      // Continue anyway as this is not critical
    }
    
    // Return the complete client
    return await getClientById(newClient.id);
  } catch (error) {
    console.error('Failed to create client:', error);
    throw error;
  }
}

/**
 * Update an existing client
 * 
 * @param id - Client ID
 * @param clientData - Updated client data
 * @returns The updated client
 */
export async function updateClient(id: ID, clientData: Partial<Client>): Promise<Client> {
  try {
    // Prepare update data
    const updateData: any = {};
    if (clientData.name !== undefined) updateData.name = clientData.name;
    if (clientData.address !== undefined) updateData.address = clientData.address;
    if (clientData.logoUrl !== undefined) updateData.logo_url = clientData.logoUrl;
    if (clientData.organizationId !== undefined) {
      updateData.organization_id = clientData.organizationId 
        ? parseInt(clientData.organizationId.toString()) 
        : null;
    }
    
    // Update client
    const { error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id.toString());
    
    if (error) throw error;
    
    // Return the updated client
    return await getClientById(id);
  } catch (error) {
    console.error(`Failed to update client ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a client
 * 
 * @param id - Client ID
 * @returns Success message
 */
export async function deleteClient(id: ID): Promise<{ message: string }> {
  try {
    // Delete client (Supabase RLS and DB constraints should handle cascades)
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id.toString());
    
    if (error) throw error;
    
    return { message: `Client ${id} deleted successfully` };
  } catch (error) {
    console.error(`Failed to delete client ${id}:`, error);
    throw error;
  }
}

/**
 * Get all clinics for a client
 * 
 * @param clientId - Client ID
 * @param filters - Filter options
 * @returns List of clinics for the specified client
 */
export async function getClientClinics(clientId: ID, filters?: FilterOptions): Promise<Clinic[]> {
  try {
    // Initialize query
    let query = supabase
      .from('clinics')
      .select('*')
      .eq('client_id', clientId.toString());
    
    // Apply filters
    if (filters?.search) {
      const search = `%${filters.search}%`;
      query = query.or(`name.ilike.${search},address.ilike.${search}`);
    }
    
    // Apply sorting
    if (filters?.sortBy) {
      const direction = filters.sortDirection || 'asc';
      let column = '';
      
      switch (filters.sortBy) {
        case 'name':
          column = 'name';
          break;
        case 'createdAt':
          column = 'created_at';
          break;
        default:
          column = 'name';
      }
      
      query = query.order(column, { ascending: direction === 'asc' });
    } else {
      // Default sort by name
      query = query.order('name', { ascending: true });
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) throw error;
    if (!data) return [];
    
    // Get contacts for each clinic
    const clinics: Clinic[] = await Promise.all(data.map(async (clinic: any) => {
      const { data: contactsData } = await supabase
        .from('clinic_contacts')
        .select('*')
        .eq('clinic_id', clinic.id);
      
      return {
        id: clinic.id.toString(),
        name: clinic.name,
        address: clinic.address || '',
        logoUrl: clinic.logo_url,
        clientId: clientId.toString(),
        isActive: clinic.is_active === true,
        parentClinicId: clinic.parent_clinic_id?.toString(),
        salesRep: clinic.sales_rep,
        preferredContactMethod: clinic.preferred_contact_method,
        billToAddress: clinic.bill_to_address,
        notes: clinic.notes,
        contractDocumentPath: clinic.contract_document_path,
        createdAt: clinic.created_at,
        updatedAt: clinic.updated_at,
        contacts: contactsData?.map((contact: any) => ({
          id: contact.id.toString(),
          clinicId: clinic.id.toString(),
          name: contact.name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          isPrimary: contact.is_primary,
          department: contact.department,
          notes: contact.notes,
          fax: contact.fax,
          clientUserId: contact.client_user_id?.toString(),
          createdAt: contact.created_at,
          updatedAt: contact.updated_at
        })) || []
      };
    }));
    
    return clinics;
  } catch (error) {
    console.error(`Failed to fetch clinics for client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Get a single clinic by ID
 * 
 * @param clientId - Client ID
 * @param clinicId - Clinic ID
 * @returns The clinic with the specified ID
 */
export async function getClinicById(clientId: ID, clinicId: ID): Promise<Clinic> {
  try {
    // Get clinic data
    const { data: clinicData, error: clinicError } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', clinicId.toString())
      .eq('client_id', clientId.toString())
      .single();
    
    if (clinicError) throw clinicError;
    if (!clinicData) throw new Error(`Clinic with ID ${clinicId} not found for client ${clientId}`);
    
    // Get contacts for this clinic
    const { data: contactsData } = await supabase
      .from('clinic_contacts')
      .select('*')
      .eq('clinic_id', clinicId.toString());
    
    // Transform to frontend type
    const clinic: Clinic = {
      id: clinicData.id.toString(),
      name: clinicData.name,
      address: clinicData.address || '',
      logoUrl: clinicData.logo_url,
      clientId: clientId.toString(),
      isActive: clinicData.is_active === true,
      parentClinicId: clinicData.parent_clinic_id?.toString(),
      salesRep: clinicData.sales_rep,
      preferredContactMethod: clinicData.preferred_contact_method,
      billToAddress: clinicData.bill_to_address,
      notes: clinicData.notes,
      contractDocumentPath: clinicData.contract_document_path,
      createdAt: clinicData.created_at,
      updatedAt: clinicData.updated_at,
      contacts: contactsData?.map((contact: any) => ({
        id: contact.id.toString(),
        clinicId: clinicId.toString(),
        name: contact.name,
        title: contact.title,
        email: contact.email,
        phone: contact.phone,
        isPrimary: contact.is_primary,
        department: contact.department,
        notes: contact.notes,
        fax: contact.fax,
        clientUserId: contact.client_user_id?.toString(),
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      })) || []
    };
    
    return clinic;
  } catch (error) {
    console.error(`Failed to fetch clinic ${clinicId} for client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Create a new clinic for a client
 * 
 * @param clientId - Client ID
 * @param clinicData - New clinic data
 * @returns The created clinic
 */
export async function createClinic(clientId: ID, clinicData: Partial<Clinic>): Promise<Clinic> {
  try {
    // Insert clinic
    const { data: newClinic, error: clinicError } = await supabase
      .from('clinics')
      .insert({
        client_id: clientId.toString(),
        name: clinicData.name,
        address: clinicData.address,
        logo_url: clinicData.logoUrl,
        is_active: clinicData.isActive !== undefined ? clinicData.isActive : true,
        parent_clinic_id: clinicData.parentClinicId ? parseInt(clinicData.parentClinicId.toString()) : null,
        sales_rep: clinicData.salesRep,
        preferred_contact_method: clinicData.preferredContactMethod,
        bill_to_address: clinicData.billToAddress,
        notes: clinicData.notes,
        contract_document_path: clinicData.contractDocumentPath
      })
      .select()
      .single();
    
    if (clinicError) throw clinicError;
    
    // Return the complete clinic
    return await getClinicById(clientId, newClinic.id);
  } catch (error) {
    console.error(`Failed to create clinic for client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Update an existing clinic
 * 
 * @param clientId - Client ID
 * @param clinicId - Clinic ID
 * @param clinicData - Updated clinic data
 * @returns The updated clinic
 */
export async function updateClinic(clientId: ID, clinicId: ID, clinicData: Partial<Clinic>): Promise<Clinic> {
  try {
    // Prepare update data
    const updateData: any = {};
    if (clinicData.name !== undefined) updateData.name = clinicData.name;
    if (clinicData.address !== undefined) updateData.address = clinicData.address;
    if (clinicData.logoUrl !== undefined) updateData.logo_url = clinicData.logoUrl;
    if (clinicData.isActive !== undefined) updateData.is_active = clinicData.isActive;
    if (clinicData.parentClinicId !== undefined) {
      updateData.parent_clinic_id = clinicData.parentClinicId 
        ? parseInt(clinicData.parentClinicId.toString()) 
        : null;
    }
    if (clinicData.salesRep !== undefined) updateData.sales_rep = clinicData.salesRep;
    if (clinicData.preferredContactMethod !== undefined) updateData.preferred_contact_method = clinicData.preferredContactMethod;
    if (clinicData.billToAddress !== undefined) updateData.bill_to_address = clinicData.billToAddress;
    if (clinicData.notes !== undefined) updateData.notes = clinicData.notes;
    if (clinicData.contractDocumentPath !== undefined) updateData.contract_document_path = clinicData.contractDocumentPath;
    
    // Update clinic
    const { error } = await supabase
      .from('clinics')
      .update(updateData)
      .eq('id', clinicId.toString())
      .eq('client_id', clientId.toString());
    
    if (error) throw error;
    
    // Return the updated clinic
    return await getClinicById(clientId, clinicId);
  } catch (error) {
    console.error(`Failed to update clinic ${clinicId} for client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Delete a clinic
 * 
 * @param clientId - Client ID
 * @param clinicId - Clinic ID
 * @returns Success message
 */
export async function deleteClinic(clientId: ID, clinicId: ID): Promise<{ message: string }> {
  try {
    // Delete clinic (Supabase RLS and DB constraints should handle cascades)
    const { error } = await supabase
      .from('clinics')
      .delete()
      .eq('id', clinicId.toString())
      .eq('client_id', clientId.toString());
    
    if (error) throw error;
    
    return { message: `Clinic ${clinicId} deleted successfully` };
  } catch (error) {
    console.error(`Failed to delete clinic ${clinicId} for client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Get contacts for a clinic
 * 
 * @param clientId - Client ID
 * @param clinicId - Clinic ID
 * @returns List of contacts for the specified clinic
 */
export async function getClinicContacts(clientId: ID, clinicId: ID): Promise<ClinicContact[]> {
  try {
    // Verify clinic exists for this client
    const { data: clinicData, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .eq('id', clinicId.toString())
      .eq('client_id', clientId.toString())
      .single();
    
    if (clinicError) throw clinicError;
    if (!clinicData) throw new Error(`Clinic with ID ${clinicId} not found for client ${clientId}`);
    
    // Get contacts
    const { data: contactsData, error: contactsError } = await supabase
      .from('clinic_contacts')
      .select('*')
      .eq('clinic_id', clinicId.toString());
    
    if (contactsError) throw contactsError;
    if (!contactsData) return [];
    
    // Transform to frontend type
    const contacts: ClinicContact[] = contactsData.map((contact: any) => ({
      id: contact.id.toString(),
      clinicId: clinicId.toString(),
      name: contact.name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      isPrimary: contact.is_primary,
      department: contact.department,
      notes: contact.notes,
      fax: contact.fax,
      clientUserId: contact.client_user_id?.toString(),
      createdAt: contact.created_at,
      updatedAt: contact.updated_at
    }));
    
    return contacts;
  } catch (error) {
    console.error(`Failed to fetch contacts for clinic ${clinicId}:`, error);
    throw error;
  }
}

/**
 * Add a contact to a clinic
 * 
 * @param clientId - Client ID
 * @param clinicId - Clinic ID
 * @param contactData - New contact data
 * @returns The created contact
 */
export async function createClinicContact(clientId: ID, clinicId: ID, contactData: Partial<ClinicContact>): Promise<ClinicContact> {
  try {
    // Check if clinic exists for this client
    const { data: clinicData, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .eq('id', clinicId.toString())
      .eq('client_id', clientId.toString())
      .single();
    
    if (clinicError) throw clinicError;
    if (!clinicData) throw new Error(`Clinic with ID ${clinicId} not found for client ${clientId}`);
    
    // Get existing contacts to determine if this should be primary
    const { data: existingContacts } = await supabase
      .from('clinic_contacts')
      .select('id, is_primary')
      .eq('clinic_id', clinicId.toString());
    
    // If this is the first contact or explicitly set as primary, set isPrimary
    // If no preference is specified and this is the first contact, make it primary
    const isPrimary = contactData.isPrimary !== undefined
      ? contactData.isPrimary
      : (existingContacts?.length === 0);
    
    // Insert contact
    const { data: newContact, error: contactError } = await supabase
      .from('clinic_contacts')
      .insert({
        clinic_id: clinicId.toString(),
        name: contactData.name,
        title: contactData.title,
        email: contactData.email,
        phone: contactData.phone,
        is_primary: isPrimary,
        department: contactData.department,
        notes: contactData.notes,
        fax: contactData.fax,
        client_user_id: contactData.clientUserId ? parseInt(contactData.clientUserId.toString()) : null
      })
      .select()
      .single();
    
    if (contactError) throw contactError;
    
    // If this is a new primary, update other contacts
    if (isPrimary && existingContacts?.some(c => c.is_primary)) {
      await supabase
        .from('clinic_contacts')
        .update({ is_primary: false })
        .eq('clinic_id', clinicId.toString())
        .neq('id', newContact.id);
    }
    
    // Transform to frontend type
    const contact: ClinicContact = {
      id: newContact.id.toString(),
      clinicId: clinicId.toString(),
      name: newContact.name,
      title: newContact.title,
      email: newContact.email,
      phone: newContact.phone,
      isPrimary: newContact.is_primary,
      department: newContact.department,
      notes: newContact.notes,
      fax: newContact.fax,
      clientUserId: newContact.client_user_id?.toString(),
      createdAt: newContact.created_at,
      updatedAt: newContact.updated_at
    };
    
    return contact;
  } catch (error) {
    console.error(`Failed to create contact for clinic ${clinicId}:`, error);
    throw error;
  }
}

/**
 * Update a clinic contact
 * 
 * @param clientId - Client ID
 * @param clinicId - Clinic ID
 * @param contactId - Contact ID
 * @param contactData - Updated contact data
 * @returns The updated contact
 */
export async function updateClinicContact(
  clientId: ID, 
  clinicId: ID, 
  contactId: ID, 
  contactData: Partial<ClinicContact>
): Promise<ClinicContact> {
  try {
    // Verify clinic exists for this client
    const { data: clinicData, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .eq('id', clinicId.toString())
      .eq('client_id', clientId.toString())
      .single();
    
    if (clinicError) throw clinicError;
    if (!clinicData) throw new Error(`Clinic with ID ${clinicId} not found for client ${clientId}`);
    
    // Get current contact data
    const { data: currentContact, error: contactError } = await supabase
      .from('clinic_contacts')
      .select('*')
      .eq('id', contactId.toString())
      .eq('clinic_id', clinicId.toString())
      .single();
    
    if (contactError) throw contactError;
    if (!currentContact) throw new Error(`Contact with ID ${contactId} not found for clinic ${clinicId}`);
    
    // Check if making this contact primary
    const makingPrimary = 
      contactData.isPrimary !== undefined && 
      contactData.isPrimary && 
      !currentContact.is_primary;
    
    // Prepare update data
    const updateData: any = {};
    if (contactData.name !== undefined) updateData.name = contactData.name;
    if (contactData.title !== undefined) updateData.title = contactData.title;
    if (contactData.email !== undefined) updateData.email = contactData.email;
    if (contactData.phone !== undefined) updateData.phone = contactData.phone;
    if (contactData.isPrimary !== undefined) updateData.is_primary = contactData.isPrimary;
    if (contactData.department !== undefined) updateData.department = contactData.department;
    if (contactData.notes !== undefined) updateData.notes = contactData.notes;
    if (contactData.fax !== undefined) updateData.fax = contactData.fax;
    if (contactData.clientUserId !== undefined) {
      updateData.client_user_id = contactData.clientUserId 
        ? parseInt(contactData.clientUserId.toString()) 
        : null;
    }
    
    // Update contact
    const { data: updatedContact, error: updateError } = await supabase
      .from('clinic_contacts')
      .update(updateData)
      .eq('id', contactId.toString())
      .eq('clinic_id', clinicId.toString())
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // If making this contact primary, update others
    if (makingPrimary) {
      await supabase
        .from('clinic_contacts')
        .update({ is_primary: false })
        .eq('clinic_id', clinicId.toString())
        .neq('id', contactId.toString());
    }
    
    // Transform to frontend type
    const contact: ClinicContact = {
      id: updatedContact.id.toString(),
      clinicId: clinicId.toString(),
      name: updatedContact.name,
      title: updatedContact.title,
      email: updatedContact.email,
      phone: updatedContact.phone,
      isPrimary: updatedContact.is_primary,
      department: updatedContact.department,
      notes: updatedContact.notes,
      fax: updatedContact.fax,
      clientUserId: updatedContact.client_user_id?.toString(),
      createdAt: updatedContact.created_at,
      updatedAt: updatedContact.updated_at
    };
    
    return contact;
  } catch (error) {
    console.error(`Failed to update contact ${contactId} for clinic ${clinicId}:`, error);
    throw error;
  }
}

/**
 * Delete a clinic contact
 * 
 * @param clientId - Client ID
 * @param clinicId - Clinic ID
 * @param contactId - Contact ID
 * @returns Success message
 */
export async function deleteClinicContact(clientId: ID, clinicId: ID, contactId: ID): Promise<{ message: string }> {
  try {
    // Verify clinic exists for this client
    const { data: clinicData, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .eq('id', clinicId.toString())
      .eq('client_id', clientId.toString())
      .single();
    
    if (clinicError) throw clinicError;
    if (!clinicData) throw new Error(`Clinic with ID ${clinicId} not found for client ${clientId}`);
    
    // Get current contact data to check if it's primary
    const { data: currentContact, error: contactError } = await supabase
      .from('clinic_contacts')
      .select('is_primary')
      .eq('id', contactId.toString())
      .eq('clinic_id', clinicId.toString())
      .single();
    
    if (contactError) throw contactError;
    if (!currentContact) throw new Error(`Contact with ID ${contactId} not found for clinic ${clinicId}`);
    
    // Delete the contact
    const { error: deleteError } = await supabase
      .from('clinic_contacts')
      .delete()
      .eq('id', contactId.toString())
      .eq('clinic_id', clinicId.toString());
    
    if (deleteError) throw deleteError;
    
    // If this was the primary contact, set another contact as primary
    if (currentContact.is_primary) {
      // Get other contacts for this clinic
      const { data: otherContacts } = await supabase
        .from('clinic_contacts')
        .select('id')
        .eq('clinic_id', clinicId.toString())
        .limit(1);
      
      // If there are other contacts, make the first one primary
      if (otherContacts && otherContacts.length > 0) {
        await supabase
          .from('clinic_contacts')
          .update({ is_primary: true })
          .eq('id', otherContacts[0].id)
          .eq('clinic_id', clinicId.toString());
      }
    }
    
    return { message: `Contact ${contactId} deleted successfully` };
  } catch (error) {
    console.error(`Failed to delete contact ${contactId} for clinic ${clinicId}:`, error);
    throw error;
  }
}

/**
 * Update invoice parameters for a client
 * 
 * @param clientId - Client ID
 * @param paramsData - Updated invoice parameters
 * @returns The updated invoice parameters
 */
export async function updateInvoiceParameters(clientId: ID, paramsData: Partial<InvoiceParameters>): Promise<InvoiceParameters> {
  try {
    // Get current parameters to check if they exist
    const { data: existingParams } = await supabase
      .from('invoice_parameters')
      .select('id')
      .eq('client_id', clientId.toString())
      .maybeSingle();
    
    // Prepare update data
    const updateData: any = {};
    if (paramsData.showLogo !== undefined) updateData.show_logo = paramsData.showLogo;
    if (paramsData.logoPosition !== undefined) updateData.logo_position = paramsData.logoPosition;
    if (paramsData.headerStyle !== undefined) updateData.header_style = paramsData.headerStyle;
    if (paramsData.footerStyle !== undefined) updateData.footer_style = paramsData.footerStyle;
    if (paramsData.companyName !== undefined) updateData.company_name = paramsData.companyName;
    if (paramsData.companyAddress !== undefined) updateData.company_address = paramsData.companyAddress;
    if (paramsData.companyEmail !== undefined) updateData.company_email = paramsData.companyEmail;
    if (paramsData.companyPhone !== undefined) updateData.company_phone = paramsData.companyPhone;
    if (paramsData.customMessage !== undefined) updateData.custom_message = paramsData.customMessage;
    if (paramsData.primaryColor !== undefined) updateData.primary_color = paramsData.primaryColor;
    if (paramsData.highlightColor !== undefined) updateData.highlight_color = paramsData.highlightColor;
    if (paramsData.fontFamily !== undefined) updateData.font_family = paramsData.fontFamily;
    if (paramsData.fontSize !== undefined) updateData.font_size = paramsData.fontSize;
    
    let params;
    
    if (existingParams) {
      // Update existing parameters
      const { data, error } = await supabase
        .from('invoice_parameters')
        .update(updateData)
        .eq('client_id', clientId.toString())
        .select()
        .single();
      
      if (error) throw error;
      params = data;
    } else {
      // Create new parameters if they don't exist
      updateData.client_id = clientId.toString();
      
      // Set defaults for required fields if not provided
      if (updateData.show_logo === undefined) updateData.show_logo = true;
      if (updateData.logo_position === undefined) updateData.logo_position = 'top-left';
      if (updateData.header_style === undefined) updateData.header_style = 'modern';
      if (updateData.footer_style === undefined) updateData.footer_style = 'simple';
      if (updateData.primary_color === undefined) updateData.primary_color = '#0078D7';
      if (updateData.highlight_color === undefined) updateData.highlight_color = 'rgb(207, 240, 253)';
      if (updateData.font_family === undefined) updateData.font_family = 'Helvetica, Arial, sans-serif';
      if (updateData.font_size === undefined) updateData.font_size = '14px';
      
      const { data, error } = await supabase
        .from('invoice_parameters')
        .insert(updateData)
        .select()
        .single();
      
      if (error) throw error;
      params = data;
    }
    
    // Transform to frontend type
    const invoiceParams: InvoiceParameters = {
      id: params.id.toString(),
      clientId: clientId.toString(),
      showLogo: params.show_logo,
      logoPosition: params.logo_position,
      headerStyle: params.header_style,
      footerStyle: params.footer_style,
      companyName: params.company_name,
      companyAddress: params.company_address,
      companyEmail: params.company_email,
      companyPhone: params.company_phone,
      customMessage: params.custom_message,
      primaryColor: params.primary_color,
      highlightColor: params.highlight_color,
      fontFamily: params.font_family,
      fontSize: params.font_size,
      createdAt: params.created_at,
      updatedAt: params.updated_at
    };
    
    return invoiceParams;
  } catch (error) {
    console.error(`Failed to update invoice parameters for client ${clientId}:`, error);
    throw error;
  }
}
