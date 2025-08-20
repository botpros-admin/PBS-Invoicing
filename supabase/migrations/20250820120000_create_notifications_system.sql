-- Create notifications table for real-time notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    laboratory_id UUID REFERENCES public.laboratories(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'NEW_INVOICE',
        'PAYMENT_RECEIVED', 
        'INVOICE_OVERDUE',
        'INVOICE_DISPUTED',
        'MESSAGE_RECEIVED',
        'SYSTEM_UPDATE',
        'PAYMENT_FAILED',
        'CLIENT_ACTION'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_to TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_log table for admin activity feeds
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    laboratory_id UUID REFERENCES public.laboratories(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_laboratory_id ON public.notifications(laboratory_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_activity_log_laboratory_id ON public.activity_log(laboratory_id);
CREATE INDEX idx_activity_log_actor_id ON public.activity_log(actor_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action ON public.activity_log(action);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- System can insert notifications (using service role or functions)
CREATE POLICY "System can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (true);

-- RLS Policies for activity_log

-- Only admins and superadmins can view activity logs
CREATE POLICY "Admins can view activity logs"
    ON public.activity_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid()
            AND role IN ('admin', 'superadmin')
            AND laboratory_id = activity_log.laboratory_id
        )
    );

-- System can insert activity logs
CREATE POLICY "System can insert activity logs"
    ON public.activity_log
    FOR INSERT
    WITH CHECK (true);

-- Function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_laboratory_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link_to TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        laboratory_id,
        type,
        title,
        message,
        link_to,
        metadata
    ) VALUES (
        p_user_id,
        p_laboratory_id,
        p_type,
        p_title,
        p_message,
        p_link_to,
        p_metadata
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
    p_actor_id UUID,
    p_laboratory_id UUID,
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.activity_log (
        actor_id,
        laboratory_id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        user_agent
    ) VALUES (
        p_actor_id,
        p_laboratory_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_details,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for invoice notifications
CREATE OR REPLACE FUNCTION public.notify_on_invoice_change()
RETURNS TRIGGER AS $$
DECLARE
    v_client_name TEXT;
    v_notification_type TEXT;
    v_title TEXT;
    v_message TEXT;
BEGIN
    -- Get client name
    SELECT name INTO v_client_name 
    FROM public.clients 
    WHERE id = NEW.client_id;

    IF TG_OP = 'INSERT' THEN
        v_notification_type := 'NEW_INVOICE';
        v_title := 'New Invoice Created';
        v_message := format('New invoice #%s created for %s', NEW.invoice_number, v_client_name);
        
        -- Notify the client's users
        INSERT INTO public.notifications (user_id, laboratory_id, type, title, message, link_to, metadata)
        SELECT 
            cu.auth_id,
            NEW.laboratory_id,
            v_notification_type,
            v_title,
            v_message,
            format('/invoices/%s', NEW.id),
            jsonb_build_object(
                'invoice_id', NEW.id,
                'invoice_number', NEW.invoice_number,
                'amount', NEW.total_amount
            )
        FROM public.client_users cu
        WHERE cu.client_id = NEW.client_id
        AND cu.is_active = true;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check for status changes
        IF OLD.status != NEW.status THEN
            IF NEW.status = 'overdue' THEN
                v_notification_type := 'INVOICE_OVERDUE';
                v_title := 'Invoice Overdue';
                v_message := format('Invoice #%s is now overdue', NEW.invoice_number);
            ELSIF NEW.status = 'disputed' THEN
                v_notification_type := 'INVOICE_DISPUTED';
                v_title := 'Invoice Disputed';
                v_message := format('Invoice #%s has been disputed', NEW.invoice_number);
            END IF;
            
            IF v_notification_type IS NOT NULL THEN
                -- Notify relevant users
                INSERT INTO public.notifications (user_id, laboratory_id, type, title, message, link_to, metadata)
                SELECT 
                    cu.auth_id,
                    NEW.laboratory_id,
                    v_notification_type,
                    v_title,
                    v_message,
                    format('/invoices/%s', NEW.id),
                    jsonb_build_object(
                        'invoice_id', NEW.id,
                        'invoice_number', NEW.invoice_number,
                        'status', NEW.status
                    )
                FROM public.client_users cu
                WHERE cu.client_id = NEW.client_id
                AND cu.is_active = true;
            END IF;
        END IF;
    END IF;
    
    -- Log activity
    PERFORM public.log_activity(
        auth.uid(),
        NEW.laboratory_id,
        TG_OP || '_INVOICE',
        'invoice',
        NEW.id::TEXT,
        jsonb_build_object(
            'invoice_number', NEW.invoice_number,
            'client_id', NEW.client_id,
            'total_amount', NEW.total_amount,
            'status', NEW.status
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for payment notifications
CREATE OR REPLACE FUNCTION public.notify_on_payment_change()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_number TEXT;
    v_client_id UUID;
    v_laboratory_id UUID;
    v_notification_type TEXT;
    v_title TEXT;
    v_message TEXT;
BEGIN
    -- Get invoice details
    SELECT invoice_number, client_id, laboratory_id 
    INTO v_invoice_number, v_client_id, v_laboratory_id
    FROM public.invoices 
    WHERE id = NEW.invoice_id;

    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'completed' THEN
            v_notification_type := 'PAYMENT_RECEIVED';
            v_title := 'Payment Received';
            v_message := format('Payment of $%.2f received for invoice #%s', NEW.amount, v_invoice_number);
        ELSIF NEW.status = 'failed' THEN
            v_notification_type := 'PAYMENT_FAILED';
            v_title := 'Payment Failed';
            v_message := format('Payment of $%.2f failed for invoice #%s', NEW.amount, v_invoice_number);
        END IF;
        
        IF v_notification_type IS NOT NULL THEN
            -- Notify client users
            INSERT INTO public.notifications (user_id, laboratory_id, type, title, message, link_to, metadata)
            SELECT 
                cu.auth_id,
                v_laboratory_id,
                v_notification_type,
                v_title,
                v_message,
                format('/invoices/%s', NEW.invoice_id),
                jsonb_build_object(
                    'payment_id', NEW.id,
                    'invoice_id', NEW.invoice_id,
                    'amount', NEW.amount,
                    'payment_method', NEW.payment_method
                )
            FROM public.client_users cu
            WHERE cu.client_id = v_client_id
            AND cu.is_active = true;
            
            -- Also notify billing staff
            INSERT INTO public.notifications (user_id, laboratory_id, type, title, message, link_to, metadata)
            SELECT 
                u.auth_id,
                v_laboratory_id,
                v_notification_type,
                v_title,
                v_message,
                format('/payments/%s', NEW.id),
                jsonb_build_object(
                    'payment_id', NEW.id,
                    'invoice_id', NEW.invoice_id,
                    'amount', NEW.amount,
                    'payment_method', NEW.payment_method
                )
            FROM public.users u
            WHERE u.laboratory_id = v_laboratory_id
            AND u.role IN ('admin', 'billing', 'superadmin')
            AND u.is_active = true;
        END IF;
    END IF;
    
    -- Log activity
    PERFORM public.log_activity(
        auth.uid(),
        v_laboratory_id,
        TG_OP || '_PAYMENT',
        'payment',
        NEW.id::TEXT,
        jsonb_build_object(
            'invoice_id', NEW.invoice_id,
            'amount', NEW.amount,
            'payment_method', NEW.payment_method,
            'status', NEW.status
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER invoice_notification_trigger
    AFTER INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_invoice_change();

CREATE TRIGGER payment_notification_trigger
    AFTER INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_payment_change();

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications
    SET 
        is_read = true,
        read_at = NOW(),
        updated_at = NOW()
    WHERE id = p_notification_id
    AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET 
        is_read = true,
        read_at = NOW(),
        updated_at = NOW()
    WHERE user_id = auth.uid()
    AND is_read = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;