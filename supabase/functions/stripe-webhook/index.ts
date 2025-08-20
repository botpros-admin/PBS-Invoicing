import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase Admin Client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Webhook secret for signature verification
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Idempotency tracking - stores processed event IDs
const processedEvents = new Set<string>();

// Helper function to verify webhook signature
async function verifyWebhookSignature(
  body: string,
  signature: string | null
): Promise<Stripe.Event | null> {
  if (!signature) {
    console.error('No stripe-signature header found');
    return null;
  }

  try {
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
    return event;
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return null;
  }
}

// Helper function to handle idempotency
async function isEventProcessed(eventId: string): Promise<boolean> {
  // Check in-memory cache first
  if (processedEvents.has(eventId)) {
    return true;
  }

  // Check database for previously processed events
  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .single();

  if (data) {
    processedEvents.add(eventId);
    return true;
  }

  return false;
}

// Mark event as processed
async function markEventProcessed(
  eventId: string,
  eventType: string,
  payload: any
): Promise<void> {
  processedEvents.add(eventId);
  
  await supabase
    .from('stripe_webhook_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      payload,
      processed_at: new Date().toISOString(),
    });
}

// Handle payment_intent.succeeded event
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);

  // Extract metadata
  const { invoice_id, client_id, laboratory_id } = paymentIntent.metadata || {};
  
  if (!invoice_id) {
    console.error('No invoice_id in payment intent metadata');
    return;
  }

  try {
    // Start a transaction to update invoice and create payment record
    const amountReceived = paymentIntent.amount_received / 100; // Convert from cents

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        client_id,
        payment_date: new Date().toISOString(),
        amount: amountReceived,
        payment_method: paymentIntent.payment_method_types[0] || 'card',
        reference_number: paymentIntent.id,
        notes: `Stripe payment: ${paymentIntent.id}`,
        status: 'cleared',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    // Create payment allocation
    const { error: allocationError } = await supabase
      .from('payment_allocations')
      .insert({
        payment_id: payment.id,
        invoice_id,
        allocated_amount: amountReceived,
        allocation_date: new Date().toISOString(),
        notes: 'Auto-allocated from Stripe payment',
      });

    if (allocationError) {
      throw new Error(`Failed to create payment allocation: ${allocationError.message}`);
    }

    // Update invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('total_amount, paid_amount')
      .eq('id', invoice_id)
      .single();

    if (invoiceError) {
      throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
    }

    const newPaidAmount = (invoice.paid_amount || 0) + amountReceived;
    const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'partial';

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', invoice_id);

    if (updateError) {
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }

    // Create notification for payment received
    if (laboratory_id) {
      await supabase
        .from('notifications')
        .insert({
          laboratory_id,
          type: 'PAYMENT_RECEIVED',
          title: 'Payment Received',
          message: `Payment of $${amountReceived.toFixed(2)} received for invoice`,
          metadata: {
            invoice_id,
            payment_id: payment.id,
            amount: amountReceived,
            payment_intent_id: paymentIntent.id,
          },
        });
    }

    console.log(`Successfully processed payment for invoice ${invoice_id}`);
  } catch (error) {
    console.error('Error processing payment_intent.succeeded:', error);
    throw error;
  }
}

// Handle payment_intent.payment_failed event
async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.log('Processing payment_intent.payment_failed:', paymentIntent.id);

  const { invoice_id, laboratory_id } = paymentIntent.metadata || {};
  
  if (!invoice_id) {
    console.error('No invoice_id in payment intent metadata');
    return;
  }

  // Create notification for payment failure
  if (laboratory_id) {
    await supabase
      .from('notifications')
      .insert({
        laboratory_id,
        type: 'PAYMENT_FAILED',
        title: 'Payment Failed',
        message: `Payment failed for invoice. Please try again or contact support.`,
        metadata: {
          invoice_id,
          payment_intent_id: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message,
        },
      });
  }

  // Log the failure for audit
  await supabase
    .from('audit_logs')
    .insert({
      table_name: 'payments',
      record_id: invoice_id,
      action: 'payment_failed',
      new_values: {
        payment_intent_id: paymentIntent.id,
        error: paymentIntent.last_payment_error,
      },
    });
}

// Handle charge.refunded event
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  console.log('Processing charge.refunded:', charge.id);

  const { invoice_id } = charge.metadata || {};
  
  if (!invoice_id) {
    console.error('No invoice_id in charge metadata');
    return;
  }

  const refundAmount = charge.amount_refunded / 100;

  try {
    // Update invoice paid amount
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('paid_amount')
      .eq('id', invoice_id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch invoice: ${fetchError.message}`);
    }

    const newPaidAmount = Math.max(0, (invoice.paid_amount || 0) - refundAmount);

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        status: newPaidAmount === 0 ? 'sent' : 'partial',
      })
      .eq('id', invoice_id);

    if (updateError) {
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }

    // Create refund record
    await supabase
      .from('payments')
      .insert({
        client_id: charge.metadata.client_id,
        payment_date: new Date().toISOString(),
        amount: -refundAmount, // Negative amount for refund
        payment_method: 'refund',
        reference_number: charge.id,
        notes: `Stripe refund for charge ${charge.id}`,
        status: 'cleared',
        stripe_charge_id: charge.id,
      });

    console.log(`Successfully processed refund for invoice ${invoice_id}`);
  } catch (error) {
    console.error('Error processing charge.refunded:', error);
    throw error;
  }
}

// Handle customer.subscription events for recurring billing
async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  eventType: string
): Promise<void> {
  console.log(`Processing ${eventType}:`, subscription.id);

  const { laboratory_id } = subscription.metadata || {};
  
  if (!laboratory_id) {
    console.error('No laboratory_id in subscription metadata');
    return;
  }

  try {
    // Update organization subscription status
    const status = subscription.status === 'active' ? 'active' : 
                   subscription.status === 'canceled' ? 'cancelled' :
                   subscription.status === 'past_due' ? 'past_due' : 'inactive';

    await supabase
      .from('organizations')
      .update({
        subscription_status: status,
        subscription_tier: subscription.metadata.tier || 'basic',
        stripe_subscription_id: subscription.id,
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('laboratory_id', laboratory_id);

    console.log(`Successfully updated subscription status for laboratory ${laboratory_id}`);
  } catch (error) {
    console.error(`Error processing ${eventType}:`, error);
    throw error;
  }
}

// Main webhook handler
serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get the signature from headers
    const signature = req.headers.get('stripe-signature');
    
    // Get the raw body
    const body = await req.text();

    // Verify webhook signature
    const event = await verifyWebhookSignature(body, signature);
    if (!event) {
      return new Response('Invalid signature', { status: 400 });
    }

    // Check idempotency - skip if already processed
    if (await isEventProcessed(event.id)) {
      console.log(`Event ${event.id} already processed, skipping`);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process the event based on type
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(
          event.data.object as Stripe.Subscription,
          event.type
        );
        break;

      case 'invoice.payment_succeeded':
        // Handle recurring subscription payments
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          console.log('Subscription invoice paid:', invoice.id);
          // Update subscription payment records
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await markEventProcessed(event.id, event.type, event.data.object);

    // Return success response quickly (Stripe requires < 20 seconds)
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    
    // Return 500 to trigger Stripe retry
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});