/**
 * API Client Configuration
 *
 * This module sets up the configuration for API requests using the Cloudflare Workers API.
 */

// Import and re-export supabase stub for compatibility
import { supabase } from './supabase';
export { supabase };

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// Helper to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('pbs_invoicing_token');
};

// Helper function for controlled delays when needed
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * API request handler with error handling and authentication
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

  // Get auth token if available
  const token = getAuthToken();

  // Merge default headers with any provided headers
  const headers = {
    ...DEFAULT_HEADERS,
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
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
    throw error;
  }
}

// Helper to safely get an error message from an unknown type
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

/**
 * Handles API errors with enhanced diagnostics
 *
 * @param error - API error object
 * @param context - Additional context for the error
 * @returns Formatted error message
 */
export function handleApiError(error: unknown, context: string = 'API request'): never {
  const message = getErrorMessage(error);

  // Check for authentication issues
  if (message.includes('auth') ||
      message.includes('token') ||
      message.includes('session') ||
      message.includes('authentication') ||
      message.includes('401') ||
      message.includes('Unauthorized')) {

    const authErrorMessage = 'Authentication error: Your session may have expired. Please try logging in again.';
    throw new Error(authErrorMessage);
  }

  // Check for permission/authorization errors
  if (message.includes('permission') ||
      message.includes('403') ||
      message.includes('Forbidden')) {

    const permissionMessage = 'Permission error: You may not have access to this resource. Please check your account privileges.';
    throw new Error(permissionMessage);
  }

  // For network-related errors
  if (error instanceof TypeError || message.includes('network') || message.includes('connection') || message.includes('Failed to fetch')) {
    const networkMessage = 'Network error: Please check your internet connection and try again.';
    throw new Error(networkMessage);
  }

  // For all other errors, use the error message or a generic fallback
  const finalMessage = message || 'An unknown error occurred';
  throw new Error(finalMessage);
}

// Compatibility alias for old code
export const handleSupabaseError = handleApiError;

/**
 * Retry logic for API queries with auth refresh
 * Use this to wrap critical data fetching operations that might fail due to token expiration
 *
 * @param queryFn - Function that executes an API query
 * @returns Result of the query function
 */
export async function withAuthRetry<T>(queryFn: () => Promise<T>): Promise<T> {
  try {
    // First attempt
    return await queryFn();
  } catch (error) {

    // Check if this is an auth-related error
    const errorMessage = getErrorMessage(error);
    const isAuthError = errorMessage.includes('auth') ||
                        errorMessage.includes('token') ||
                        errorMessage.includes('session') ||
                        errorMessage.includes('401');

    if (isAuthError) {
      // Clear token and force re-login
      localStorage.removeItem('pbs_invoicing_token');
      localStorage.removeItem('pbs_invoicing_user');

      // Redirect to login
      window.location.href = '/login';

      throw error;
    }

    // Not an auth error
    throw error;
  }
}
