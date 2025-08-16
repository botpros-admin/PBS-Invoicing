/**
 * Comprehensive Error Handling System
 * Centralized error management for the PBS Invoicing application
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SecurityConfig } from '../config/security';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  SECURITY = 'security',
  RATE_LIMIT = 'rate_limit',
  FILE_UPLOAD = 'file_upload',
  EXTERNAL_API = 'external_api'
}

/**
 * Custom error class with enhanced properties
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly isOperational: boolean;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.category = category;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();
    this.correlationId = this.generateCorrelationId();

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      severity: this.severity,
      category: this.category,
      isOperational: this.isOperational,
      details: this.details,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      stack: this.stack
    };
  }
}

/**
 * Predefined error types for common scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      ErrorSeverity.LOW,
      ErrorCategory.VALIDATION,
      true,
      details
    );
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(
      message,
      'AUTH_ERROR',
      401,
      ErrorSeverity.HIGH,
      ErrorCategory.AUTHENTICATION,
      true
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(
      message,
      'AUTHZ_ERROR',
      403,
      ErrorSeverity.HIGH,
      ErrorCategory.AUTHORIZATION,
      true
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(
      `${resource} not found`,
      'NOT_FOUND',
      404,
      ErrorSeverity.LOW,
      ErrorCategory.DATABASE,
      true
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(
      message,
      'CONFLICT',
      409,
      ErrorSeverity.MEDIUM,
      ErrorCategory.BUSINESS_LOGIC,
      true
    );
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT',
      429,
      ErrorSeverity.MEDIUM,
      ErrorCategory.RATE_LIMIT,
      true,
      { retryAfter }
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(
      message,
      'DB_ERROR',
      500,
      ErrorSeverity.HIGH,
      ErrorCategory.DATABASE,
      true,
      { originalError }
    );
  }
}

export class NetworkError extends AppError {
  constructor(message: string, originalError?: any) {
    super(
      message,
      'NETWORK_ERROR',
      503,
      ErrorSeverity.HIGH,
      ErrorCategory.NETWORK,
      true,
      { originalError }
    );
  }
}

export class SecurityError extends AppError {
  constructor(message: string) {
    super(
      message,
      'SECURITY_ERROR',
      403,
      ErrorSeverity.CRITICAL,
      ErrorCategory.SECURITY,
      false
    );
  }
}

/**
 * Error handler singleton class
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];
  private readonly maxLogSize = 1000;
  private errorListeners: ((error: AppError) => void)[] = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and process errors
   */
  handle(error: Error | AppError): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else {
      // Convert regular errors to AppError
      appError = this.normalizeError(error);
    }

    // Log the error
    this.logError(appError);

    // Notify listeners
    this.notifyListeners(appError);

    // Handle based on severity
    this.handleBySeverity(appError);

    return appError;
  }

  /**
   * Convert various error types to AppError
   */
  private normalizeError(error: any): AppError {
    // Handle Supabase errors
    if (error?.code && error?.message) {
      return this.handleSupabaseError(error);
    }

    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new NetworkError('Network request failed', error);
    }

    // Handle syntax errors
    if (error instanceof SyntaxError) {
      return new AppError(
        'Invalid data format',
        'SYNTAX_ERROR',
        400,
        ErrorSeverity.MEDIUM,
        ErrorCategory.VALIDATION,
        true,
        { originalError: error.message }
      );
    }

    // Default error handling
    return new AppError(
      error?.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      500,
      ErrorSeverity.HIGH,
      ErrorCategory.SYSTEM,
      false,
      { originalError: error }
    );
  }

  /**
   * Handle Supabase-specific errors
   */
  private handleSupabaseError(error: any): AppError {
    const errorMap: Record<string, () => AppError> = {
      '23505': () => new ConflictError('Duplicate entry exists'),
      '23503': () => new ValidationError('Referenced record does not exist'),
      '23502': () => new ValidationError('Required field is missing'),
      '42501': () => new AuthorizationError('Insufficient database privileges'),
      '42P01': () => new DatabaseError('Database table does not exist'),
      'PGRST301': () => new AuthenticationError('JWT token is missing'),
      'PGRST302': () => new AuthenticationError('JWT token is invalid'),
      '57014': () => new DatabaseError('Query cancelled due to timeout'),
    };

    const handler = errorMap[error.code];
    if (handler) {
      return handler();
    }

    // Handle auth errors
    if (error.message?.toLowerCase().includes('auth')) {
      return new AuthenticationError(error.message);
    }

    // Handle rate limit errors
    if (error.message?.toLowerCase().includes('rate limit')) {
      return new RateLimitError();
    }

    return new DatabaseError(error.message || 'Database operation failed', error);
  }

  /**
   * Log errors to internal buffer
   */
  private logError(error: AppError): void {
    this.errorLog.push(error);

    // Maintain max log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorHandler]', error.toJSON());
    }
  }

  /**
   * Handle errors based on severity
   */
  private handleBySeverity(error: AppError): void {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        // In production, you might want to send alerts
        console.error('CRITICAL ERROR:', error);
        // Could integrate with monitoring service
        break;
      case ErrorSeverity.HIGH:
        console.error('HIGH SEVERITY ERROR:', error);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('MEDIUM SEVERITY ERROR:', error);
        break;
      case ErrorSeverity.LOW:
        console.log('LOW SEVERITY ERROR:', error);
        break;
    }
  }

  /**
   * Register error listener
   */
  addListener(listener: (error: AppError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  removeListener(listener: (error: AppError) => void): void {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  /**
   * Notify all registered listeners
   */
  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.errorLog.filter(e => e.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorLog.filter(e => e.severity === severity);
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const stats = {
      total: this.errorLog.length,
      bySeverity: {} as Record<ErrorSeverity, number>,
      byCategory: {} as Record<ErrorCategory, number>,
      operational: 0,
      programming: 0
    };

    // Initialize counters
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });

    // Count errors
    this.errorLog.forEach(error => {
      stats.bySeverity[error.severity]++;
      stats.byCategory[error.category]++;
      if (error.isOperational) {
        stats.operational++;
      } else {
        stats.programming++;
      }
    });

    return stats;
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = ErrorHandler.getInstance();

// React-specific error boundary helper has been moved to components/ErrorBoundary.tsx
// This keeps the error handler utility pure and framework-agnostic

/**
 * Async error wrapper utility
 */
export async function asyncErrorHandler<T>(
  fn: () => Promise<T>,
  defaultValue?: T
): Promise<[T | undefined, AppError | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    const appError = errorHandler.handle(error as Error);
    return [defaultValue, appError];
  }
}

/**
 * Express/API error middleware helper
 */
export function apiErrorHandler(
  error: Error | AppError,
  req: any,
  res: any,
  next: any
): void {
  const appError = errorHandler.handle(error);

  // Send appropriate response
  res.status(appError.statusCode).json({
    error: {
      message: appError.message,
      code: appError.code,
      correlationId: appError.correlationId,
      ...(process.env.NODE_ENV === 'development' && {
        details: appError.details,
        stack: appError.stack
      })
    }
  });
}

/**
 * Retry mechanism for transient failures
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry non-operational errors
      if (error instanceof AppError && !error.isOperational) {
        throw error;
      }

      // Calculate exponential backoff
      const delay = initialDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export default errorHandler;