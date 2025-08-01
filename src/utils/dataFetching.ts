/**
 * Data Fetching Utilities
 * 
 * This module provides robust data fetching capabilities with 
 * built-in authentication retry mechanisms.
 */

import { supabase } from '../api/supabase';
import { logSessionState } from './sessionDebug';

/**
 * Fetch data with automatic authentication retry
 * @param fetchFn Function that performs the actual data fetch
 * @param maxRetries Maximum number of retry attempts (default: 2)
 * @returns Promise with fetch result
 */
export async function fetchWithAuthRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    try {
      return await fetchFn();
    } catch (error) {
      attempts++;
      console.warn(`Data fetch failed (attempt ${attempts}/${maxRetries + 1}):`, error);
      
      // Only retry for auth-related errors
      if (!isAuthError(error)) {
        throw error;
      }
      
      if (attempts <= maxRetries) {
        console.log("Attempting token refresh and retry");
        
        // Log current session state before refresh attempt
        logSessionState();
        
        // Try to refresh the token
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !data.session) {
          console.error("Token refresh failed:", refreshError);
          
          // Count stored refresh attempts
          const retryCount = parseInt(localStorage.getItem('auth_debug_retries') || '0');
          localStorage.setItem('auth_debug_retries', (retryCount + 1).toString());
          
          // If we've tried multiple times, force a new login
          if (retryCount > 2) {
            console.error("Multiple refresh failures, redirecting to login");
            localStorage.setItem('auth_debug_refresh_failed', 'true');
            window.location.href = '/login';
            throw new Error("Authentication failed, redirecting to login");
          }
        }
        
        console.log("Token refreshed, retrying data fetch");
      } else {
        throw error;
      }
    }
  }
  
  // TypeScript needs this, but it should never reach here
  throw new Error("Unexpected end of fetch retry loop");
}

/**
 * Helper to detect auth errors
 * Looks for common patterns in error messages related to authentication
 */
function isAuthError(error: any): boolean {
  if (!error) return false;
  
  const msg = extractErrorMessage(error);
  return (
    msg.includes('jwt') ||
    msg.includes('token') ||
    msg.includes('auth') ||
    msg.includes('permission') ||
    msg.includes('credentials') ||
    msg.includes('unauthorized') ||
    msg.includes('access denied') ||
    msg.includes('not authenticated') ||
    msg.includes('session') ||
    msg.includes('login') ||
    msg.includes('sign in')
  );
}

/**
 * Extract error message from various error formats
 */
function extractErrorMessage(error: any): string {
  if (!error) return '';
  
  if (typeof error === 'string') return error.toLowerCase();
  
  // Try various properties where error messages can be found
  const message = error.message || 
                 error.error_description || 
                 error.details || 
                 error.error ||
                 error.msg ||
                 error.code ||
                 '';
                 
  return message.toString().toLowerCase();
}

/**
 * Safely execute a database query with authentication retries
 * @param queryFn Function that performs the database query
 * @returns Promise with query result
 */
export async function executeDbQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  return fetchWithAuthRetry(queryFn);
}
