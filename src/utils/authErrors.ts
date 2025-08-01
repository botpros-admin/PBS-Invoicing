/**
 * Utility for handling authentication-related errors and providing consistent error messages
 */

interface ErrorMap {
  [key: string]: string;
}

// Map of Supabase error codes to user-friendly messages
const AUTH_ERROR_MESSAGES: ErrorMap = {
  'auth/invalid-email': 'The email address is invalid.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'The password is too weak. Use at least 8 characters including numbers and symbols.',
  'auth/requires-recent-login': 'This operation requires you to re-login. Please log out and sign in again.',
  'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
  'auth/mfa-required': 'Multi-factor authentication is required to sign in.',
  'auth/invalid-mfa-code': 'Invalid verification code. Please try again.',
  'auth/too-many-requests': 'Too many unsuccessful login attempts. Please try again later.',
  'auth/email-not-verified': 'Please verify your email address before logging in.',
};

// Map of MFA-specific error messages
const MFA_ERROR_MESSAGES: ErrorMap = {
  'mfa/setup-failed': 'Failed to set up MFA. Please try again.',
  'mfa/verification-failed': 'Verification failed. Please check your code and try again.',
  'mfa/code-expired': 'Verification code has expired. Please request a new one.',
  'mfa/invalid-factor': 'The authentication method is invalid or has been disabled.',
};

/**
 * Format an authentication error message to be user-friendly
 * @param error - The error object or message from Supabase
 * @returns A user-friendly error message
 */
export function formatAuthError(error: any): string {
  // Handle error objects
  if (error && typeof error === 'object') {
    // Handle Supabase error object
    if (error.code) {
      // Check for known error codes
      const errorMessage = AUTH_ERROR_MESSAGES[error.code] || MFA_ERROR_MESSAGES[error.code];
      if (errorMessage) {
        return errorMessage;
      }
      
      // If no mapped message but has a message property, use that
      if (error.message) {
        return error.message;
      }
    }
    
    // Handle Error instances with message property
    if (error instanceof Error) {
      return error.message;
    }
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    // Check for known error message patterns
    if (error.includes('credentials')) {
      return 'Invalid credentials. Please check your email and password.';
    }
    
    if (error.includes('auth') && error.includes('token')) {
      return 'Your session has expired. Please log in again.';
    }
    
    return error;
  }
  
  // Default error message if we can't parse the error
  return 'An authentication error occurred. Please try again.';
}

/**
 * Check if an error is related to MFA
 * @param error - The error object or message from Supabase
 * @returns True if the error is MFA-related
 */
export function isMfaError(error: any): boolean {
  if (!error) return false;
  
  // Check error code
  if (error.code && (
    error.code === 'auth/mfa-required' || 
    error.code.startsWith('mfa/')
  )) {
    return true;
  }
  
  // Check error message
  if (error.message && (
    error.message.toLowerCase().includes('mfa') ||
    error.message.toLowerCase().includes('factor') ||
    error.message.toLowerCase().includes('verification')
  )) {
    return true;
  }
  
  // Check if it's a string
  if (typeof error === 'string' && (
    error.toLowerCase().includes('mfa') ||
    error.toLowerCase().includes('factor') ||
    error.toLowerCase().includes('verification')
  )) {
    return true;
  }
  
  return false;
}

/**
 * Check if an error is related to permissions or access control
 * @param error - The error object or message from Supabase
 * @returns True if the error is permission-related
 */
export function isPermissionError(error: any): boolean {
  if (!error) return false;
  
  // Check error code
  if (error.code && (
    error.code === 'auth/insufficient-permissions' ||
    error.code === 'permission-denied' ||
    error.code === '403'
  )) {
    return true;
  }
  
  // Check error message
  if (error.message && (
    error.message.toLowerCase().includes('permission') ||
    error.message.toLowerCase().includes('access denied') ||
    error.message.toLowerCase().includes('not authorized') ||
    error.message.toLowerCase().includes('forbidden')
  )) {
    return true;
  }
  
  // Check if it's a string
  if (typeof error === 'string' && (
    error.toLowerCase().includes('permission') ||
    error.toLowerCase().includes('access denied') ||
    error.toLowerCase().includes('not authorized') ||
    error.toLowerCase().includes('forbidden')
  )) {
    return true;
  }
  
  return false;
}
