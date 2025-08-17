/**
 * Payment Transaction Manager
 * Ensures payment operations are atomic with proper rollback
 * Prevents race conditions and double-spending
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import { errorHandler } from '../errorHandler';
import Decimal from 'decimal.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PaymentAllocation {
  paymentId: string;
  invoiceId: string;
  amount: Decimal;
  allocatedAt: Date;
}

export class PaymentTransactionManager {
  private static instance: PaymentTransactionManager;

  private constructor() {}

  static getInstance(): PaymentTransactionManager {
    if (!this.instance) {
      this.instance = new PaymentTransactionManager();
    }
    return this.instance;
  }

  /**
   * Allocate payment with full transaction safety
   * Prevents race conditions and ensures data consistency
   */
  async allocatePayment(
    paymentAmount: string | number,
    invoiceId: string,
    paymentMethod: string,
    referenceNumber?: string
  ): Promise<PaymentAllocation> {
    const amount = new Decimal(paymentAmount);
    const transactionId = this.generateTransactionId();
    
    logger.info(`Starting payment allocation transaction ${transactionId}`, {
      component: 'PaymentTransaction',
      metadata: { invoiceId, amount: amount.toString(), paymentMethod }
    });

    try {
      // Start transaction with serializable isolation level
      const { data: transaction, error: txError } = await supabase.rpc(
        'begin_payment_transaction',
        { 
          transaction_id: transactionId,
          isolation_level: 'serializable'
        }
      );

      if (txError) throw txError;

      // Lock the invoice row to prevent concurrent modifications
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()
        .lock();

      if (invoiceError) throw invoiceError;
      if (!invoice) throw new Error('Invoice not found');

      // Calculate remaining balance using Decimal for precision
      const invoiceTotal = new Decimal(invoice.total_amount);
      const paidAmount = new Decimal(invoice.paid_amount || 0);
      const remainingBalance = invoiceTotal.minus(paidAmount);

      // Validate payment amount
      if (amount.lessThanOrEqualTo(0)) {
        throw new Error('Payment amount must be positive');
      }

      // Determine allocation amount (handle overpayments)
      const allocationAmount = amount.greaterThan(remainingBalance) 
        ? remainingBalance 
        : amount;
      
      const creditAmount = amount.minus(allocationAmount);

      // Create payment record with idempotency key
      const idempotencyKey = this.generateIdempotencyKey(
        invoiceId, 
        amount.toString(), 
        paymentMethod, 
        referenceNumber
      );

      // Check for duplicate payment
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .single();

      if (existingPayment) {
        await this.rollbackTransaction(transactionId);
        throw new Error('Duplicate payment detected');
      }

      // Insert payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount: amount.toNumber(),
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          idempotency_key: idempotencyKey,
          transaction_id: transactionId,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create payment allocation record
      const { error: allocationError } = await supabase
        .from('payment_allocations')
        .insert({
          payment_id: payment.id,
          invoice_id: invoiceId,
          allocated_amount: allocationAmount.toNumber(),
          created_at: new Date().toISOString()
        });

      if (allocationError) throw allocationError;

      // Update invoice paid amount
      const newPaidAmount = paidAmount.plus(allocationAmount);
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount.toNumber(),
          status: newPaidAmount.greaterThanOrEqualTo(invoiceTotal) ? 'paid' : 'partial',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      // Handle overpayment credit if applicable
      if (creditAmount.greaterThan(0)) {
        const { error: creditError } = await supabase
          .from('payment_credits')
          .insert({
            payment_id: payment.id,
            credit_amount: creditAmount.toNumber(),
            remaining_credit: creditAmount.toNumber(),
            status: 'available',
            created_at: new Date().toISOString()
          });

        if (creditError) throw creditError;
      }

      // Create audit log entry
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'payments',
          record_id: payment.id,
          action: 'payment_allocated',
          user_id: (await supabase.auth.getUser()).data.user?.id,
          changes: {
            invoice_id: invoiceId,
            amount: amount.toNumber(),
            allocation: allocationAmount.toNumber(),
            credit: creditAmount.toNumber(),
            payment_method: paymentMethod,
            reference_number: referenceNumber
          },
          created_at: new Date().toISOString()
        });

      if (auditError) {
        logger.warn('Failed to create audit log', { error: auditError });
      }

      // Commit transaction
      const { error: commitError } = await supabase.rpc(
        'commit_payment_transaction',
        { transaction_id: transactionId }
      );

      if (commitError) throw commitError;

      logger.info(`Payment allocation completed ${transactionId}`, {
        component: 'PaymentTransaction',
        metadata: { 
          paymentId: payment.id,
          allocated: allocationAmount.toString(),
          credit: creditAmount.toString()
        }
      });

      return {
        paymentId: payment.id,
        invoiceId,
        amount: allocationAmount,
        allocatedAt: new Date()
      };

    } catch (error) {
      // Rollback transaction on any error
      await this.rollbackTransaction(transactionId);
      
      logger.error(`Payment allocation failed ${transactionId}`, error as Error, {
        component: 'PaymentTransaction',
        metadata: { invoiceId, amount: amount.toString() }
      });

      throw errorHandler.handlePaymentError(
        error,
        transactionId,
        amount.toNumber()
      );
    }
  }

  /**
   * Rollback a transaction
   */
  private async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      await supabase.rpc('rollback_payment_transaction', { 
        transaction_id: transactionId 
      });
      logger.info(`Transaction rolled back: ${transactionId}`);
    } catch (error) {
      logger.error(`Failed to rollback transaction: ${transactionId}`, error as Error);
    }
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate idempotency key to prevent duplicate payments
   */
  private generateIdempotencyKey(
    invoiceId: string,
    amount: string,
    method: string,
    reference?: string
  ): string {
    const key = `${invoiceId}_${amount}_${method}_${reference || 'none'}`;
    return Buffer.from(key).toString('base64');
  }

  /**
   * Verify payment integrity
   */
  async verifyPaymentIntegrity(paymentId: string): Promise<boolean> {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          payment_allocations (
            allocated_amount,
            invoice_id
          ),
          payment_credits (
            credit_amount,
            remaining_credit
          )
        `)
        .eq('id', paymentId)
        .single();

      if (error || !payment) return false;

      // Verify amounts match
      const totalAmount = new Decimal(payment.amount);
      const allocatedAmount = payment.payment_allocations.reduce(
        (sum: Decimal, allocation: any) => sum.plus(new Decimal(allocation.allocated_amount)),
        new Decimal(0)
      );
      const creditAmount = payment.payment_credits?.[0]?.credit_amount 
        ? new Decimal(payment.payment_credits[0].credit_amount)
        : new Decimal(0);

      const calculatedTotal = allocatedAmount.plus(creditAmount);
      
      return totalAmount.equals(calculatedTotal);
    } catch (error) {
      logger.error('Payment integrity check failed', error as Error);
      return false;
    }
  }
}

export const paymentTransactionManager = PaymentTransactionManager.getInstance();
export default paymentTransactionManager;