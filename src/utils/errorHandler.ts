import { PostgrestError } from '@supabase/supabase-js';

export interface ApiError extends Error {
  code?: string;
  status?: number;
  details?: any;
}

/**
 * Parse and format Supabase/PostgreSQL errors into user-friendly messages
 */
export function parseSupabaseError(error: any): string {
  // Handle PostgrestError
  if (error?.code) {
    switch (error.code) {
      // Authentication errors
      case 'invalid_credentials':
        return 'Invalid email or password. Please try again.';
      case 'email_not_confirmed':
        return 'Please confirm your email address before signing in.';
      case 'user_not_found':
        return 'No account found with this email address.';
      
      // Authorization errors  
      case '42501':
        return 'You do not have permission to perform this action.';
      case 'PGRST301':
        return 'Your session has expired. Please sign in again.';
      
      // Database constraint errors
      case '23505':
        return 'This record already exists. Please use a different value.';
      case '23503':
        return 'Cannot complete this action due to related records.';
      case '23502':
        return 'Required information is missing. Please fill in all required fields.';
      case '23514':
        return 'The provided data does not meet the required format.';
      
      // Network errors
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection.';
      case 'TIMEOUT':
        return 'The request took too long. Please try again.';
      
      default:
        if (error.message?.includes('duplicate key')) {
          return 'This item already exists. Please use a different identifier.';
        }
        if (error.message?.includes('violates foreign key')) {
          return 'This action references data that does not exist.';
        }
        if (error.message?.includes('JWT')) {
          return 'Authentication error. Please sign in again.';
        }
        break;
    }
  }

  // Handle HTTP status codes
  if (error?.status) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'You are not authenticated. Please sign in.';
      case 403:
        return 'You do not have permission to access this resource.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        return 'The provided data is invalid. Please check and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'An internal server error occurred. Please try again later.';
      case 502:
      case 503:
        return 'The service is temporarily unavailable. Please try again later.';
      default:
        if (error.status >= 400 && error.status < 500) {
          return 'There was a problem with your request. Please try again.';
        }
        if (error.status >= 500) {
          return 'A server error occurred. Please try again later.';
        }
    }
  }

  // Default fallback
  return error?.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Create a standardized API error object
 */
export function createApiError(
  message: string,
  code?: string,
  status?: number,
  details?: any
): ApiError {
  const error = new Error(message) as ApiError;
  error.code = code;
  error.status = status;
  error.details = details;
  return error;
}

/**
 * Log errors with context for debugging
 */
export function logError(
  error: any,
  context: string,
  additionalData?: Record<string, any>
): void {
  const errorInfo = {
    message: error?.message || 'Unknown error',
    code: error?.code,
    status: error?.status,
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };

  // In development, log to console
  if (import.meta.env.DEV) {
    console.error(`[${context}] Error:`, errorInfo);
  }

  // In production, you might want to send to an error tracking service
  // Example: Sentry, LogRocket, etc.
  // if (import.meta.env.PROD) {
  //   sendToErrorTracker(errorInfo);
  // }
}

/**
 * Retry logic for transient failures
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoff: number = 2
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        throw error;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, i)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Format error messages for form validation
 */
export function formatValidationErrors(errors: Record<string, string[]>): string {
  const messages = Object.entries(errors)
    .map(([field, fieldErrors]) => {
      const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `${fieldName}: ${fieldErrors.join(', ')}`;
    })
    .join('\n');
  
  return messages || 'Please check your input and try again.';
}
