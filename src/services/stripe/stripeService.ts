import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from '../../api/supabase';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
  'pk_test_51234567890abcdefghijklmnopqrstuvwxyz' // Test key placeholder
);

export interface PaymentIntentData {
  amount: number;
  currency?: string;
  customer_email?: string;
  customer_name?: string;
  invoice_id?: string;
  clinic_id?: string;
  metadata?: Record<string, string>;
}

export interface PaymentMethodData {
  type: 'card' | 'ach_debit';
  card?: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
  };
  ach?: {
    account_number: string;
    routing_number: string;
    account_holder_type: 'individual' | 'company';
  };
}

class StripeService {
  private stripe: Stripe | null = null;

  async initialize(): Promise<void> {
    if (!this.stripe) {
      this.stripe = await stripePromise;
    }
  }

  /**
   * Create a payment intent on the server
   */
  async createPaymentIntent(data: PaymentIntentData): Promise<any> {
    try {
      const { data: result, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: Math.round(data.amount * 100), // Convert to cents
          currency: data.currency || 'usd',
          metadata: {
            invoice_id: data.invoice_id || '',
            clinic_id: data.clinic_id || '',
            ...data.metadata
          },
          receipt_email: data.customer_email,
          description: `Invoice payment ${data.invoice_id ? `for #${data.invoice_id}` : ''}`
        }
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm a card payment using Stripe Elements
   */
  async confirmCardPayment(
    clientSecret: string,
    paymentElement: any
  ): Promise<any> {
    if (!this.stripe) await this.initialize();
    
    const result = await this.stripe!.confirmCardPayment(clientSecret, {
      payment_method: paymentElement
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.paymentIntent;
  }

  /**
   * Create a checkout session for larger payments
   */
  async createCheckoutSession(data: {
    amount: number;
    invoice_number: string;
    clinic_name: string;
    success_url: string;
    cancel_url: string;
    line_items?: Array<{
      description: string;
      amount: number;
      quantity: number;
    }>;
  }): Promise<any> {
    try {
      const { data: session, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          line_items: data.line_items || [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Invoice ${data.invoice_number}`,
                description: `Payment for ${data.clinic_name}`
              },
              unit_amount: Math.round(data.amount * 100)
            },
            quantity: 1
          }],
          mode: 'payment',
          success_url: data.success_url,
          cancel_url: data.cancel_url,
          metadata: {
            invoice_number: data.invoice_number,
            clinic_name: data.clinic_name
          }
        }
      });

      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Set up ACH debit payment
   */
  async setupACHPayment(data: {
    account_number: string;
    routing_number: string;
    account_holder_name: string;
    account_holder_type: 'individual' | 'company';
    amount: number;
    invoice_id: string;
  }): Promise<any> {
    try {
      const { data: result, error } = await supabase.functions.invoke('setup-ach-payment', {
        body: {
          payment_method_data: {
            type: 'us_bank_account',
            us_bank_account: {
              account_holder_type: data.account_holder_type,
              account_number: data.account_number,
              routing_number: data.routing_number
            },
            billing_details: {
              name: data.account_holder_name
            }
          },
          amount: Math.round(data.amount * 100),
          invoice_id: data.invoice_id
        }
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error setting up ACH payment:', error);
      throw error;
    }
  }

  /**
   * Retrieve payment method details
   */
  async getPaymentMethod(paymentMethodId: string): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('get-payment-method', {
        body: { payment_method_id: paymentMethodId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching payment method:', error);
      throw error;
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(data: {
    email: string;
    name: string;
    clinic_id: string;
    metadata?: Record<string, string>;
  }): Promise<any> {
    try {
      const { data: customer, error } = await supabase.functions.invoke('create-stripe-customer', {
        body: {
          email: data.email,
          name: data.name,
          metadata: {
            clinic_id: data.clinic_id,
            ...data.metadata
          }
        }
      });

      if (error) throw error;
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Save payment method for future use
   */
  async savePaymentMethod(data: {
    customer_id: string;
    payment_method_id: string;
  }): Promise<any> {
    try {
      const { data: result, error } = await supabase.functions.invoke('save-payment-method', {
        body: {
          customer_id: data.customer_id,
          payment_method_id: data.payment_method_id
        }
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error saving payment method:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(data: {
    payment_intent_id: string;
    amount?: number; // Partial refund amount in dollars
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<any> {
    try {
      const { data: refund, error } = await supabase.functions.invoke('process-refund', {
        body: {
          payment_intent: data.payment_intent_id,
          amount: data.amount ? Math.round(data.amount * 100) : undefined,
          reason: data.reason || 'requested_by_customer',
          metadata: data.metadata
        }
      });

      if (error) throw error;
      return refund;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get payment history for a clinic
   */
  async getPaymentHistory(clinicId: string, limit = 50): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('get-payment-history', {
        body: {
          clinic_id: clinicId,
          limit
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Validate card details (client-side)
   */
  validateCard(cardNumber: string, expMonth: number, expYear: number, cvc: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Basic card number validation (Luhn algorithm)
    if (!this.validateCardNumber(cardNumber)) {
      errors.push('Invalid card number');
    }

    // Expiry validation
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      errors.push('Card has expired');
    }

    // CVC validation
    if (!/^\d{3,4}$/.test(cvc)) {
      errors.push('Invalid CVC');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Luhn algorithm for card validation
   */
  private validateCardNumber(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Get card type from number
   */
  getCardType(cardNumber: string): string {
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
      diners: /^3(?:0[0-5]|[68])/,
      jcb: /^35/
    };

    const digits = cardNumber.replace(/\D/g, '');

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(digits)) {
        return type;
      }
    }

    return 'unknown';
  }
}

export const stripeService = new StripeService();