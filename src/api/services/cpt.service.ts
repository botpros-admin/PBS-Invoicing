/**
 * CPT Code Service
 * 
 * This service handles operations related to CPT (Current Procedural Terminology) codes,
 * including retrieving code details and pricing information.
 */

import { supabase, handleSupabaseError } from '../client';
import { 
  CptCode,
  ID,
  PaginatedResponse,
  FilterOptions
} from '../../types';

// Database schema for CPT codes
interface CptCodeSchema {
  id: number;
  code: string;
  description: string;
  default_price: number;
  category?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all CPT codes
 * 
 * @param filters - Filter and pagination options
 * @returns Paginated list of CPT codes
 */
export async function getCptCodes(filters?: FilterOptions): Promise<PaginatedResponse<CptCode>> {
  try {
    // Initialize query
    let query = supabase
      .from('cpt_codes')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (filters?.search) {
      const search = `%${filters.search}%`;
      query = query.or(`code.ilike.${search},description.ilike.${search}`);
    }
    
    // Apply sorting
    if (filters?.sortBy) {
      const direction = filters.sortDirection || 'asc';
      let column = '';
      
      switch (filters.sortBy) {
        case 'code':
          column = 'code';
          break;
        case 'description':
          column = 'description';
          break;
        case 'defaultPrice':
          column = 'default_price';
          break;
        default:
          column = 'code';
      }
      
      query = query.order(column, { ascending: direction === 'asc' });
    } else {
      // Default sort by code
      query = query.order('code', { ascending: true });
    }
    
    // Apply pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 100; // Fetch more CPT codes by default since they're frequently used
    const startIndex = (page - 1) * limit;
    
    query = query.range(startIndex, startIndex + limit - 1);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) throw error;
    if (!data) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }
    
    // Transform to frontend type
    const cptCodes: CptCode[] = data.map((cptCode: CptCodeSchema) => ({
      id: cptCode.id.toString(),
      code: cptCode.code,
      description: cptCode.description,
      defaultPrice: cptCode.default_price,
      createdAt: cptCode.created_at,
      updatedAt: cptCode.updated_at
    }));
    
    return {
      data: cptCodes,
      total: count || cptCodes.length,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 1
    };
  } catch (error) {
    handleSupabaseError(error, 'Fetch CPT Codes');
    throw error;
  }
}

/**
 * Get a single CPT code by ID
 * 
 * @param id - CPT code ID
 * @returns The CPT code with the specified ID
 */
