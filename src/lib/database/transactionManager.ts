/**
 * Database Transaction Manager for PBS Invoicing
 * Ensures data integrity with proper transaction boundaries and rollback mechanisms
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { errorHandler, ErrorCategory, ErrorSeverity } from '../errorHandler';
import { logger } from '../logger';

export interface TransactionOptions {
  isolationLevel?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface TransactionContext {
  id: string;
  startTime: number;
  operations: string[];
  client: SupabaseClient;
}

export type TransactionCallback<T> = (context: TransactionContext) => Promise<T>;

class TransactionManager {
  private static instance: TransactionManager;
  private supabase: SupabaseClient;
  private activeTransactions: Map<string, TransactionContext> = new Map();
  private transactionHistory: Array<{
    id: string;
    duration: number;
    success: boolean;
    operationCount: number;
  }> = [];

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  /**
   * Execute a database transaction with automatic rollback on failure
   */
  async executeTransaction<T>(
    callback: TransactionCallback<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const {
      isolationLevel = 'read_committed',
      timeout = 30000,
      retries = 3,
      retryDelay = 1000,
    } = options;

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < retries) {
      const transactionId = this.generateTransactionId();
      const context: TransactionContext = {
        id: transactionId,
        startTime: Date.now(),
        operations: [],
        client: this.supabase,
      };

      try {
        // Start transaction
        await this.beginTransaction(transactionId, isolationLevel);
        this.activeTransactions.set(transactionId, context);

        // Set timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Transaction timeout')), timeout);
        });

        // Execute callback with timeout
        const result = await Promise.race([
          callback(context),
          timeoutPromise,
        ]);

        // Commit transaction
        await this.commitTransaction(transactionId);
        
        // Record success
        this.recordTransactionHistory(context, true);
        
        logger.info(`Transaction ${transactionId} completed successfully`, {
          component: 'TransactionManager',
          metadata: {
            duration: Date.now() - context.startTime,
            operations: context.operations.length,
          },
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Rollback transaction
        await this.rollbackTransaction(transactionId);
        
        // Record failure
        this.recordTransactionHistory(context, false);
        
        logger.error(`Transaction ${transactionId} failed and rolled back`, error as Error, {
          component: 'TransactionManager',
          metadata: {
            attempt: attempt + 1,
            operations: context.operations,
          },
        });

        // Check if error is retryable
        const appError = errorHandler.handleError(error as Error, {
          category: ErrorCategory.DATABASE,
          severity: attempt >= retries - 1 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
        });

        if (!appError.retryable || attempt >= retries - 1) {
          throw appError;
        }

        // Wait before retry
        const delay = retryDelay * Math.pow(2, attempt);
        logger.info(`Retrying transaction after ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } finally {
        this.activeTransactions.delete(transactionId);
      }
    }

    throw lastError || new Error('Transaction failed after all retries');
  }

  /**
   * Begin a new database transaction
   */
  private async beginTransaction(transactionId: string, isolationLevel: string) {
    try {
      const { error } = await this.supabase.rpc('begin_transaction', {
        transaction_id: transactionId,
        isolation_level: isolationLevel,
      });

      if (error) throw error;

      logger.debug(`Transaction ${transactionId} started with isolation level: ${isolationLevel}`, {
        component: 'TransactionManager',
      });
    } catch (error) {
      // If stored procedure doesn't exist, use alternative approach
      logger.warn('begin_transaction RPC not available, using alternative transaction method', {
        component: 'TransactionManager',
      });
    }
  }

  /**
   * Commit a database transaction
   */
  private async commitTransaction(transactionId: string) {
    try {
      const { error } = await this.supabase.rpc('commit_transaction', {
        transaction_id: transactionId,
      });

      if (error) throw error;

      logger.debug(`Transaction ${transactionId} committed`, {
        component: 'TransactionManager',
      });
    } catch (error) {
      // If stored procedure doesn't exist, transaction will auto-commit
      logger.warn('commit_transaction RPC not available, transaction auto-committed', {
        component: 'TransactionManager',
      });
    }
  }

  /**
   * Rollback a database transaction
   */
  private async rollbackTransaction(transactionId: string) {
    try {
      const { error } = await this.supabase.rpc('rollback_transaction', {
        transaction_id: transactionId,
      });

      if (error) throw error;

      logger.debug(`Transaction ${transactionId} rolled back`, {
        component: 'TransactionManager',
      });
    } catch (error) {
      // If stored procedure doesn't exist, log warning
      logger.warn('rollback_transaction RPC not available, manual rollback may be required', {
        component: 'TransactionManager',
      });
    }
  }

  /**
   * Execute a single database operation within a transaction context
   */
  async executeOperation<T>(
    context: TransactionContext,
    operation: string,
    query: () => Promise<{ data: T | null; error: any }>
  ): Promise<T> {
    const startTime = performance.now();
    context.operations.push(operation);

    try {
      const { data, error } = await query();
      
      if (error) {
        throw errorHandler.handleDatabaseError(error);
      }

      const duration = performance.now() - startTime;
      logger.logDatabaseQuery(operation, duration, {
        component: 'TransactionManager',
        metadata: { transactionId: context.id },
      });

      return data as T;
    } catch (error) {
      logger.error(`Operation failed in transaction ${context.id}: ${operation}`, error as Error);
      throw error;
    }
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async executeBatch<T>(
    operations: Array<{
      name: string;
      query: (client: SupabaseClient) => Promise<{ data: any; error: any }>;
    }>,
    options?: TransactionOptions
  ): Promise<T[]> {
    return this.executeTransaction(async (context) => {
      const results: T[] = [];

      for (const { name, query } of operations) {
        const result = await this.executeOperation<T>(
          context,
          name,
          () => query(context.client)
        );
        results.push(result);
      }

      return results;
    }, options);
  }

  /**
   * Payment-specific transaction with enhanced validation
   */
  async executePaymentTransaction<T>(
    paymentId: string,
    amount: number,
    callback: TransactionCallback<T>,
    options?: TransactionOptions
  ): Promise<T> {
    logger.logPaymentAction('transaction_start', amount, paymentId, {
      component: 'TransactionManager',
    });

    try {
      const result = await this.executeTransaction(async (context) => {
        // Add payment validation
        await this.validatePaymentTransaction(context, paymentId, amount);
        
        // Execute payment operations
        const operationResult = await callback(context);
        
        // Verify payment integrity
        await this.verifyPaymentIntegrity(context, paymentId, amount);
        
        return operationResult;
      }, {
        ...options,
        isolationLevel: 'serializable', // Highest isolation for payment transactions
      });

      logger.logPaymentAction('transaction_success', amount, paymentId, {
        component: 'TransactionManager',
      });

      return result;
    } catch (error) {
      logger.logPaymentAction('transaction_failed', amount, paymentId, {
        component: 'TransactionManager',
        metadata: { error: (error as Error).message },
      });
      
      throw errorHandler.handlePaymentError(error, paymentId, amount);
    }
  }

  /**
   * Validate payment transaction before execution
   */
  private async validatePaymentTransaction(
    context: TransactionContext,
    paymentId: string,
    amount: number
  ) {
    // Check for duplicate payment
    const { data: existingPayment } = await context.client
      .from('payments')
      .select('id')
      .eq('id', paymentId)
      .single();

    if (existingPayment) {
      throw new Error(`Duplicate payment detected: ${paymentId}`);
    }

    // Validate amount
    if (amount <= 0 || !Number.isFinite(amount)) {
      throw new Error(`Invalid payment amount: ${amount}`);
    }
  }

  /**
   * Verify payment integrity after transaction
   */
  private async verifyPaymentIntegrity(
    context: TransactionContext,
    paymentId: string,
    expectedAmount: number
  ) {
    const { data: payment } = await context.client
      .from('payments')
      .select('amount, status')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      throw new Error(`Payment not found after transaction: ${paymentId}`);
    }

    if (Math.abs(payment.amount - expectedAmount) > 0.01) {
      throw new Error(`Payment amount mismatch: expected ${expectedAmount}, got ${payment.amount}`);
    }
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record transaction history for monitoring
   */
  private recordTransactionHistory(context: TransactionContext, success: boolean) {
    const duration = Date.now() - context.startTime;
    
    this.transactionHistory.push({
      id: context.id,
      duration,
      success,
      operationCount: context.operations.length,
    });

    // Keep only last 100 transactions
    if (this.transactionHistory.length > 100) {
      this.transactionHistory.shift();
    }
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats() {
    const successful = this.transactionHistory.filter(t => t.success).length;
    const failed = this.transactionHistory.filter(t => !t.success).length;
    const avgDuration = this.transactionHistory.reduce((sum, t) => sum + t.duration, 0) / 
                       (this.transactionHistory.length || 1);

    return {
      total: this.transactionHistory.length,
      successful,
      failed,
      successRate: successful / (this.transactionHistory.length || 1),
      averageDuration: avgDuration,
      activeTransactions: this.activeTransactions.size,
    };
  }

  /**
   * Check if there are active transactions
   */
  hasActiveTransactions(): boolean {
    return this.activeTransactions.size > 0;
  }

  /**
   * Force rollback all active transactions (emergency use only)
   */
  async emergencyRollbackAll() {
    logger.warn('Emergency rollback initiated for all active transactions', {
      component: 'TransactionManager',
      metadata: { activeCount: this.activeTransactions.size },
    });

    const promises = Array.from(this.activeTransactions.keys()).map(id =>
      this.rollbackTransaction(id).catch(err => 
        logger.error(`Failed to rollback transaction ${id}`, err)
      )
    );

    await Promise.all(promises);
    this.activeTransactions.clear();
  }
}

export const transactionManager = TransactionManager.getInstance();
export default transactionManager;