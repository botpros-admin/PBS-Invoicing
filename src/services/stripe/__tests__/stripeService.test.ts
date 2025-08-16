import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadStripe } from '@stripe/stripe-js';
import StripeService from '../stripeService';
import { supabase } from '../../../api/supabase';

// Mock Stripe.js
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({
    confirmCardPayment: vi.fn(),
    confirmAcssDebitPayment: vi.fn(),
    redirectToCheckout: vi.fn(),
    elements: vi.fn(() => ({
      create: vi.fn(),
      getElement: vi.fn()
    }))
  }))
}));

// Mock Supabase
vi.mock('../../../api/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }
}));

describe('StripeService', () => {
  let stripeService: any;
  let mockStripe: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    stripeService = new StripeService();
    
    // Get mock Stripe instance
    mockStripe = await loadStripe('test_key');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Payment Intent Creation', () => {
    it('should create a payment intent with correct parameters', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        amount: 10000,
        currency: 'usd'
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockPaymentIntent,
        error: null
      });

      const result = await stripeService.createPaymentIntent({
        amount: 100.00, // $100 in dollars
        invoice_id: 'inv_123',
        clinic_id: 'clinic_456',
        customer_email: 'test@example.com'
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-payment-intent', {
        body: {
          amount: 10000, // Converted to cents
          currency: 'usd',
          metadata: {
            invoice_id: 'inv_123',
            clinic_id: 'clinic_456'
          },
          receipt_email: 'test@example.com',
          description: 'Invoice payment for #inv_123'
        }
      });

      expect(result).toEqual(mockPaymentIntent);
    });

    it('should handle payment intent creation errors', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Insufficient funds')
      });

      await expect(
        stripeService.createPaymentIntent({
          amount: 100.00,
          invoice_id: 'inv_123'
        })
      ).rejects.toThrow('Insufficient funds');
    });

    it('should convert dollar amounts to cents correctly', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { id: 'pi_test', amount: 9999 },
        error: null
      });

      await stripeService.createPaymentIntent({
        amount: 99.99 // $99.99
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'create-payment-intent',
        expect.objectContaining({
          body: expect.objectContaining({
            amount: 9999 // 99.99 * 100 = 9999 cents
          })
        })
      );
    });

    it('should include custom metadata', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { id: 'pi_test' },
        error: null
      });

      await stripeService.createPaymentIntent({
        amount: 50.00,
        metadata: {
          custom_field: 'custom_value',
          user_id: 'user_123'
        }
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'create-payment-intent',
        expect.objectContaining({
          body: expect.objectContaining({
            metadata: expect.objectContaining({
              custom_field: 'custom_value',
              user_id: 'user_123'
            })
          })
        })
      );
    });
  });

  describe('Card Payment Confirmation', () => {
    it('should confirm a card payment successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'succeeded'
      };

      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent,
        error: null
      });

      await stripeService.initialize();
      const result = await stripeService.confirmCardPayment(
        'pi_test123_secret',
        { id: 'pm_test' }
      );

      expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(
        'pi_test123_secret',
        { payment_method: { id: 'pm_test' } }
      );
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should handle card payment errors', async () => {
      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: null,
        error: { message: 'Card declined' }
      });

      await stripeService.initialize();
      
      await expect(
        stripeService.confirmCardPayment('pi_test123_secret', { id: 'pm_test' })
      ).rejects.toThrow('Card declined');
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create a checkout session', async () => {
      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123'
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockSession,
        error: null
      });

      const result = await stripeService.createCheckoutSession({
        amount: 500.00,
        invoice_number: 'INV-2024-001',
        clinic_name: 'Test Clinic',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-checkout-session', {
        body: {
          amount: 50000, // $500 in cents
          invoice_number: 'INV-2024-001',
          clinic_name: 'Test Clinic',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        }
      });

      expect(result).toEqual(mockSession);
    });

    it('should handle checkout session with line items', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { id: 'cs_test', url: 'https://checkout.stripe.com/test' },
        error: null
      });

      await stripeService.createCheckoutSession({
        amount: 150.00,
        invoice_number: 'INV-2024-002',
        clinic_name: 'Test Clinic',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        line_items: [
          { description: 'Service A', amount: 100.00, quantity: 1 },
          { description: 'Service B', amount: 50.00, quantity: 1 }
        ]
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'create-checkout-session',
        expect.objectContaining({
          body: expect.objectContaining({
            line_items: [
              { description: 'Service A', amount: 100.00, quantity: 1 },
              { description: 'Service B', amount: 50.00, quantity: 1 }
            ]
          })
        })
      );
    });
  });

  describe('Payment Recording', () => {
    it('should record a successful payment', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'payment_123', amount: 100.00 },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle
      } as any);

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const result = await stripeService.recordPayment({
        invoice_id: 'inv_123',
        amount: 100.00,
        payment_method: 'card',
        stripe_payment_intent_id: 'pi_test123',
        status: 'completed'
      });

      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_id: 'inv_123',
          amount: 100.00,
          payment_method: 'card',
          stripe_payment_intent_id: 'pi_test123',
          status: 'completed'
        })
      );
      expect(result).toEqual({ id: 'payment_123', amount: 100.00 });
    });

    it('should handle payment recording errors', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle
      } as any);

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      await expect(
        stripeService.recordPayment({
          invoice_id: 'inv_123',
          amount: 100.00,
          payment_method: 'card',
          stripe_payment_intent_id: 'pi_test123',
          status: 'completed'
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('Webhook Processing', () => {
    it('should handle payment_intent.succeeded webhook', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 10000,
            metadata: {
              invoice_id: 'inv_123'
            }
          }
        }
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: { id: 'inv_123' },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      } as any);

      mockUpdate.mockReturnValue({ eq: mockEq });

      await stripeService.handleWebhook(mockEvent);

      expect(supabase.from).toHaveBeenCalledWith('invoices');
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'paid',
        paid_at: expect.any(String)
      });
    });

    it('should handle payment_intent.payment_failed webhook', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test123',
            last_payment_error: {
              message: 'Card declined'
            },
            metadata: {
              invoice_id: 'inv_123'
            }
          }
        }
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await stripeService.handleWebhook(mockEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Payment failed for invoice inv_123:',
        'Card declined'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('ACH Payment Processing', () => {
    it('should create an ACH payment intent', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          id: 'pi_ach_test',
          payment_method_types: ['us_bank_account']
        },
        error: null
      });

      const result = await stripeService.createACHPayment({
        amount: 1000.00,
        customer_email: 'test@example.com',
        account_number: '000123456789',
        routing_number: '110000000'
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'create-ach-payment',
        expect.objectContaining({
          body: expect.objectContaining({
            amount: 100000,
            payment_method_types: ['us_bank_account']
          })
        })
      );
    });
  });

  describe('Refund Processing', () => {
    it('should process a full refund', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          id: 're_test123',
          amount: 10000,
          status: 'succeeded'
        },
        error: null
      });

      const result = await stripeService.createRefund({
        payment_intent_id: 'pi_test123',
        amount: 100.00,
        reason: 'requested_by_customer'
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-refund', {
        body: {
          payment_intent_id: 'pi_test123',
          amount: 10000,
          reason: 'requested_by_customer'
        }
      });

      expect(result).toEqual({
        id: 're_test123',
        amount: 10000,
        status: 'succeeded'
      });
    });

    it('should process a partial refund', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          id: 're_test123',
          amount: 5000,
          status: 'succeeded'
        },
        error: null
      });

      const result = await stripeService.createRefund({
        payment_intent_id: 'pi_test123',
        amount: 50.00 // Partial refund of $50
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-refund', {
        body: {
          payment_intent_id: 'pi_test123',
          amount: 5000
        }
      });

      expect(result.amount).toBe(5000);
    });
  });
});