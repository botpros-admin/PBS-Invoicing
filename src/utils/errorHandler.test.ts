/**
 * Error Handler Test Suite
 * CRITICAL: Ensures proper error handling and logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  ErrorSeverity,
  ErrorCategory,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  NetworkError,
  SecurityError,
  ErrorHandler,
  errorHandler,
  asyncErrorHandler,
  retryWithBackoff
} from './errorHandler';

describe('Error Handler - CRITICAL ERROR MANAGEMENT', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler.clearLog();
  });

  describe('AppError Class', () => {
    it('should create error with all properties', () => {
      const error = new AppError(
        'Test error',
        'TEST_ERROR',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.SYSTEM,
        true,
        { extra: 'data' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.category).toBe(ErrorCategory.SYSTEM);
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({ extra: 'data' });
      expect(error.correlationId).toBeDefined();
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should generate unique correlation IDs', () => {
      const error1 = new AppError('Error 1', 'ERR1');
      const error2 = new AppError('Error 2', 'ERR2');
      
      expect(error1.correlationId).toBeDefined();
      expect(error2.correlationId).toBeDefined();
      expect(error1.correlationId).not.toBe(error2.correlationId);
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError(
        'Test error',
        'TEST_ERROR',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.SYSTEM
      );

      const json = error.toJSON();
      
      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('code', 'TEST_ERROR');
      expect(json).toHaveProperty('statusCode', 500);
      expect(json).toHaveProperty('severity', ErrorSeverity.HIGH);
      expect(json).toHaveProperty('category', ErrorCategory.SYSTEM);
      expect(json).toHaveProperty('correlationId');
      expect(json).toHaveProperty('stack');
    });
  });

  describe('Predefined Error Types', () => {
    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create AuthenticationError correctly', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('should create AuthorizationError correctly', () => {
      const error = new AuthorizationError('Access denied');
      
      expect(error.code).toBe('AUTHZ_ERROR');
      expect(error.statusCode).toBe(403);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
    });

    it('should create NotFoundError correctly', () => {
      const error = new NotFoundError('Invoice');
      
      expect(error.message).toBe('Invoice not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.severity).toBe(ErrorSeverity.LOW);
    });

    it('should create ConflictError correctly', () => {
      const error = new ConflictError('Duplicate entry');
      
      expect(error.code).toBe('CONFLICT');
      expect(error.statusCode).toBe(409);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.category).toBe(ErrorCategory.BUSINESS_LOGIC);
    });

    it('should create RateLimitError correctly', () => {
      const error = new RateLimitError(60);
      
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.statusCode).toBe(429);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(error.details).toEqual({ retryAfter: 60 });
    });

    it('should create DatabaseError correctly', () => {
      const originalError = new Error('Connection failed');
      const error = new DatabaseError('Database unavailable', originalError);
      
      expect(error.code).toBe('DB_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.category).toBe(ErrorCategory.DATABASE);
      expect(error.details).toEqual({ originalError });
    });

    it('should create NetworkError correctly', () => {
      const error = new NetworkError('Request timeout');
      
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.category).toBe(ErrorCategory.NETWORK);
    });

    it('should create SecurityError correctly', () => {
      const error = new SecurityError('Potential SQL injection detected');
      
      expect(error.code).toBe('SECURITY_ERROR');
      expect(error.statusCode).toBe(403);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.category).toBe(ErrorCategory.SECURITY);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('ErrorHandler Singleton', () => {
    it('should return same instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should handle and log AppError', () => {
      const appError = new ValidationError('Test validation error');
      const handled = errorHandler.handle(appError);
      
      expect(handled).toBe(appError);
      expect(errorHandler.getRecentErrors(1)[0]).toBe(appError);
    });

    it('should convert regular Error to AppError', () => {
      const regularError = new Error('Regular error');
      const handled = errorHandler.handle(regularError);
      
      expect(handled).toBeInstanceOf(AppError);
      expect(handled.message).toBe('Regular error');
      expect(handled.code).toBe('UNKNOWN_ERROR');
      expect(handled.statusCode).toBe(500);
    });

    it('should handle Supabase errors correctly', () => {
      const supabaseError = {
        code: '23505',
        message: 'Duplicate key violation'
      };
      
      const handled = errorHandler.handle(supabaseError as any);
      
      expect(handled).toBeInstanceOf(ConflictError);
      expect(handled.message).toBe('Duplicate entry exists');
    });

    it('should handle network errors correctly', () => {
      const fetchError = new TypeError('Failed to fetch');
      const handled = errorHandler.handle(fetchError);
      
      expect(handled).toBeInstanceOf(NetworkError);
      expect(handled.message).toBe('Network request failed');
    });

    it('should maintain error log with max size', () => {
      // Add many errors
      for (let i = 0; i < 1005; i++) {
        errorHandler.handle(new Error(`Error ${i}`));
      }
      
      const recentErrors = errorHandler.getRecentErrors(1000);
      expect(recentErrors.length).toBe(1000);
    });

    it('should get errors by category', () => {
      errorHandler.handle(new ValidationError('Validation 1'));
      errorHandler.handle(new ValidationError('Validation 2'));
      errorHandler.handle(new AuthenticationError('Auth error'));
      
      const validationErrors = errorHandler.getErrorsByCategory(ErrorCategory.VALIDATION);
      expect(validationErrors).toHaveLength(2);
      
      const authErrors = errorHandler.getErrorsByCategory(ErrorCategory.AUTHENTICATION);
      expect(authErrors).toHaveLength(1);
    });

    it('should get errors by severity', () => {
      errorHandler.handle(new ValidationError('Low severity'));
      errorHandler.handle(new AuthenticationError('High severity'));
      errorHandler.handle(new SecurityError('Critical severity'));
      
      const lowErrors = errorHandler.getErrorsBySeverity(ErrorSeverity.LOW);
      expect(lowErrors).toHaveLength(1);
      
      const highErrors = errorHandler.getErrorsBySeverity(ErrorSeverity.HIGH);
      expect(highErrors).toHaveLength(1);
      
      const criticalErrors = errorHandler.getErrorsBySeverity(ErrorSeverity.CRITICAL);
      expect(criticalErrors).toHaveLength(1);
    });

    it('should provide error statistics', () => {
      errorHandler.clearLog();
      
      errorHandler.handle(new ValidationError('Error 1'));
      errorHandler.handle(new AuthenticationError('Error 2'));
      errorHandler.handle(new SecurityError('Error 3'));
      
      const stats = errorHandler.getStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.bySeverity[ErrorSeverity.LOW]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.CRITICAL]).toBe(1);
      expect(stats.operational).toBe(2);
      expect(stats.programming).toBe(1);
    });
  });

  describe('Error Listeners', () => {
    it('should notify listeners when error occurs', () => {
      const listener = vi.fn();
      errorHandler.addListener(listener);
      
      const error = new ValidationError('Test error');
      errorHandler.handle(error);
      
      expect(listener).toHaveBeenCalledWith(error);
    });

    it('should remove listeners', () => {
      const listener = vi.fn();
      errorHandler.addListener(listener);
      errorHandler.removeListener(listener);
      
      errorHandler.handle(new ValidationError('Test error'));
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const badListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();
      
      errorHandler.addListener(badListener);
      errorHandler.addListener(goodListener);
      
      const error = new ValidationError('Test error');
      errorHandler.handle(error);
      
      expect(badListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('asyncErrorHandler - CRITICAL FOR ASYNC OPERATIONS', () => {
    it('should handle successful async operations', async () => {
      const asyncFn = async () => 'success';
      const [result, error] = await asyncErrorHandler(asyncFn);
      
      expect(result).toBe('success');
      expect(error).toBe(null);
    });

    it('should handle failed async operations', async () => {
      const asyncFn = async () => {
        throw new Error('Async error');
      };
      
      const [result, error] = await asyncErrorHandler(asyncFn);
      
      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(AppError);
      expect(error?.message).toBe('Async error');
    });

    it('should use default value on error', async () => {
      const asyncFn = async () => {
        throw new Error('Async error');
      };
      
      const [result, error] = await asyncErrorHandler(asyncFn, 'default');
      
      expect(result).toBe('default');
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('retryWithBackoff - CRITICAL FOR NETWORK RESILIENCE', () => {
    it('should succeed on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(fn, 3, 10);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(fn, 3, 10);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow('Always fails');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-operational errors', async () => {
      const securityError = new SecurityError('Security breach');
      const fn = vi.fn().mockRejectedValue(securityError);
      
      await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow(securityError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await retryWithBackoff(fn, 3, 100);
      const endTime = Date.now();
      
      // Should take at least 100 + 200 = 300ms (minus some execution time)
      expect(endTime - startTime).toBeGreaterThanOrEqual(250);
    });
  });

  describe('Supabase Error Mapping', () => {
    const testCases = [
      { code: '23505', expectedType: ConflictError, expectedMessage: 'Duplicate entry exists' },
      { code: '23503', expectedType: ValidationError, expectedMessage: 'Referenced record does not exist' },
      { code: '23502', expectedType: ValidationError, expectedMessage: 'Required field is missing' },
      { code: '42501', expectedType: AuthorizationError, expectedMessage: 'Insufficient database privileges' },
      { code: '42P01', expectedType: DatabaseError, expectedMessage: 'Database table does not exist' },
      { code: 'PGRST301', expectedType: AuthenticationError, expectedMessage: 'JWT token is missing' },
      { code: 'PGRST302', expectedType: AuthenticationError, expectedMessage: 'JWT token is invalid' },
      { code: '57014', expectedType: DatabaseError, expectedMessage: 'Query cancelled due to timeout' },
    ];

    testCases.forEach(({ code, expectedType, expectedMessage }) => {
      it(`should map Supabase error code ${code} correctly`, () => {
        const supabaseError = { code, message: 'Original message' };
        const handled = errorHandler.handle(supabaseError as any);
        
        expect(handled).toBeInstanceOf(expectedType);
        expect(handled.message).toBe(expectedMessage);
      });
    });

    it('should handle auth-related messages', () => {
      const authError = { code: 'UNKNOWN', message: 'Authentication failed' };
      const handled = errorHandler.handle(authError as any);
      
      expect(handled).toBeInstanceOf(AuthenticationError);
    });

    it('should handle rate limit messages', () => {
      const rateLimitError = { code: 'UNKNOWN', message: 'Rate limit exceeded' };
      const handled = errorHandler.handle(rateLimitError as any);
      
      expect(handled).toBeInstanceOf(RateLimitError);
    });
  });
});