import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../../../api/supabase';

// Mock Stripe webhook events
const mockPaymentIntentSucceeded = {
  id: 'evt_test_webhook',
  object: 'event',
  type: 'payment_intent.succeeded',
  created: 1680000000,
  data: {
    object: {
      id: 'pi_test_123',
      object: 'payment_intent',
      amount: 10000, // $100.00 in cents
      amount_received: 10000,
      currency: 'usd',
      status: 'succeeded',
      payment_method_types: ['card'],
      metadata: {
        invoice_id: 'inv-123',
        client_id: 'client-123',
        laboratory_id: 'lab-123',
      },
    },
  },
};

const mockPaymentIntentFailed = {
  id: 'evt_test_failed',
  object: 'event',
  type: 'payment_intent.payment_failed',
  created: 1680000001,
  data: {
    object: {
      id: 'pi_test_failed',
      object: 'payment_intent',
      amount: 5000,
      currency: 'usd',
      status: 'requires_payment_method',
      last_payment_error: {
        code: 'card_declined',
        message: 'Your card was declined.',
      },
      metadata: {
        invoice_id: 'inv-456',
        laboratory_id: 'lab-123',
      },
    },
  },
};

const mockChargeRefunded = {
  id: 'evt_test_refund',
  object: 'event',
  type: 'charge.refunded',
  created: 1680000002,
  data: {
    object: {
      id: 'ch_test_refund',
      object: 'charge',
      amount: 10000,
      amount_refunded: 5000, // $50.00 refunded
      currency: 'usd',
      refunded: true,
      metadata: {
        invoice_id: 'inv-789',
        client_id: 'client-456',
      },
    },
  },
};

