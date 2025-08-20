import { supabase, handleSupabaseError } from '../client';
import { SearchResult } from '../../types'; // Import from shared types

/**
 * Performs a global search across multiple tables using the RPC function.
 * @param searchTerm The term to search for.
 * @returns A promise that resolves to an array of SearchResult objects.
 */
export async function performGlobalSearch(searchTerm: string): Promise<SearchResult[]> {
  if (!searchTerm || searchTerm.trim().length < 3) {
    return []; // Don't search if term is too short
  }

  try {
    const { data, error } = await supabase.rpc('global_search', {
      search_term: searchTerm,
    });

    if (error) {
      throw error;
    }

    // The RPC function returns data matching the SearchResult structure,
    // but ensure type safety with a cast or validation if needed.
    return (data as SearchResult[]) || [];

  } catch (error) {
    handleSupabaseError(error, 'Global Search');
    // Return empty array on error, or re-throw if preferred
    return [];
  }
}
