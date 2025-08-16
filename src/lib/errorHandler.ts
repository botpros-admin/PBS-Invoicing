/**
 * Global error handling system for PBS Invoicing
 * Provides centralized error management and recovery strategies
 */

import { logger } from './logger';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  PAYMENT = 'payment',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

export interface AppError extends Error {
  code?: string;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  statusCode?: number;
  details?: any;
  userMessage?: string;
  recoverable?: boolean;
  retryable?: boolean;
  retryAfter?: number;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCallbacks: Map<string, (error: AppError) => void> = new Map();

  private constructor() {
    this.setupGlobalHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalHandlers() {
    // Browser global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleError(new Error(event.message), {
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.HIGH,
          details: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(new Error(event.reason), {
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.HIGH,
          details: { reason: event.reason },
        });
      });
    }

    // Node.js global error handlers
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.handleError(error, {
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.CRITICAL,
        });
      });

      process.on('unhandledRejection', (reason, promise) => {
        this.handleError(new Error(String(reason)), {
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.CRITICAL,
          details: { promise },
        });
      });
    }
  }

  /**
   * Main error handling method
   */
  handleError(error: Error | AppError, options?: Partial<AppError>): AppError {
    const appError: AppError = {
      ...error,
      name: error.name || 'AppError',
      message: error.message || 'An unexpected error occurred',
      stack: error.stack,
      code: (error as AppError).code || 'UNKNOWN_ERROR',
      severity: (error as AppError).severity || options?.severity || ErrorSeverity.MEDIUM,
      category: (error as AppError).category || options?.category || ErrorCategory.UNKNOWN,
      statusCode: (error as AppError).statusCode || options?.statusCode || 500,
      details: { ...(error as AppError).details, ...options?.details },
      userMessage: (error as AppError).userMessage || options?.userMessage || this.getUserMessage(error),
      recoverable: (error as AppError).recoverable ?? options?.recoverable ?? true,
      retryable: (error as AppError).retryable ?? options?.retryable ?? false,
      retryAfter: (error as AppError).retryAfter || options?.retryAfter,
    };

    // Log the error
    logger.error(appError.message, appError, {
      component: 'ErrorHandler',
      metadata: {
        code: appError.code,
        category: appError.category,
        severity: appError.severity,
        recoverable: appError.recoverable,
      },
    });

    // Execute registered callbacks
    this.errorCallbacks.forEach(callback => callback(appError));

    // Handle based on severity
    this.handleBySeverity(appError);

    return appError;
  }

  private handleBySeverity(error: AppError) {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        // Critical errors might require immediate action
        this.notifyAdministrators(error);
        if (!error.recoverable) {
          this.initiateGracefulShutdown(error);
        }
        break;
      case ErrorSeverity.HIGH:
        // High severity errors should be monitored closely
        this.sendToMonitoring(error);
        break;
      case ErrorSeverity.MEDIUM:
        // Medium severity errors are logged and tracked
        break;
      case ErrorSeverity.LOW:
        // Low severity errors are just logged
        break;
    }
  }

  private getUserMessage(error: Error): string {
    // Provide user-friendly messages based on error type
    const errorMessages: Record<string, string> = {
      NETWORK_ERROR: 'Connection failed. Please check your internet connection.',
      AUTHENTICATION_ERROR: 'Please sign in to continue.',
      AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
      VALIDATION_ERROR: 'Please check your input and try again.',
      PAYMENT_ERROR: 'Payment processing failed. Please try again.',
      DATABASE_ERROR: 'Unable to save data. Please try again.',
      RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment.',
      DEFAULT: 'Something went wrong. Please try again.',
    };

    const code = (error as AppError).code || 'DEFAULT';
    return errorMessages[code] || errorMessages.DEFAULT;
  }

  private notifyAdministrators(error: AppError) {
    // In production, send critical error notifications
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement email/SMS/Slack notifications
      logger.error('CRITICAL ERROR - Administrator notification required', error);
    }
  }

  private sendToMonitoring(error: AppError) {
    // Send to external monitoring service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'error', {
        error_category: error.category,
        error_severity: error.severity,
        error_code: error.code,
      });
    }
  }

  private initiateGracefulShutdown(error: AppError) {
    logger.error('Initiating graceful shutdown due to critical error', error);
    // TODO: Implement graceful shutdown logic
  }

  /**
   * Register a callback to be executed when errors occur
   */
  registerErrorCallback(id: string, callback: (error: AppError) => void) {
    this.errorCallbacks.set(id, callback);
  }

  /**
   * Unregister an error callback
   */
  unregisterErrorCallback(id: string) {
    this.errorCallbacks.delete(id);
  }

  /**
   * Create standardized API error responses
   */
  createApiError(
    message: string,
    statusCode: number = 500,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    details?: any
  ): AppError {
    const error: AppError = new Error(message) as AppError;
    error.statusCode = statusCode;
    error.category = category;
    error.details = details;
    error.severity = statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
    error.retryable = statusCode >= 500 || statusCode === 429;
    
    if (statusCode === 429) {
      error.retryAfter = 60000; // Retry after 1 minute for rate limits
    }

    return error;
  }

  /**
   * Handle database errors specifically
   */
  handleDatabaseError(error: any): AppError {
    const dbError: AppError = new Error(error.message) as AppError;
    dbError.category = ErrorCategory.DATABASE;
    dbError.code = error.code;
    
    // Handle specific database error codes
    if (error.code === '23505') {
      dbError.userMessage = 'This record already exists.';
      dbError.severity = ErrorSeverity.LOW;
    } else if (error.code === '23503') {
      dbError.userMessage = 'Related record not found.';
      dbError.severity = ErrorSeverity.MEDIUM;
    } else {
      dbError.userMessage = 'Database operation failed. Please try again.';
      dbError.severity = ErrorSeverity.HIGH;
    }

    dbError.retryable = true;
    return this.handleError(dbError);
  }

  /**
   * Handle payment errors with special care
   */
  handlePaymentError(error: any, paymentId?: string, amount?: number): AppError {
    const paymentError: AppError = new Error(error.message) as AppError;
    paymentError.category = ErrorCategory.PAYMENT;
    paymentError.severity = ErrorSeverity.HIGH;
    paymentError.code = error.code || 'PAYMENT_ERROR';
    paymentError.details = {
      paymentId,
      amount,
      originalError: error,
    };

    // Payment errors should never be automatically retried
    paymentError.retryable = false;
    paymentError.recoverable = true;
    paymentError.userMessage = 'Payment processing failed. Please review and try again.';

    // Log payment errors with special attention
    logger.logPaymentAction('payment_error', amount || 0, paymentId || 'unknown', {
      metadata: { error: error.message },
    });

    return this.handleError(paymentError);
  }

  /**
   * Wrap async functions with error handling
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options?: Partial<AppError>
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        throw this.handleError(error as Error, options);
      }
    }) as T;
  }

  /**
   * Create a retry mechanism for retryable errors
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoff: number = 1000
  ): Promise<T> {
    let lastError: AppError | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.handleError(error as Error);
        
        if (!lastError.retryable || i === maxRetries - 1) {
          throw lastError;
        }

        const delay = lastError.retryAfter || backoff * Math.pow(2, i);
        logger.info(`Retrying operation after ${delay}ms (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

export const errorHandler = ErrorHandler.getInstance();
export default errorHandler;