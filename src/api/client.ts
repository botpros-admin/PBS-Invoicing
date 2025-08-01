/**
 * API Client Configuration
 * 
 * This module sets up the configuration for API requests using Supabase.
 * The original fetch-based implementation is kept for backward compatibility
 * during the transition to Supabase.
 */
import { supabase } from './supabase';

// Re-export the Supabase client from the central location
export { supabase };

// Legacy API Configuration (for backward compatibility)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// Helper function for controlled delays when needed
// Not used for mocking API responses anymore
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Legacy API request handler with error handling
 * NOTE: This function is kept for backward compatibility during the transition
 * to Supabase. New code should use the supabase client directly.
 * 
 * @param endpoint - API endpoint to call
 * @param options - Fetch options including method, body, headers
 * @returns Promise with the parsed response data
 */
export async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Merge default headers with any provided headers
  const headers = {
    ...DEFAULT_HEADERS,
    ...options.headers,
    // Authorization header would be added here in a real implementation
    // 'Authorization': `Bearer ${getAuthToken()}`,
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Handle API errors
    if (!response.ok) {
      // Parse error response if possible
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: 'Unknown error occurred' };
      }
      
      throw new Error(
        errorData.message || `API error: ${response.status} ${response.statusText}`
      );
    }
    
    // Return empty object for 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }
    
    // Parse JSON response
    return await response.json() as T;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}


/**
 * Handles Supabase API errors with enhanced diagnostics
 * 
 * @param error - Supabase error object
 * @param context - Additional context for the error
 * @returns Formatted error message
 */
export function handleSupabaseError(error: any, context: string = 'API request'): never {
  // Print more detailed error information to help with debugging
  console.error(`Supabase error in ${context}:`, error);
  
  // Check for authentication issues
  if (error?.message?.includes('JWT') || 
      error?.message?.includes('auth') || 
      error?.message?.includes('token') ||
      error?.message?.includes('session') ||
      error?.message?.includes('authentication') ||
      error?.message?.includes('permission') ||
      error?.message?.includes('access')) {
    
    console.warn('Authentication related error detected - checking auth state');
    
    // Attempt to check the auth state to help with debugging
    try {
      // Access from the supabase client we re-exported above
      const currentSession = supabase.auth.getSession();
      console.log('Current auth session state:', currentSession);
      
      // Check localStorage directly
      const rawSession = localStorage.getItem('pbs_invoicing_auth');
      console.log('Session in localStorage:', rawSession ? 'exists' : 'missing');
      
    } catch (checkError) {
      console.error('Error while checking auth state:', checkError);
    }
    
    // For auth errors, provide a more specific message
    const authErrorMessage = 'Authentication error: Your session may have expired. Please try refreshing the page or logging in again.';
    throw new Error(authErrorMessage);
  }
  
  // Check for permission/policy errors
  if (error?.message?.includes('policy') || 
      error?.message?.includes('permission') || 
      error?.message?.includes('row level security') ||
      error?.message?.includes('RLS')) {
    
    console.warn('RLS policy error detected');
    
    // Attempt to check the user role
    try {
      import('../context/enhanced-auth-error-handling').then(({ isRlsRecursionError }) => {
        if (isRlsRecursionError(error)) {
          console.error('RLS recursion error detected - this may affect data loading');
        }
      });
    } catch (checkError) {
      console.error('Error while checking RLS error:', checkError);
    }
    
    // For permission errors, provide a more helpful message
    const permissionMessage = 'Permission error: You may not have access to this resource. Please check your account privileges.';
    throw new Error(permissionMessage);
  }
  
  // For network-related errors
  if (error instanceof TypeError || error?.message?.includes('network') || error?.message?.includes('connection')) {
    const networkMessage = 'Network error: Please check your internet connection and try again.';
    throw new Error(networkMessage);
  }
  
  // For all other errors, use the error message or a generic fallback
  const message = error?.message || error?.error_description || 'An unknown error occurred';
  throw new Error(message);
}

/**
 * Retry logic for Supabase queries with auth refresh
 * Use this to wrap critical data fetching operations that might fail due to token expiration
 * 
 * @param queryFn - Function that executes a Supabase query
 * @returns Result of the query function
 */
export async function withAuthRetry<T>(queryFn: () => Promise<T>): Promise<T> {
  try {
    // First attempt
    return await queryFn();
  } catch (error) {
    console.warn('Query failed, checking if auth refresh is needed:', error);
    
    // Check if this is an auth-related error
    const errorMessage = (error as any)?.message || '';
    const isAuthError = errorMessage.includes('JWT') || 
                        errorMessage.includes('auth') || 
                        errorMessage.includes('token') ||
                        errorMessage.includes('session');
    
    if (isAuthError) {
      console.log('Attempting to refresh session before retry...');
      
      try {
        // Attempt to refresh the session
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Session refresh failed:', refreshError);
          throw error; // Re-throw original error if refresh fails
        }
        
        if (data?.session) {
          console.log('Session refreshed successfully, retrying query...');
          
          // Retry the query with fresh token
          return await queryFn();
        } else {
          console.error('Session refresh returned no session');
          throw error; // Re-throw original error
        }
      } catch (refreshError) {
        console.error('Error during session refresh:', refreshError);
        throw error; // Re-throw original error
      }
    }
    
    // Not an auth error or refresh failed
    throw error;
  }
}
