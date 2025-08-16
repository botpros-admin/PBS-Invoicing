-- Create billing_companies table (Level 1 - PBS)
CREATE TABLE IF NOT EXISTS public.billing_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    tax_id VARCHAR(50),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create laboratories table (Level 2)
CREATE TABLE IF NOT EXISTS public.laboratories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    billing_company_id UUID REFERENCES public.billing_companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    tax_id VARCHAR(50),
    clia_number VARCHAR(50),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add laboratory_id to clients table (Level 3 - Clinics)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES public.laboratories(id) ON DELETE SET NULL;

-- Add parent_id for parent/child clinic relationships
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create parent_accounts table for managing parent/child relationships
CREATE TABLE IF NOT EXISTS public.parent_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    billing_email VARCHAR(255),
    billing_address TEXT,
    payment_terms INTEGER DEFAULT 30,
    tenant_id UUID,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create CPT mapping tables
CREATE TABLE IF NOT EXISTS public.cpt_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    laboratory_id UUID REFERENCES public.laboratories(id) ON DELETE CASCADE,
    input_code VARCHAR(50) NOT NULL,
    output_code VARCHAR(50) NOT NULL,
    description TEXT,
    display_name VARCHAR(255),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, laboratory_id, input_code)
);

-- Create fee_schedules table
CREATE TABLE IF NOT EXISTS public.fee_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tenant_id UUID,
    laboratory_id UUID REFERENCES public.laboratories(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    parent_schedule_id UUID REFERENCES public.fee_schedules(id) ON DELETE SET NULL,
    percentage_change DECIMAL(5,2),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create fee_schedule_items table
CREATE TABLE IF NOT EXISTS public.fee_schedule_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fee_schedule_id UUID REFERENCES public.fee_schedules(id) ON DELETE CASCADE,
    cpt_code VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fee_schedule_id, cpt_code)
);

-- Create credits table
CREATE TABLE IF NOT EXISTS public.credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    clinic_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    source_type VARCHAR(50) CHECK (source_type IN ('overpayment', 'refund', 'adjustment', 'manual')),
    source_payment_id UUID,
    dispute_id UUID,
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'partial', 'applied', 'expired')),
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ
);

-- Create credit_applications table
CREATE TABLE IF NOT EXISTS public.credit_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    credit_id UUID REFERENCES public.credits(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    line_item_id UUID,
    amount DECIMAL(10,2) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by UUID,
    auto_applied BOOLEAN DEFAULT false
);

-- Create disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    line_item_id UUID,
    clinic_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    source VARCHAR(20) DEFAULT 'internal' CHECK (source IN ('internal', 'portal')),
    assigned_to UUID,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create dispute_messages table
