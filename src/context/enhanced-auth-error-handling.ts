/**
 * Enhanced Authentication Error Handling
 * 
 * This module provides utilities to handle authentication errors,
 * particularly the infinite recursion issue in Supabase RLS policies.
 */

// Known error messages that indicate RLS policy issues
const RLS_ERROR_PATTERNS = [
  'infinite recursion detected in policy',
  'recursive reference to policy',
  'maximum stack depth exceeded',
  'policy execution failed',
  'policies_expr', // Error in Postgres policy expression
  'violated row-level security policy',
  'permission denied',
  'policy for relation',
  'access control',
  'row-level'
];

// Additional authentication error patterns (expanded)
const AUTH_ERROR_PATTERNS = [
  'jwt',
  'JWT',
  'invalid token',
  'invalid signature',
  'auth/invalid',
  'session expired',
  'not authorized',
  'cannot authorize',
  'unauthorized',
  'not authenticated',
  'authentication required',
  '401',
  'token expired',
  'invalid session',
  'claims'
];

// Database record error patterns
const DATABASE_ERROR_PATTERNS = [
  'not found in database',
  'record not found',
  'does not exist',
  'violates constraint',
  'duplicate key',
  'no such table',
  'no such column',
  'null value',
  'invalid input'
];

/**
 * Check if an error is related to RLS policy recursion
 */
export function isRlsRecursionError(error: any): boolean {
  if (!error) return false;
  
  // Extract error message from different possible formats
  const errorMessage = typeof error === 'string' 
    ? error 
    : error.message || error.error_description || error.details || '';

  return RLS_ERROR_PATTERNS.some(pattern => errorMessage.includes(pattern));
}

/**
 * Check if an error is related to authentication issues
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  // Extract error message from different possible formats
  const errorMessage = typeof error === 'string' 
    ? error 
    : error.message || error.error_description || error.details || '';

  return AUTH_ERROR_PATTERNS.some(pattern => errorMessage.includes(pattern));
}

/**
 * Check if an error is related to database record issues
 */
export function isDatabaseRecordError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = extractErrorMessage(error);
  return DATABASE_ERROR_PATTERNS.some(pattern => errorMessage.includes(pattern));
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
 * For HIPAA compliance, we should NOT use fallback authentication
 * This function is deprecated and will always throw an error
 */
export function createFallbackUserObject(authUser: unknown, email: string): never {
  console.error(
    `SECURITY ALERT: Authentication/database error for user ${email}. ` +
    `For HIPAA compliance, no fallback access is permitted.`
  );
  
  // For all users, throw error to fail securely - no fallbacks for HIPAA
  throw new Error('Authentication failed: Unable to verify user role. For security reasons, login has been rejected.');
}

/**
 * Safely handle authentication state loading with enhanced error handling
 * This implementation prioritizes security for HIPAA compliance
 * 
 * @param getCurrentUserFn - The function to get current user data
 * @param authUser - The authenticated user from Supabase auth
 */
export async function safelyLoadUserProfile(
  getCurrentUserFn: () => Promise<any>,
  authUser: any
): Promise<any> {
  try {
    // Always try to get user profile from database first
    return await getCurrentUserFn();
  } catch (error) {
    console.error(`Profile load error: ${extractErrorMessage(error)}`);
    
    // Try direct database query first as a last attempt - without making assumptions about admin status
    if (authUser && authUser.email) {
      try {
        console.warn(`Authentication error for ${authUser.email}. Attempting direct database query as last resort.`);
        
        // Import supabase client for direct query
        const { supabase } = await import('../api/supabase');
        
        // Try direct database query by email
        const { data, error: queryError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authUser.id)
          .single();
        
        if (data && !queryError) {
          console.log('User found directly in database:', data.email);
          return {
            id: data.id,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email.split('@')[0],
            email: data.email,
            role: data.role, // Use actual role from database
            status: data.status || 'active',
            mfaEnabled: false,
            createdAt: data.created_at || new Date().toISOString(),
            updatedAt: data.updated_at || new Date().toISOString(),
            lastLoginAt: authUser.last_sign_in_at || new Date().toISOString(),
          };
        }
      } catch (directQueryError) {
        console.error('Failed direct database query:', directQueryError);
      }
    }
    
    // For non-admins or other errors, fail securely
    console.error(`Authentication failed for user ${authUser?.email || 'unknown'}: ${extractErrorMessage(error)}`);
    throw new Error('Authentication failed: Unable to verify user access. For security reasons, access has been denied.');
  }
}

/**
 * Utility to respect user privileges from the database
 * @param user - The user object from the database
 * @returns The unmodified user object (admin rights come from the database)
 */
export function enforceAdminRights(user: any): any {
  if (!user) return user;
  
  // Simply respect the role from database - no more client-side override
  return user;
}
