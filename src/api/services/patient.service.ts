/**
 * Patient Service
 * 
 * This service handles all patient-related operations including CRUD operations
 * and filtering. Integrated with Supabase for database operations.
 */

import { supabase, handleSupabaseError } from '../client';
import { 
  Patient,
  ID,
  PaginatedResponse,
  FilterOptions,
  DateString
} from '../../types';

// Interface representing the patient schema in the database
interface PatientSchema {
  id: number;
  client_id: number;
  first_name: string | null;
  last_name: string | null;
  middle_name?: string | null;
  dob?: DateString | null;
  sex?: 'male' | 'female' | 'other' | 'unknown' | null;
  mrn?: string | null;
  accession_number?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all patients
 * 
 * @param filters - Filter and pagination options
 * @returns Paginated list of patients
 */
export async function getPatients(filters?: FilterOptions): Promise<PaginatedResponse<Patient>> {
  try {
    // Initialize query
    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (filters?.search) {
      const search = `%${filters.search}%`;
      query = query.or(`first_name.ilike.${search},last_name.ilike.${search},mrn.ilike.${search},accession_number.ilike.${search}`);
    }
    
    if (filters?.clientId && filters.clientId.length > 0) {
      query = query.in('client_id', filters.clientId);
    }
    
    // Apply sorting
    if (filters?.sortBy) {
      const direction = filters.sortDirection || 'asc';
      let column = '';
      
      switch (filters.sortBy) {
        case 'firstName':
          column = 'first_name';
          break;
        case 'lastName':
          column = 'last_name';
          break;
        case 'dob':
          column = 'dob';
          break;
        case 'createdAt':
          column = 'created_at';
          break;
        default:
          column = 'last_name';
      }
      
      query = query.order(column, { ascending: direction === 'asc' });
    } else {
      // Default sort by last name, then first name
      query = query.order('last_name', { ascending: true })
                   .order('first_name', { ascending: true });
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
    
    // Transform to frontend type with null values converted to undefined for optional fields
    const patients: Patient[] = data.map((patient: PatientSchema) => ({
      id: patient.id.toString(),
      clientId: patient.client_id.toString(),
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      middle_name: patient.middle_name || undefined, // Convert null to undefined
      dob: patient.dob || undefined, // Convert null to undefined
      sex: patient.sex || undefined, // Convert null to undefined  
      mrn: patient.mrn || undefined, // Convert null to undefined
      accessionNumber: patient.accession_number || undefined, // Convert null to undefined
      createdAt: patient.created_at,
      updatedAt: patient.updated_at
    }));
    
    return {
      data: patients,
      total: count || patients.length,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 1
    };
  } catch (error) {
    handleSupabaseError(error, 'Fetch Patients');
    throw error;
  }
}

/**
 * Get patients for a specific client
 * 
 * @param clientId - Client ID
 * @param filters - Filter and pagination options
 * @returns Paginated list of patients for the specified client
 */
export async function getPatientsByClient(clientId: ID, filters?: FilterOptions): Promise<PaginatedResponse<Patient>> {
  return getPatients({
    ...filters,
    clientId: [clientId]
  });
}

/**
 * Get a single patient by ID
 * 
 * @param id - Patient ID
 * @returns The patient with the specified ID
 */
export async function getPatientById(id: ID): Promise<Patient> {
  try {
    // Get patient data
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id.toString())
      .single();
    
    if (error) throw error;
    if (!data) throw new Error(`Patient with ID ${id} not found`);
    
    // Transform to frontend type with null values converted to undefined
    const patient: Patient = {
      id: data.id.toString(),
      clientId: data.client_id.toString(),
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      middle_name: data.middle_name || undefined, // Convert null to undefined
      dob: data.dob || undefined, // Convert null to undefined
      sex: data.sex || undefined, // Convert null to undefined
      mrn: data.mrn || undefined, // Convert null to undefined
      accessionNumber: data.accession_number || undefined, // Convert null to undefined
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return patient;
  } catch (error) {
    handleSupabaseError(error, 'Get Patient by ID');
    throw error;
  }
}

/**
 * Create a new patient
 * 
 * @param patientData - New patient data
 * @returns The created patient
 */
export async function createPatient(patientData: Partial<Patient>): Promise<Patient> {
  try {
    if (!patientData.clientId) {
      throw new Error('Client ID is required to create a patient');
    }

    // Insert patient
    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert({
        client_id: parseInt(patientData.clientId.toString()),
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        middle_name: patientData.middle_name,
        dob: patientData.dob,
        sex: patientData.sex,
        mrn: patientData.mrn,
        accession_number: patientData.accessionNumber
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Transform to frontend type with null values converted to undefined
    const patient: Patient = {
      id: newPatient.id.toString(),
      clientId: newPatient.client_id.toString(),
      first_name: newPatient.first_name || '',
      last_name: newPatient.last_name || '',
      middle_name: newPatient.middle_name || undefined, // Convert null to undefined
      dob: newPatient.dob || undefined, // Convert null to undefined
      sex: newPatient.sex || undefined, // Convert null to undefined
      mrn: newPatient.mrn || undefined, // Convert null to undefined
      accessionNumber: newPatient.accession_number || undefined, // Convert null to undefined
      createdAt: newPatient.created_at,
      updatedAt: newPatient.updated_at
    };
    
    return patient;
  } catch (error) {
    handleSupabaseError(error, 'Create Patient');
    throw error;
  }
}

/**
 * Update an existing patient
 * 
 * @param id - Patient ID
 * @param patientData - Updated patient data
 * @returns The updated patient
 */
export async function updatePatient(id: ID, patientData: Partial<Patient>): Promise<Patient> {
  try {
    // Prepare update data
    const updateData: Partial<PatientSchema> = {};
    if (patientData.clientId !== undefined) updateData.client_id = parseInt(patientData.clientId.toString());
    if (patientData.first_name !== undefined) updateData.first_name = patientData.first_name;
    if (patientData.last_name !== undefined) updateData.last_name = patientData.last_name;
    if (patientData.middle_name !== undefined) updateData.middle_name = patientData.middle_name;
    if (patientData.dob !== undefined) updateData.dob = patientData.dob;
    if (patientData.sex !== undefined) updateData.sex = patientData.sex;
    if (patientData.mrn !== undefined) updateData.mrn = patientData.mrn;
    if (patientData.accessionNumber !== undefined) updateData.accession_number = patientData.accessionNumber;
    
    // Update patient
    const { error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', id.toString());
    
    if (error) throw error;
    
    // Return the updated patient
    return await getPatientById(id);
  } catch (error) {
    handleSupabaseError(error, 'Update Patient');
    throw error;
  }
}

/**
 * Delete a patient
 * 
 * @param id - Patient ID
 * @returns Success message
 */
export async function deletePatient(id: ID): Promise<{ message: string }> {
  try {
    // Delete patient (Supabase RLS and DB constraints should handle cascades)
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id.toString());
    
    if (error) throw error;
    
    return { message: `Patient ${id} deleted successfully` };
  } catch (error) {
    handleSupabaseError(error, 'Delete Patient');
    throw error;
  }
}