CREATE TABLE IF NOT EXISTS public.dispute_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sender_id UUID,
    sender_type VARCHAR(20) CHECK (sender_type IN ('admin', 'clinic')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_allocations table
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    invoice_ids UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to invoice_line_items if they don't exist
ALTER TABLE public.invoice_line_items 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS needs_reinvoice BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dispute_resolved BOOLEAN DEFAULT false;

-- Add missing columns to payments if they don't exist
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS parent_account_id UUID REFERENCES public.parent_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_laboratories_billing_company ON public.laboratories(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_clients_laboratory ON public.clients(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_clients_parent ON public.clients(parent_id);
CREATE INDEX IF NOT EXISTS idx_cpt_mappings_lookup ON public.cpt_mappings(tenant_id, laboratory_id, input_code);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_dates ON public.fee_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_credits_clinic ON public.credits(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status, tenant_id);

-- Create RLS policies
ALTER TABLE public.billing_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpt_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your auth structure)
CREATE POLICY "Users can view billing companies" ON public.billing_companies
    FOR SELECT USING (true);

CREATE POLICY "Users can view laboratories" ON public.laboratories
    FOR SELECT USING (true);

CREATE POLICY "Users can manage billing companies" ON public.billing_companies
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage laboratories" ON public.laboratories
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert default data
INSERT INTO public.billing_companies (name, code, email, active)
VALUES ('PBS Billing Company', 'PBS001', 'admin@pbsbilling.com', true)
ON CONFLICT (code) DO NOTHING;

-- Get the PBS billing company ID
DO $$
DECLARE
    pbs_id UUID;
BEGIN
    SELECT id INTO pbs_id FROM public.billing_companies WHERE code = 'PBS001';
    
    -- Insert a default laboratory
    INSERT INTO public.laboratories (billing_company_id, name, code, email, active)
    VALUES (pbs_id, 'Main Laboratory', 'LAB001', 'lab@pbsbilling.com', true)
    ON CONFLICT (code) DO NOTHING;
END $$;

-- Function to get price by date of service
CREATE OR REPLACE FUNCTION public.get_price_by_dos(
    p_cpt_code VARCHAR,
    p_date_of_service DATE,
    p_clinic_id UUID DEFAULT NULL,
    p_laboratory_id UUID DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
    v_price DECIMAL;
BEGIN
    -- Find the most specific applicable fee schedule
    SELECT fsi.price INTO v_price
    FROM fee_schedule_items fsi
    JOIN fee_schedules fs ON fs.id = fsi.fee_schedule_id
    WHERE fsi.cpt_code = p_cpt_code
    AND fs.is_active = true
    AND p_date_of_service >= fs.start_date
    AND (fs.end_date IS NULL OR p_date_of_service <= fs.end_date)
    AND (
        (fs.clinic_id = p_clinic_id) OR
        (fs.clinic_id IS NULL AND fs.laboratory_id = p_laboratory_id) OR
        (fs.clinic_id IS NULL AND fs.laboratory_id IS NULL AND fs.is_default = true)
    )
    ORDER BY 
        CASE WHEN fs.clinic_id IS NOT NULL THEN 1
             WHEN fs.laboratory_id IS NOT NULL THEN 2
             ELSE 3 END,
        fs.start_date DESC
    LIMIT 1;
    
    RETURN v_price;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-apply credits
CREATE OR REPLACE FUNCTION public.auto_apply_credits(p_tenant_id UUID)
RETURNS TABLE(credits_applied INT, invoices_affected INT, total_amount_applied DECIMAL) AS $$
DECLARE
    v_credits_applied INT := 0;
    v_invoices_affected INT := 0;
    v_total_amount DECIMAL := 0;
    v_credit RECORD;
    v_invoice RECORD;
    v_application_amount DECIMAL;
BEGIN
    -- Loop through available credits
    FOR v_credit IN 
        SELECT * FROM credits 
        WHERE tenant_id = p_tenant_id 
        AND status = 'available' 
        AND amount > 0
        ORDER BY created_at ASC
    LOOP
        -- Find oldest unpaid invoices for the clinic
        FOR v_invoice IN
            SELECT * FROM invoices
            WHERE client_id = v_credit.clinic_id
            AND balance > 0
            AND status NOT IN ('paid', 'cancelled')
            ORDER BY due_date ASC, created_at ASC
        LOOP
            -- Calculate application amount
            v_application_amount := LEAST(v_credit.amount, v_invoice.balance);
            
            IF v_application_amount > 0 THEN
                -- Apply credit
                INSERT INTO credit_applications (
                    credit_id, invoice_id, amount, auto_applied, applied_by
                ) VALUES (
                    v_credit.id, v_invoice.id, v_application_amount, true, auth.uid()
                );
                
                -- Update credit
                UPDATE credits 
                SET amount = amount - v_application_amount,
                    status = CASE WHEN amount - v_application_amount = 0 THEN 'applied' ELSE 'partial' END
                WHERE id = v_credit.id;
                
                -- Update invoice
                UPDATE invoices
                SET balance = balance - v_application_amount,
                    status = CASE WHEN balance - v_application_amount = 0 THEN 'paid' ELSE 'partial_payment' END
                WHERE id = v_invoice.id;
                
                -- Update counters
                v_credits_applied := v_credits_applied + 1;
                v_invoices_affected := v_invoices_affected + 1;
                v_total_amount := v_total_amount + v_application_amount;
                
                -- Update credit amount for next iteration
                v_credit.amount := v_credit.amount - v_application_amount;
                
                -- Exit if credit is exhausted
                EXIT WHEN v_credit.amount = 0;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT v_credits_applied, v_invoices_affected, v_total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get credit balances
CREATE OR REPLACE FUNCTION public.get_credit_balances(p_tenant_id UUID)
RETURNS TABLE(
    clinic_id UUID,
    clinic_name VARCHAR,
    total_credits DECIMAL,
    available_credits DECIMAL,
    pending_applications DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as clinic_id,
        c.name as clinic_name,
        COALESCE(SUM(cr.original_amount), 0) as total_credits,
        COALESCE(SUM(CASE WHEN cr.status = 'available' THEN cr.amount ELSE 0 END), 0) as available_credits,
        COALESCE(SUM(CASE WHEN cr.status = 'partial' THEN cr.amount ELSE 0 END), 0) as pending_applications
    FROM clients c
    LEFT JOIN credits cr ON cr.clinic_id = c.id AND cr.tenant_id = p_tenant_id
    WHERE c.tenant_id = p_tenant_id
    GROUP BY c.id, c.name
    HAVING SUM(cr.original_amount) > 0
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dispute stats
CREATE OR REPLACE FUNCTION public.get_dispute_stats(p_tenant_id UUID)
RETURNS TABLE(
    total_open INT,
    total_under_review INT,
    total_resolved INT,
    total_amount_disputed DECIMAL,
    average_resolution_time INTERVAL,
    disputes_by_reason JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'open')::INT as total_open,
        COUNT(*) FILTER (WHERE status = 'under_review')::INT as total_under_review,
        COUNT(*) FILTER (WHERE status = 'resolved')::INT as total_resolved,
        COALESCE(SUM(amount), 0) as total_amount_disputed,
        AVG(resolved_at - created_at) FILTER (WHERE status = 'resolved') as average_resolution_time,
        jsonb_object_agg(
            reason, 
            count(*)
        ) FILTER (WHERE reason IS NOT NULL) as disputes_by_reason
    FROM disputes
    WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get clinic stats for portal
CREATE OR REPLACE FUNCTION public.get_clinic_stats(p_clinic_id UUID)
RETURNS TABLE(
    total_outstanding DECIMAL,
    invoices_count INT,
    disputed_amount DECIMAL,
    paid_this_month DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(i.balance), 0) as total_outstanding,
        COUNT(DISTINCT i.id)::INT as invoices_count,
        COALESCE(SUM(d.amount), 0) as disputed_amount,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_date >= date_trunc('month', CURRENT_DATE)), 0) as paid_this_month
    FROM invoices i
    LEFT JOIN disputes d ON d.invoice_id = i.id AND d.status NOT IN ('resolved', 'rejected')
    LEFT JOIN payments p ON p.invoice_id = i.id
    WHERE i.client_id = p_clinic_id
    AND i.status NOT IN ('cancelled', 'paid');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;