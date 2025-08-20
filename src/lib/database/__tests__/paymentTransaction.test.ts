import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processPaymentAllocation, allocatePaymentToInvoices, handleOverpayment } from '../paymentTransaction';
import { supabase } from '../../../api/supabase';

// Mock Supabase
vi.mock('../../../api/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Payment Transaction Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processPaymentAllocation', () => {
    it('should allocate payment across multiple invoices', async () => {
      const mockInvoices = [
        { id: 'inv-1', invoice_number: 'INV-001', balance_due: 500 },
        { id: 'inv-2', invoice_number: 'INV-002', balance_due: 300 },
        { id: 'inv-3', invoice_number: 'INV-003', balance_due: 200 },
      ];

      const mockPayment = {
        id: 'pay-123',
        amount: 750,
        payment_method: 'credit_card',
        client_id: 'client-123',
      };

      // Mock RPC call for payment allocation
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          allocations: [
            { invoice_id: 'inv-1', amount_allocated: 500 },
            { invoice_id: 'inv-2', amount_allocated: 250 },
          ],
          remaining_credit: 0,
          updated_invoices: [
            { id: 'inv-1', status: 'paid', balance_due: 0 },
            { id: 'inv-2', status: 'partial', balance_due: 50 },
          ],
        },
        error: null,
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await processPaymentAllocation(mockPayment, mockInvoices);

      expect(result.allocations).toHaveLength(2);
      expect(result.allocations[0].amount_allocated).toBe(500);
      expect(result.allocations[1].amount_allocated).toBe(250);
      expect(result.remaining_credit).toBe(0);
      expect(mockRpc).toHaveBeenCalledWith('allocate_payment_to_invoices', expect.objectContaining({
        p_payment_id: 'pay-123',
        p_amount: 750,
      }));
    });

    it('should handle overpayment and create credit', async () => {
      const mockInvoices = [
        { id: 'inv-1', invoice_number: 'INV-001', balance_due: 200 },
      ];

      const mockPayment = {
        id: 'pay-123',
        amount: 500,
        payment_method: 'check',
        client_id: 'client-123',
      };

      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          allocations: [
            { invoice_id: 'inv-1', amount_allocated: 200 },
          ],
          remaining_credit: 300,
          credit_memo_id: 'credit-123',
          updated_invoices: [
            { id: 'inv-1', status: 'paid', balance_due: 0 },
          ],
        },
        error: null,
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await processPaymentAllocation(mockPayment, mockInvoices);

      expect(result.allocations[0].amount_allocated).toBe(200);
      expect(result.remaining_credit).toBe(300);
      expect(result.credit_memo_id).toBe('credit-123');
    });

    it('should handle partial payments correctly', async () => {
      const mockInvoices = [
        { id: 'inv-1', invoice_number: 'INV-001', balance_due: 1000 },
      ];

      const mockPayment = {
        id: 'pay-123',
        amount: 400,
        payment_method: 'ach',
        client_id: 'client-123',
      };

      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          allocations: [
            { invoice_id: 'inv-1', amount_allocated: 400 },
          ],
          remaining_credit: 0,
          updated_invoices: [
            { id: 'inv-1', status: 'partial', balance_due: 600 },
          ],
        },
        error: null,
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await processPaymentAllocation(mockPayment, mockInvoices);

      expect(result.allocations[0].amount_allocated).toBe(400);
      expect(result.updated_invoices[0].status).toBe('partial');
      expect(result.updated_invoices[0].balance_due).toBe(600);
    });

    it('should rollback on allocation failure', async () => {
      const mockInvoices = [
        { id: 'inv-1', invoice_number: 'INV-001', balance_due: 500 },
      ];

      const mockPayment = {
        id: 'pay-123',
        amount: 500,
        payment_method: 'credit_card',
        client_id: 'client-123',
      };

      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Allocation failed', code: 'P0001' },
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      await expect(
        processPaymentAllocation(mockPayment, mockInvoices)
      ).rejects.toThrow('Allocation failed');
    });
  });

  describe('allocatePaymentToInvoices', () => {
    it('should allocate payment using FIFO method', () => {
      const invoices = [
        { id: 'inv-1', balance_due: 300, created_at: '2024-01-01' },
        { id: 'inv-2', balance_due: 200, created_at: '2024-01-15' },
        { id: 'inv-3', balance_due: 400, created_at: '2024-01-10' },
      ];

      const allocations = allocatePaymentToInvoices(500, invoices, 'FIFO');

      expect(allocations).toEqual([
        { invoice_id: 'inv-1', amount: 300 },
        { invoice_id: 'inv-3', amount: 200 },
      ]);
    });

    it('should allocate payment using LIFO method', () => {
      const invoices = [
        { id: 'inv-1', balance_due: 300, created_at: '2024-01-01' },
        { id: 'inv-2', balance_due: 200, created_at: '2024-01-15' },
        { id: 'inv-3', balance_due: 400, created_at: '2024-01-10' },
      ];

      const allocations = allocatePaymentToInvoices(500, invoices, 'LIFO');

      expect(allocations).toEqual([
        { invoice_id: 'inv-2', amount: 200 },
        { invoice_id: 'inv-3', amount: 300 },
      ]);
    });

    it('should allocate payment proportionally', () => {
      const invoices = [
        { id: 'inv-1', balance_due: 200 },
        { id: 'inv-2', balance_due: 300 },
        { id: 'inv-3', balance_due: 500 },
      ];

      const allocations = allocatePaymentToInvoices(500, invoices, 'PROPORTIONAL');

      // Total due: 1000, Payment: 500 (50%)
      expect(allocations).toEqual([
        { invoice_id: 'inv-1', amount: 100 }, // 50% of 200
        { invoice_id: 'inv-2', amount: 150 }, // 50% of 300
        { invoice_id: 'inv-3', amount: 250 }, // 50% of 500
      ]);
    });

    it('should handle zero balance invoices', () => {
      const invoices = [
        { id: 'inv-1', balance_due: 0 },
        { id: 'inv-2', balance_due: 100 },
      ];

      const allocations = allocatePaymentToInvoices(100, invoices, 'FIFO');

      expect(allocations).toEqual([
        { invoice_id: 'inv-2', amount: 100 },
      ]);
    });
  });

  describe('handleOverpayment', () => {
    it('should create credit memo for overpayment', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'credit-123',
          amount: 200,
          client_id: 'client-123',
          status: 'active',
        },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await handleOverpayment({
        client_id: 'client-123',
        amount: 200,
        payment_id: 'pay-123',
        notes: 'Overpayment on invoice INV-001',
      });

      expect(result.id).toBe('credit-123');
      expect(result.amount).toBe(200);
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        client_id: 'client-123',
        amount: 200,
        status: 'active',
      }));
    });

    it('should apply existing credit to new invoices', async () => {
      const mockCredits = [
        { id: 'credit-1', amount: 100, status: 'active' },
        { id: 'credit-2', amount: 50, status: 'active' },
      ];

      const mockInvoice = {
        id: 'inv-new',
        balance_due: 120,
      };

      // Mock fetching credits
      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockCredits,
          error: null,
        }),
      };

      // Mock applying credits
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          credits_applied: [
            { credit_id: 'credit-1', amount_applied: 100 },
            { credit_id: 'credit-2', amount_applied: 20 },
          ],
          remaining_balance: 0,
        },
        error: null,
      });

      (supabase.from as any).mockReturnValue(mockSelect);
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await handleOverpayment.applyCreditsToInvoice(
        'client-123',
        mockInvoice
      );

      expect(result.credits_applied).toHaveLength(2);
      expect(result.remaining_balance).toBe(0);
    });
  });

  describe('Payment Transaction Atomicity', () => {
    it('should ensure all-or-nothing transaction processing', async () => {
      const mockTransaction = {
        begin: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
      };

      // Simulate a transaction that fails midway
      const mockRpc = vi.fn()
        .mockResolvedValueOnce({ data: { success: true }, error: null })
        .mockRejectedValueOnce(new Error('Database constraint violation'));

      (supabase.rpc as any).mockImplementation(mockRpc);

      const payment = {
        id: 'pay-123',
        amount: 1000,
        invoices: ['inv-1', 'inv-2'],
      };

      await expect(
        processPaymentAllocation.withTransaction(payment)
      ).rejects.toThrow('Database constraint violation');

      // Verify rollback was called
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe('Concurrency Handling', () => {
    it('should handle concurrent payment allocations safely', async () => {
      const invoice = { id: 'inv-1', balance_due: 100 };
      
      // Simulate two concurrent payments trying to pay the same invoice
      const payment1 = { id: 'pay-1', amount: 60 };
      const payment2 = { id: 'pay-2', amount: 60 };

      // Mock optimistic locking check
      const mockRpc = vi.fn()
        .mockResolvedValueOnce({
          data: { success: true, balance_remaining: 40 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'P0001', message: 'Invoice already fully paid' },
        });

      (supabase.rpc as any).mockImplementation(mockRpc);

      const result1 = await processPaymentAllocation(payment1, [invoice]);
      expect(result1.success).toBe(true);

      await expect(
        processPaymentAllocation(payment2, [invoice])
      ).rejects.toThrow('Invoice already fully paid');
    });
  });
});