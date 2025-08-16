import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Stripe from 'stripe';
import * as stripeService from '../stripe.service';

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = {
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
      list: vi.fn()
    },
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      list: vi.fn()
    },
    paymentMethods: {
      attach: vi.fn(),
      detach: vi.fn(),
      list: vi.fn()
    },
    refunds: {
      create: vi.fn(),
      retrieve: vi.fn(),
      list: vi.fn()
    },
    webhookEndpoints: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      del: vi.fn(),
      list: vi.fn()
    },
    webhooks: {
      constructEvent: vi.fn()
    }
  };

  return {
    default: vi.fn(() => mockStripe),
    Stripe: vi.fn(() => mockStripe)
  };
});

describe('Stripe Service', () => {
  let mockStripe: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Get mock Stripe instance
    const StripeConstructor = require('stripe').default;
    mockStripe = StripeConstructor();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Payment Intent Creation', () => {
    it('should create a payment intent with correct parameters', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test123_secret',
        metadata: {
          invoiceId: 'inv_123',
          clientId: 'client_456'
        }
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.createPaymentIntent({
        amount: 10000,
        currency: 'usd',
        metadata: {
          invoiceId: 'inv_123',
          clientId: 'client_456'
        }
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000,
        currency: 'usd',
        metadata: {
          invoiceId: 'inv_123',
          clientId: 'client_456'
        },
        automatic_payment_methods: { enabled: true }
      });

      expect(result).toEqual(mockPaymentIntent);
    });

    it('should handle payment intent creation errors', async () => {
      const mockError = new Error('Insufficient funds');
      mockStripe.paymentIntents.create.mockRejectedValue(mockError);

      await expect(
        stripeService.createPaymentIntent({
          amount: 10000,
          currency: 'usd'
        })
      ).rejects.toThrow('Insufficient funds');
    });

    it('should validate amount is positive', async () => {
      await expect(
        stripeService.createPaymentIntent({
          amount: -100,
          currency: 'usd'
        })
      ).rejects.toThrow('Amount must be positive');
    });

    it('should validate currency is provided', async () => {
      await expect(
        stripeService.createPaymentIntent({
          amount: 10000,
          currency: ''
        })
      ).rejects.toThrow('Currency is required');
    });
  });

  describe('Payment Confirmation', () => {
    it('should confirm a payment intent', async () => {
      const mockConfirmedIntent = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 10000,
        amount_received: 10000
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockConfirmedIntent);

      const result = await stripeService.confirmPaymentIntent('pi_test123');

      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test123');
      expect(result).toEqual(mockConfirmedIntent);
    });

    it('should handle confirmation errors', async () => {
      mockStripe.paymentIntents.confirm.mockRejectedValue(
        new Error('Card declined')
      );

      await expect(
        stripeService.confirmPaymentIntent('pi_test123')
      ).rejects.toThrow('Card declined');
    });
  });

  describe('Customer Management', () => {
    it('should create a new customer', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test Customer',
        metadata: { clientId: 'client_123' }
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await stripeService.createCustomer({
        email: 'test@example.com',
        name: 'Test Customer',
        metadata: { clientId: 'client_123' }
      });

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test Customer',
        metadata: { clientId: 'client_123' }
      });

      expect(result).toEqual(mockCustomer);
    });

    it('should retrieve an existing customer', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com'
      };

      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);

      const result = await stripeService.getCustomer('cus_test123');

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_test123');
      expect(result).toEqual(mockCustomer);
    });

    it('should update customer information', async () => {
      const updatedCustomer = {
        id: 'cus_test123',
        email: 'newemail@example.com'
      };

      mockStripe.customers.update.mockResolvedValue(updatedCustomer);

      const result = await stripeService.updateCustomer('cus_test123', {
        email: 'newemail@example.com'
      });

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_test123', {
        email: 'newemail@example.com'
      });
      expect(result).toEqual(updatedCustomer);
    });
  });

  describe('Webhook Processing', () => {
    it('should verify webhook signature', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const signature = 'test_signature';
      const secret = 'whsec_test';

      const mockEvent = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 10000
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = stripeService.verifyWebhookSignature(
        payload,
        signature,
        secret
      );

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        secret
      );
      expect(result).toEqual(mockEvent);
    });

    it('should handle invalid webhook signatures', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => 
        stripeService.verifyWebhookSignature(
          'payload',
          'bad_signature',
          'secret'
        )
      ).toThrow('Invalid signature');
    });

    it('should process payment_intent.succeeded events', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 10000,
            metadata: {
              invoiceId: 'inv_123'
            }
          }
        }
      };

      const result = await stripeService.processWebhookEvent(event);

      expect(result).toEqual({
        processed: true,
        action: 'payment_confirmed',
        paymentIntentId: 'pi_test123',
        invoiceId: 'inv_123',
        amount: 10000
      });
    });

    it('should process payment_intent.failed events', async () => {
      const event = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test123',
            last_payment_error: {
              message: 'Card declined'
            }
          }
        }
      };

      const result = await stripeService.processWebhookEvent(event);

      expect(result).toEqual({
        processed: true,
        action: 'payment_failed',
        paymentIntentId: 'pi_test123',
        error: 'Card declined'
      });
    });
  });

  describe('Refunds', () => {
    it('should create a refund', async () => {
      const mockRefund = {
        id: 're_test123',
        amount: 5000,
        status: 'succeeded',
        payment_intent: 'pi_test123'
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      const result = await stripeService.createRefund({
        paymentIntentId: 'pi_test123',
        amount: 5000,
        reason: 'requested_by_customer'
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        amount: 5000,
        reason: 'requested_by_customer'
      });

      expect(result).toEqual(mockRefund);
    });

    it('should handle partial refunds', async () => {
      const mockRefund = {
        id: 're_test123',
        amount: 2500,
        status: 'succeeded'
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      const result = await stripeService.createRefund({
        paymentIntentId: 'pi_test123',
        amount: 2500
      });

      expect(result.amount).toBe(2500);
    });

    it('should handle refund errors', async () => {
      mockStripe.refunds.create.mockRejectedValue(
        new Error('Refund amount exceeds payment amount')
      );

      await expect(
        stripeService.createRefund({
          paymentIntentId: 'pi_test123',
          amount: 20000
        })
      ).rejects.toThrow('Refund amount exceeds payment amount');
    });
  });

  describe('Payment Methods', () => {
    it('should attach a payment method to a customer', async () => {
      const mockPaymentMethod = {
        id: 'pm_test123',
        customer: 'cus_test123'
      };

      mockStripe.paymentMethods.attach.mockResolvedValue(mockPaymentMethod);

      const result = await stripeService.attachPaymentMethod(
        'pm_test123',
        'cus_test123'
      );

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith(
        'pm_test123',
        { customer: 'cus_test123' }
      );
      expect(result).toEqual(mockPaymentMethod);
    });

    it('should list customer payment methods', async () => {
      const mockPaymentMethods = {
        data: [
          { id: 'pm_1', type: 'card', card: { last4: '4242' } },
          { id: 'pm_2', type: 'card', card: { last4: '5555' } }
        ]
      };

      mockStripe.paymentMethods.list.mockResolvedValue(mockPaymentMethods);

      const result = await stripeService.listPaymentMethods('cus_test123');

      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_test123',
        type: 'card'
      });
      expect(result).toEqual(mockPaymentMethods.data);
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors with proper error codes', async () => {
      const stripeError = {
        type: 'StripeCardError',
        code: 'card_declined',
        message: 'Your card was declined',
        decline_code: 'generic_decline'
      };

      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      try {
        await stripeService.createPaymentIntent({
          amount: 10000,
          currency: 'usd'
        });
      } catch (error: any) {
        expect(error.code).toBe('card_declined');
        expect(error.message).toBe('Your card was declined');
      }
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';

      mockStripe.paymentIntents.create.mockRejectedValue(networkError);

      await expect(
        stripeService.createPaymentIntent({
          amount: 10000,
          currency: 'usd'
        })
      ).rejects.toThrow('Network error');
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = {
        type: 'StripeRateLimitError',
        message: 'Too many requests'
      };

      mockStripe.paymentIntents.create.mockRejectedValue(rateLimitError);

      await expect(
        stripeService.createPaymentIntent({
          amount: 10000,
          currency: 'usd'
        })
      ).rejects.toThrow('Too many requests');
    });
  });

  describe('Idempotency', () => {
    it('should use idempotency keys for payment creation', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 10000
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await stripeService.createPaymentIntent({
        amount: 10000,
        currency: 'usd',
        idempotencyKey: 'unique_key_123'
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000,
          currency: 'usd'
        }),
        expect.objectContaining({
          idempotencyKey: 'unique_key_123'
        })
      );
    });
  });
});