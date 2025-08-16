/**
 * API Error Interceptor
 * Global error handling for all API calls
 */

import { supabase } from '../api/supabase';
import { 
  errorHandler, 
  AppError, 
  AuthenticationError, 
  AuthorizationError,
  NetworkError,
  RateLimitError,
  DatabaseError 
} from './errorHandler';

/**
 * Response interceptor for handling API errors globally
 */
export class ApiErrorInterceptor {
  private static isSetup = false;
  private static retryQueue: Map<string, number> = new Map();
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // Base delay in ms

  /**
   * Setup global error interceptors
   */
  static setup(): void {
    if (this.isSetup) {
      return;
    }

    this.setupSupabaseInterceptor();
    this.setupFetchInterceptor();
    this.setupUnhandledRejectionHandler();
    
    this.isSetup = true;
    console.log('[ApiErrorInterceptor] Global error handling initialized');
  }

  /**
   * Setup Supabase error interceptor
   */
  private static setupSupabaseInterceptor(): void {
    // Monitor auth state changes for auth errors
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('[ApiErrorInterceptor] User signed out');
        // Clear any cached data
        this.retryQueue.clear();
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('[ApiErrorInterceptor] Token refreshed successfully');
      }
      
      if (event === 'USER_UPDATED') {
        console.log('[ApiErrorInterceptor] User data updated');
      }
    });
  }

  /**
   * Setup global fetch interceptor
   */
  private static setupFetchInterceptor(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args): Promise<Response> => {
      const [resource, config] = args;
      const url = typeof resource === 'string' ? resource : resource.url;
      
      try {
        // Add request ID for tracking
        const requestId = this.generateRequestId();
        const enhancedConfig = {
          ...config,
          headers: {
            ...config?.headers,
            'X-Request-ID': requestId,
          },
        };
        
        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Request] ${config?.method || 'GET'} ${url}`, { requestId });
        }
        
        // Make the actual request
        const response = await originalFetch(resource, enhancedConfig);
        
        // Handle response based on status
        if (!response.ok) {
          await this.handleHttpError(response, url, requestId);
        }
        
        return response;
      } catch (error) {
        // Handle network errors
        return this.handleNetworkError(error, url, args);
      }
    };
  }

  /**
   * Handle HTTP errors based on status code
   */
  private static async handleHttpError(
    response: Response,
    url: string,
    requestId: string
  ): Promise<void> {
    const status = response.status;
    let errorBody;
    
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[API Error] ${status} ${url}`, { requestId, errorBody });
    }
    
    // Handle specific status codes
    switch (status) {
      case 401:
        // Unauthorized - try to refresh token
        await this.handleAuthError();
        throw new AuthenticationError(errorBody?.message || 'Session expired');
        
      case 403:
        // Forbidden
        throw new AuthorizationError(errorBody?.message || 'Access denied');
        
      case 429:
        // Rate limited
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
        
      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        throw new DatabaseError(
          errorBody?.message || `Server error: ${status}`,
          errorBody
        );
        
      default:
        // Other errors
        throw new AppError(
          errorBody?.message || `Request failed: ${status}`,
          `HTTP_${status}`,
          status
        );
    }
  }

  /**
   * Handle network errors with retry logic
   */
  private static async handleNetworkError(
    error: any,
    url: string,
    originalArgs: any[]
  ): Promise<Response> {
    const retryKey = `${url}_${Date.now()}`;
    const retryCount = this.retryQueue.get(retryKey) || 0;
    
    if (retryCount < this.MAX_RETRIES) {
      // Increment retry count
      this.retryQueue.set(retryKey, retryCount + 1);
      
      // Calculate exponential backoff
      const delay = this.RETRY_DELAY * Math.pow(2, retryCount);
      
      console.log(
        `[ApiErrorInterceptor] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request
      try {
        const response = await window.fetch(...originalArgs);
        // Success - clear retry count
        this.retryQueue.delete(retryKey);
        return response;
      } catch (retryError) {
        // Retry failed, continue with error handling
        return this.handleNetworkError(retryError, url, originalArgs);
      }
    }
    
    // Max retries exceeded
    this.retryQueue.delete(retryKey);
    
    const networkError = new NetworkError(
      'Network request failed after multiple retries',
      error
    );
    
    errorHandler.handle(networkError);
    throw networkError;
  }

  /**
   * Handle authentication errors
   */
  private static async handleAuthError(): Promise<void> {
    try {
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[ApiErrorInterceptor] Failed to refresh session:', error);
        // Redirect to login
        window.location.href = '/login';
      } else if (data.session) {
        console.log('[ApiErrorInterceptor] Session refreshed successfully');
      }
    } catch (error) {
      console.error('[ApiErrorInterceptor] Error refreshing session:', error);
      // Redirect to login
      window.location.href = '/login';
    }
  }

  /**
   * Setup unhandled rejection handler
   */
  private static setupUnhandledRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[ApiErrorInterceptor] Unhandled promise rejection:', event.reason);
      
      // Handle the error
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      const appError = errorHandler.handle(error);
      
      // Show user-friendly notification for operational errors
      if (appError.isOperational) {
        this.showErrorNotification(appError);
      }
      
      // Prevent default browser behavior
      event.preventDefault();
    });
  }

  /**
   * Show error notification to user
   */
  private static showErrorNotification(error: AppError): void {
    // Check if a notification system exists
    const notificationContainer = document.getElementById('error-notifications');
    
    if (notificationContainer) {
      const notification = document.createElement('div');
      notification.className = 'error-notification';
      notification.innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">${error.message}</p>
              ${error.correlationId ? `<p class="text-xs text-red-600 mt-1">Error ID: ${error.correlationId}</p>` : ''}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-red-400 hover:text-red-600">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      `;
      
      notificationContainer.appendChild(notification);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        notification.remove();
      }, 5000);
    }
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Manual error reporting
   */
  static reportError(error: Error | AppError, context?: any): void {
    const appError = errorHandler.handle(error);
    
    // Log additional context
    if (context) {
      console.error('[ApiErrorInterceptor] Error context:', context);
    }
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, etc.
      // sendToErrorTracking(appError, context);
    }
  }

  /**
   * Clear all retry queues and reset state
   */
  static reset(): void {
    this.retryQueue.clear();
    console.log('[ApiErrorInterceptor] Reset complete');
  }
}

/**
 * Initialize error interceptor on module load
 */
if (typeof window !== 'undefined') {
  ApiErrorInterceptor.setup();
}

export default ApiErrorInterceptor;