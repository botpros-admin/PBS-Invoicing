-- ================================================
-- STRIPE WEBHOOK EVENT TRACKING
-- ================================================
-- Tracks processed webhook events for idempotency
-- Prevents duplicate processing of events
-- ================================================

-- Create table for tracking processed webhook events
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_event_id UNIQUE(event_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON public.stripe_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON public.stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at ON public.stripe_webhook_events(processed_at DESC);

-- Add Stripe-specific columns to payments table if not exists
DO $$
BEGIN
    -- Add stripe_payment_intent_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'stripe_payment_intent_id'
    ) THEN
        ALTER TABLE public.payments 
        ADD COLUMN stripe_payment_intent_id TEXT UNIQUE;
    END IF;

    -- Add stripe_charge_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'stripe_charge_id'
    ) THEN
        ALTER TABLE public.payments 
        ADD COLUMN stripe_charge_id TEXT UNIQUE;
    END IF;

    -- Add stripe_refund_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'stripe_refund_id'
    ) THEN
        ALTER TABLE public.payments 
        ADD COLUMN stripe_refund_id TEXT;
    END IF;
END $$;

-- Add Stripe subscription tracking to organizations
DO $$
BEGIN
    -- Add stripe_customer_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.organizations 
        ADD COLUMN stripe_customer_id TEXT UNIQUE;
    END IF;

    -- Add stripe_subscription_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE public.organizations 
        ADD COLUMN stripe_subscription_id TEXT UNIQUE;
    END IF;

    -- Add subscription_current_period_end if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'subscription_current_period_end'
    ) THEN
        ALTER TABLE public.organizations 
        ADD COLUMN subscription_current_period_end TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes for Stripe columns
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON public.payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_stripe_charge ON public.payments(stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON public.organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription ON public.organizations(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- ================================================
-- FUNCTION: Process Stripe webhook event
-- ================================================
-- Ensures idempotent processing of webhook events
-- ================================================
CREATE OR REPLACE FUNCTION public.process_stripe_webhook_event(
    p_event_id TEXT,
    p_event_type TEXT,
    p_payload JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_already_processed BOOLEAN;
BEGIN
    -- Check if event already processed
    SELECT EXISTS(
        SELECT 1 FROM public.stripe_webhook_events 
        WHERE event_id = p_event_id
    ) INTO v_already_processed;
    
    IF v_already_processed THEN
        RETURN FALSE; -- Already processed
    END IF;
    
    -- Insert the event
    INSERT INTO public.stripe_webhook_events (
        event_id,
        event_type,
        payload,
        processed_at
    ) VALUES (
        p_event_id,
        p_event_type,
        p_payload,
        NOW()
    )
    ON CONFLICT (event_id) DO NOTHING;
    
    -- Check if insert succeeded (returns true if new event)
    RETURN FOUND;
END;
$$;

-- Grant execute permission to service role (Edge Functions use service role)
GRANT EXECUTE ON FUNCTION public.process_stripe_webhook_event(TEXT, TEXT, JSONB) TO service_role;

-- ================================================
-- FUNCTION: Update invoice payment from Stripe
-- ================================================
-- Updates invoice payment status from Stripe webhook
-- ================================================
CREATE OR REPLACE FUNCTION public.update_invoice_payment_from_stripe(
    p_invoice_id UUID,
    p_payment_amount DECIMAL(12,2),
    p_payment_intent_id TEXT,
    p_payment_method TEXT DEFAULT 'card'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice RECORD;
    v_new_paid_amount DECIMAL(12,2);
    v_new_status TEXT;
BEGIN
    -- Get current invoice
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE; -- Lock the row
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
    END IF;
    
    -- Calculate new paid amount
    v_new_paid_amount := COALESCE(v_invoice.paid_amount, 0) + p_payment_amount;
    
    -- Determine new status
    IF v_new_paid_amount >= v_invoice.total_amount THEN
        v_new_status := 'paid';
    ELSIF v_new_paid_amount > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := v_invoice.status;
    END IF;
    
    -- Update invoice
    UPDATE public.invoices
    SET 
        paid_amount = v_new_paid_amount,
        status = v_new_status,
        paid_at = CASE 
            WHEN v_new_status = 'paid' THEN NOW() 
            ELSE paid_at 
        END,
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- Log the payment in audit
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        new_values
    ) VALUES (
        'invoices',
        p_invoice_id,
        'payment_received',
        jsonb_build_object(
            'payment_amount', p_payment_amount,
            'payment_intent_id', p_payment_intent_id,
            'payment_method', p_payment_method,
            'new_paid_amount', v_new_paid_amount,
            'new_status', v_new_status
        )
    );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.update_invoice_payment_from_stripe(UUID, DECIMAL, TEXT, TEXT) TO service_role;

-- ================================================
-- RLS Policies for stripe_webhook_events
-- ================================================
-- Only service role can access webhook events table
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access (Edge Functions use service role)
CREATE POLICY "Service role has full access to webhook events"
    ON public.stripe_webhook_events
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can view webhook events for debugging (read-only)
CREATE POLICY "Authenticated users can view webhook events"
    ON public.stripe_webhook_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- ================================================
-- Cleanup old webhook events (optional)
-- ================================================
-- Function to clean up old processed events (keep last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.stripe_webhook_events
    WHERE processed_at < NOW() - INTERVAL '90 days'
    AND event_type NOT IN (
        'payment_intent.succeeded',
        'charge.refunded',
        'customer.subscription.deleted'
    ); -- Keep important events longer
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- Create a scheduled job to clean up old events (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('cleanup-webhook-events', '0 2 * * *', 'SELECT public.cleanup_old_webhook_events();');

-- ================================================
-- COMMENTS
-- ================================================
COMMENT ON TABLE public.stripe_webhook_events IS 'Tracks processed Stripe webhook events for idempotency';
COMMENT ON FUNCTION public.process_stripe_webhook_event IS 'Ensures idempotent processing of Stripe webhook events';
COMMENT ON FUNCTION public.update_invoice_payment_from_stripe IS 'Updates invoice payment status from Stripe webhook';
COMMENT ON FUNCTION public.cleanup_old_webhook_events IS 'Removes old webhook events to prevent table bloat';