import { supabase } from '../api/supabase';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Secure wrapper for Supabase database operations
 * Ensures authentication before making any database calls
 */
export class SecureSupabaseClient {
  /**
   * Check if user is authenticated
   */
  private static async ensureAuthenticated(): Promise<boolean> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.error('Authentication required for this operation');
      throw new Error('You must be logged in to perform this action');
    }
    
    return true;
  }

  /**
   * Secure wrapper for table operations
   */
  static async from<T = any>(table: string) {
    await this.ensureAuthenticated();
    return supabase.from<T>(table);
  }

  /**
   * Secure wrapper for RPC calls
   */
  static async rpc<T = any>(
    fn: string,
    args?: any,
    options?: {
      head?: boolean;
      count?: 'exact' | 'planned' | 'estimated';
    }
  ) {
    await this.ensureAuthenticated();
    return supabase.rpc<T>(fn, args, options);
  }

  /**
   * Secure wrapper for storage operations
   */
  static storage = {
    from: async (bucket: string) => {
      await SecureSupabaseClient.ensureAuthenticated();
      return supabase.storage.from(bucket);
    }
  };

  /**
   * Auth operations (these don't need authentication check)
   */
  static auth = supabase.auth;
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent SQL injection
   * Note: Supabase already uses parameterized queries, but extra validation doesn't hurt
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Remove any SQL keywords and special characters
    return input
      .replace(/[;<>]/g, '') // Remove dangerous characters
      .trim()
      .slice(0, 1000); // Limit length to prevent DOS
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: any): number {
    const num = parseFloat(input);
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid numeric input');
    }
    return num;
  }

  /**
   * Sanitize boolean input
   */
  static sanitizeBoolean(input: any): boolean {
    return input === true || input === 'true';
  }

  /**
   * Sanitize UUID input
   */
  static sanitizeUUID(input: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(input)) {
      throw new Error('Invalid UUID format');
    }
    return input.toLowerCase();
  }

  /**
   * Sanitize date input
   */
  static sanitizeDate(input: string | Date): string {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date.toISOString();
  }

  /**
   * Sanitize array of strings
   */
  static sanitizeStringArray(input: any[]): string[] {
    if (!Array.isArray(input)) {
      return [];
    }
    return input.map(item => this.sanitizeString(String(item)));
  }

  /**
   * Sanitize object for database insertion
   */
  static sanitizeObject<T extends Record<string, any>>(
    obj: T,
    schema: Record<keyof T, 'string' | 'number' | 'boolean' | 'uuid' | 'date'>
  ): T {
    const sanitized: any = {};
    
    for (const key in schema) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const type = schema[key];
        
        try {
          switch (type) {
            case 'string':
              sanitized[key] = this.sanitizeString(value);
              break;
            case 'number':
              sanitized[key] = this.sanitizeNumber(value);
              break;
            case 'boolean':
              sanitized[key] = this.sanitizeBoolean(value);
              break;
            case 'uuid':
              sanitized[key] = this.sanitizeUUID(value);
              break;
            case 'date':
              sanitized[key] = this.sanitizeDate(value);
              break;
            default:
              sanitized[key] = value;
          }
        } catch (error) {
          console.error(`Validation error for field ${String(key)}:`, error);
          throw new Error(`Invalid input for field ${String(key)}`);
        }
      }
    }
    
    return sanitized as T;
  }
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private static requests: Map<string, number[]> = new Map();
  private static readonly MAX_REQUESTS = 100; // Max requests per window
  private static readonly WINDOW_MS = 60000; // 1 minute window

  /**
   * Check if request should be rate limited
   */
  static shouldLimit(key: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.WINDOW_MS
    );
    
    if (validRequests.length >= this.MAX_REQUESTS) {
      return true;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return false;
  }

  /**
   * Clear rate limit data for a key
   */
  static clear(key: string): void {
    this.requests.delete(key);
  }
}

export default SecureSupabaseClient;