export async function getCptCodeById(id: ID): Promise<CptCode> {
  try {
    // Get CPT code data
    const { data, error } = await supabase
      .from('cpt_codes')
      .select('*')
      .eq('id', id.toString())
      .single();
    
    if (error) throw error;
    if (!data) throw new Error(`CPT code with ID ${id} not found`);
    
    // Transform to frontend type
    const cptCode: CptCode = {
      id: data.id.toString(),
      code: data.code,
      description: data.description,
      defaultPrice: data.default_price,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return cptCode;
  } catch (error) {
    handleSupabaseError(error, 'Get CPT Code by ID');
    throw error;
  }
}

/**
 * Get a CPT code by its code string (e.g., "99213")
 * 
 * @param code - CPT code string
 * @returns The CPT code object matching the code string
 */
export async function getCptCodeByCode(code: string): Promise<CptCode> {
  try {
    // Get CPT code data
    const { data, error } = await supabase
      .from('cpt_codes')
      .select('*')
      .eq('code', code)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error(`CPT code "${code}" not found`);
    
    // Transform to frontend type
    const cptCode: CptCode = {
      id: data.id.toString(),
      code: data.code,
      description: data.description,
      defaultPrice: data.default_price,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return cptCode;
  } catch (error) {
    handleSupabaseError(error, `Get CPT Code by Code "${code}"`);
    throw error;
  }
}

/**
 * Search for CPT codes by partial code or description
 * 
 * @param searchTerm - Search term for code or description
 * @param limit - Maximum number of results to return
 * @returns List of matching CPT codes
 */
export async function searchCptCodes(searchTerm: string, limit = 10): Promise<CptCode[]> {
  try {
    // Format search term for ILIKE
    const formattedSearch = `%${searchTerm}%`;
    
    // Search for matches
    const { data, error } = await supabase
      .from('cpt_codes')
      .select('*')
      .or(`code.ilike.${formattedSearch},description.ilike.${formattedSearch}`)
      .limit(limit);
    
    if (error) throw error;
    if (!data) return [];
    
    // Transform to frontend type
    const cptCodes: CptCode[] = data.map((cptCode: CptCodeSchema) => ({
      id: cptCode.id.toString(),
      code: cptCode.code,
      description: cptCode.description,
      defaultPrice: cptCode.default_price,
      createdAt: cptCode.created_at,
      updatedAt: cptCode.updated_at
    }));
    
    return cptCodes;
  } catch (error) {
    handleSupabaseError(error, 'Search CPT Codes');
    throw error;
  }
}

/**
 * Get client-specific pricing for a CPT code
 * 
 * @param cptCodeId - CPT code ID
 * @param clientId - Client ID
 * @returns The client-specific price for the CPT code, or the default price if no override exists
 */
export async function getClientPriceForCptCode(cptCodeId: ID, clientId: ID): Promise<{ 
  id: ID; 
  price: number; 
  isOverride: boolean; 
}> {
  try {
    // Check for client-specific pricing
    const { data: overrideData, error: overrideError } = await supabase
      .from('client_pricing_overrides')
      .select('id, price')
      .eq('cpt_code_id', cptCodeId.toString())
      .eq('client_id', clientId.toString())
      .maybeSingle();
    
    if (overrideError) throw overrideError;
    
    // If client-specific pricing exists, return it
    if (overrideData) {
      return {
        id: overrideData.id.toString(),
        price: overrideData.price,
        isOverride: true
      };
    }
    
    // Otherwise, fetch the default price
    const { data: cptData, error: cptError } = await supabase
      .from('cpt_codes')
      .select('id, default_price')
      .eq('id', cptCodeId.toString())
      .single();
    
    if (cptError) throw cptError;
    if (!cptData) throw new Error(`CPT code with ID ${cptCodeId} not found`);
    
    return {
      id: cptData.id.toString(),
      price: cptData.default_price,
      isOverride: false
    };
  } catch (error) {
    handleSupabaseError(error, 'Get Client Price for CPT Code');
    throw error;
  }
}

/**
 * Get clinic-specific pricing for a CPT code
 * 
 * @param cptCodeId - CPT code ID
 * @param clinicId - Clinic ID
 * @returns The clinic-specific price for the CPT code, or the default price if no override exists
 */
export async function getClinicPriceForCptCode(cptCodeId: ID, clinicId: ID): Promise<{ 
  id: ID; 
  price: number; 
  isOverride: boolean; 
}> {
  try {
    // Check for clinic-specific pricing
    const { data: overrideData, error: overrideError } = await supabase
      .from('clinic_pricing_overrides')
      .select('id, price')
      .eq('cpt_code_id', cptCodeId.toString())
      .eq('clinic_id', clinicId.toString())
      .maybeSingle();
    
    if (overrideError) throw overrideError;
    
    // If clinic-specific pricing exists, return it
    if (overrideData) {
      return {
        id: overrideData.id.toString(),
        price: overrideData.price,
        isOverride: true
      };
    }
    
    // Otherwise, fetch the default price
    const { data: cptData, error: cptError } = await supabase
      .from('cpt_codes')
      .select('id, default_price')
      .eq('id', cptCodeId.toString())
      .single();
    
    if (cptError) throw cptError;
    if (!cptData) throw new Error(`CPT code with ID ${cptCodeId} not found`);
    
    return {
      id: cptData.id.toString(),
      price: cptData.default_price,
      isOverride: false
    };
  } catch (error) {
    handleSupabaseError(error, 'Get Clinic Price for CPT Code');
    throw error;
  }
}