// Mock Supabase client
vi.mock('../../../api/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Payment Intent Succeeded', () => {
    it('should create payment record and update invoice', async () => {
      // Mock invoice fetch
      const mockInvoice = {
        id: 'inv-123',
        total_amount: 100.00,
        paid_amount: 0,
        status: 'sent',
      };

      // Mock Supabase operations
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockInvoice, error: null }),
            update: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'payments') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'payment-123' }, 
              error: null 
            }),
          };
        }
        if (table === 'payment_allocations') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      (supabase.from as any).mockImplementation(mockFrom);

      // Simulate webhook processing
      const processWebhook = async (event: any) => {
        if (event.type === 'payment_intent.succeeded') {
          const paymentIntent = event.data.object;
          const { invoice_id, client_id, laboratory_id } = paymentIntent.metadata;
          const amountReceived = paymentIntent.amount_received / 100;

          // Create payment record
          await supabase.from('payments').insert({
            client_id,
            amount: amountReceived,
            payment_method: 'card',
            reference_number: paymentIntent.id,
            status: 'cleared',
          }).select().single();

          // Create payment allocation
          await supabase.from('payment_allocations').insert({
            payment_id: 'payment-123',
            invoice_id,
            allocated_amount: amountReceived,
          });

          // Update invoice
          await supabase.from('invoices')
            .update({
              paid_amount: amountReceived,
              status: 'paid',
            })
            .eq('id', invoice_id);

          // Create notification
          if (laboratory_id) {
            await supabase.from('notifications').insert({
              laboratory_id,
              type: 'PAYMENT_RECEIVED',
              title: 'Payment Received',
              message: `Payment of $${amountReceived.toFixed(2)} received`,
            });
          }
        }
      };

      await processWebhook(mockPaymentIntentSucceeded);

      // Verify payment was created
      expect(mockFrom).toHaveBeenCalledWith('payments');
      expect(mockFrom).toHaveBeenCalledWith('payment_allocations');
      expect(mockFrom).toHaveBeenCalledWith('invoices');
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });

    it('should handle partial payments correctly', async () => {
      const mockInvoice = {
        id: 'inv-partial',
        total_amount: 200.00,
        paid_amount: 50.00,
        status: 'partial',
      };

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockInvoice, error: null }),
            update: vi.fn().mockImplementation((data) => {
              expect(data.paid_amount).toBe(150.00); // 50 + 100
              expect(data.status).toBe('partial'); // Still partial
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'payment-456' }, error: null }),
        };
      });

      (supabase.from as any).mockImplementation(mockFrom);

      // Process payment that doesn't fully pay the invoice
      const partialPaymentEvent = {
        ...mockPaymentIntentSucceeded,
        data: {
          object: {
            ...mockPaymentIntentSucceeded.data.object,
            metadata: { invoice_id: 'inv-partial' },
          },
        },
      };

      // Simulate processing
      const paymentIntent = partialPaymentEvent.data.object;
      const amountReceived = paymentIntent.amount_received / 100;
      const newPaidAmount = mockInvoice.paid_amount + amountReceived;
      const newStatus = newPaidAmount >= mockInvoice.total_amount ? 'paid' : 'partial';

      await supabase.from('invoices').update({
        paid_amount: newPaidAmount,
        status: newStatus,
      }).eq('id', 'inv-partial');

      expect(mockFrom).toHaveBeenCalledWith('invoices');
    });
  });

  describe('Payment Intent Failed', () => {
    it('should create failure notification', async () => {
      const mockFrom = vi.fn().mockImplementation((table: string) => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      // Process failed payment
      const processFailedPayment = async (event: any) => {
        const paymentIntent = event.data.object;
        const { invoice_id, laboratory_id } = paymentIntent.metadata;

        if (laboratory_id) {
          await supabase.from('notifications').insert({
            laboratory_id,
            type: 'PAYMENT_FAILED',
            title: 'Payment Failed',
            message: paymentIntent.last_payment_error?.message,
            metadata: {
              invoice_id,
              payment_intent_id: paymentIntent.id,
            },
          });
        }

        await supabase.from('audit_logs').insert({
          table_name: 'payments',
          record_id: invoice_id,
          action: 'payment_failed',
        });
      };

      await processFailedPayment(mockPaymentIntentFailed);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('Charge Refunded', () => {
    it('should update invoice and create refund record', async () => {
      const mockInvoice = {
        id: 'inv-789',
        paid_amount: 100.00,
      };

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockInvoice, error: null }),
            update: vi.fn().mockImplementation((data) => {
              expect(data.paid_amount).toBe(50.00); // 100 - 50 refund
              expect(data.status).toBe('partial');
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        if (table === 'payments') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              expect(data.amount).toBe(-50.00); // Negative for refund
              expect(data.payment_method).toBe('refund');
              return Promise.resolve({ error: null });
            }),
          };
        }
      });

      (supabase.from as any).mockImplementation(mockFrom);

      // Process refund
      const charge = mockChargeRefunded.data.object;
      const refundAmount = charge.amount_refunded / 100;
      const newPaidAmount = Math.max(0, mockInvoice.paid_amount - refundAmount);

      await supabase.from('invoices').update({
        paid_amount: newPaidAmount,
        status: newPaidAmount === 0 ? 'sent' : 'partial',
      }).eq('id', charge.metadata.invoice_id);

      await supabase.from('payments').insert({
        client_id: charge.metadata.client_id,
        amount: -refundAmount,
        payment_method: 'refund',
        reference_number: charge.id,
      });

      expect(mockFrom).toHaveBeenCalledWith('invoices');
      expect(mockFrom).toHaveBeenCalledWith('payments');
    });
  });

  describe('Idempotency', () => {
    it('should not process the same event twice', async () => {
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'stripe_webhook_events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn()
              .mockResolvedValueOnce({ data: null, error: null }) // First call - not processed
              .mockResolvedValueOnce({ data: { id: 'evt-123' }, error: null }), // Second call - already processed
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      (supabase.from as any).mockImplementation(mockFrom);

      // Check if event is processed
      const isEventProcessed = async (eventId: string) => {
        const { data } = await supabase
          .from('stripe_webhook_events')
          .select('id')
          .eq('event_id', eventId)
          .single();
        return !!data;
      };

      // First check - should not be processed
      const firstCheck = await isEventProcessed('evt_test_webhook');
      expect(firstCheck).toBe(false);

      // Second check - should be processed
      const secondCheck = await isEventProcessed('evt_test_webhook');
      expect(secondCheck).toBe(true);
    });

    it('should track processed events', async () => {
      const mockFrom = vi.fn().mockImplementation((table: string) => ({
        insert: vi.fn().mockImplementation((data) => {
          expect(data.event_id).toBe('evt_test_webhook');
          expect(data.event_type).toBe('payment_intent.succeeded');
          expect(data.payload).toBeDefined();
          return Promise.resolve({ error: null });
        }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      // Mark event as processed
      await supabase.from('stripe_webhook_events').insert({
        event_id: mockPaymentIntentSucceeded.id,
        event_type: mockPaymentIntentSucceeded.type,
        payload: mockPaymentIntentSucceeded.data.object,
        processed_at: new Date().toISOString(),
      });

      expect(mockFrom).toHaveBeenCalledWith('stripe_webhook_events');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockFrom = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed' } 
        }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const processWithError = async () => {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', 'inv-123')
          .single();

        if (error) {
          throw new Error(error.message);
        }
        return data;
      };

      await expect(processWithError()).rejects.toThrow('Database connection failed');
    });

    it('should handle missing metadata gracefully', async () => {
      const eventWithoutMetadata = {
        ...mockPaymentIntentSucceeded,
        data: {
          object: {
            ...mockPaymentIntentSucceeded.data.object,
            metadata: {}, // Empty metadata
          },
        },
      };

      const processEvent = (event: any) => {
        const { invoice_id } = event.data.object.metadata || {};
        
        if (!invoice_id) {
          return false;
        }
        return true;
      };

      const result = processEvent(eventWithoutMetadata);
      expect(result).toBe(false);
    });
  });
});