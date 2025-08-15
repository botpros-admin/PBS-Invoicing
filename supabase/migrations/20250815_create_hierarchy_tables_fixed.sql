-- First, add tenant_id to tables that need it but might not have it
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

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

-- Add sales_rep to clients if it doesn't exist
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(255);

-- Create parent_accounts table for managing parent/child relationships
CREATE TABLE IF NOT EXISTS public.parent_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    billing_email VARCHAR(255),
    billing_address TEXT,
    payment_terms INTEGER DEFAULT 30,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create CPT mapping tables
CREATE TABLE IF NOT EXISTS public.cpt_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    laboratory_id UUID REFERENCES public.laboratories(id) ON DELETE CASCADE,
    input_code VARCHAR(50) NOT NULL,
    output_code VARCHAR(50) NOT NULL,
    description TEXT,
    display_name VARCHAR(255),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(laboratory_id, input_code)
);

-- Create fee_schedules table
CREATE TABLE IF NOT EXISTS public.fee_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
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

-- Check if payments table exists, create if not
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    check_number VARCHAR(50),
    payment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
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
ADD COLUMN IF NOT EXISTS parent_account_id UUID REFERENCES public.parent_accounts(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_laboratories_billing_company ON public.laboratories(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_clients_laboratory ON public.clients(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_clients_parent ON public.clients(parent_id);
CREATE INDEX IF NOT EXISTS idx_cpt_mappings_lookup ON public.cpt_mappings(laboratory_id, input_code);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_dates ON public.fee_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_credits_clinic ON public.credits(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

-- Enable RLS on new tables
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

-- Create basic RLS policies for authenticated users
DO $$
BEGIN
    -- Billing Companies policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_companies' AND policyname = 'Users can view billing companies') THEN
        CREATE POLICY "Users can view billing companies" ON public.billing_companies
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_companies' AND policyname = 'Users can manage billing companies') THEN
        CREATE POLICY "Users can manage billing companies" ON public.billing_companies
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- Laboratories policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laboratories' AND policyname = 'Users can view laboratories') THEN
        CREATE POLICY "Users can view laboratories" ON public.laboratories
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laboratories' AND policyname = 'Users can manage laboratories') THEN
        CREATE POLICY "Users can manage laboratories" ON public.laboratories
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- Similar policies for other tables
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cpt_mappings' AND policyname = 'Users can manage cpt_mappings') THEN
        CREATE POLICY "Users can manage cpt_mappings" ON public.cpt_mappings
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fee_schedules' AND policyname = 'Users can manage fee_schedules') THEN
        CREATE POLICY "Users can manage fee_schedules" ON public.fee_schedules
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fee_schedule_items' AND policyname = 'Users can manage fee_schedule_items') THEN
        CREATE POLICY "Users can manage fee_schedule_items" ON public.fee_schedule_items
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credits' AND policyname = 'Users can manage credits') THEN
        CREATE POLICY "Users can manage credits" ON public.credits
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'Users can manage disputes') THEN
        CREATE POLICY "Users can manage disputes" ON public.disputes
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Insert default data
INSERT INTO public.billing_companies (name, code, email, is_active)
VALUES ('PBS Billing Company', 'PBS001', 'admin@pbsbilling.com', true)
ON CONFLICT (code) DO NOTHING;

-- Get the PBS billing company ID and insert laboratory
DO $$
DECLARE
    pbs_id UUID;
BEGIN
    SELECT id INTO pbs_id FROM public.billing_companies WHERE code = 'PBS001';
    
    IF pbs_id IS NOT NULL THEN
        INSERT INTO public.laboratories (billing_company_id, name, code, email, active)
        VALUES (pbs_id, 'Main Laboratory', 'LAB001', 'lab@pbsbilling.com', true)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;

-- Create helper functions

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
$$ LANGUAGE plpgsql;

-- Verification query - run this to check if tables were created
SELECT 'Tables created successfully!' as status,
       COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('billing_companies', 'laboratories', 'parent_accounts', 'cpt_mappings', 'fee_schedules', 'credits', 'disputes');