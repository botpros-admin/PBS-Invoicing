-- Supabase Migration: Upgrade to Advanced Schema
-- This migration adds the missing tables, columns, and functions
-- to align the database with the application code's expectations.

-- Step 1: Add missing 'clinics' table
CREATE TABLE IF NOT EXISTS public.clinics (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    client_id BIGINT NOT NULL REFERENCES public.clients(id),
    name TEXT NOT NULL,
    address_line1 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow staff to manage clinics" ON public.clinics FOR ALL
USING (EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND organization_id = (SELECT c.organization_id FROM clients c WHERE c.id = clinics.client_id)));


-- Step 2: Add missing columns to existing tables
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS zip_code TEXT;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS clinic_id BIGINT REFERENCES public.clinics(id);


-- Step 3: Create missing RPC Functions
CREATE OR REPLACE FUNCTION public.get_all_users_in_organization()
RETURNS TABLE (
    id BIGINT,
    email TEXT,
    name TEXT,
    role TEXT,
    status public.user_status
) AS $$
BEGIN
    -- Union results from staff and client users
    RETURN QUERY
        SELECT u.id, u.email, u.name, u.role::TEXT, u.status FROM public.users u WHERE u.organization_id = (SELECT u2.organization_id FROM users u2 WHERE u2.auth_id = auth.uid())
        UNION ALL
        SELECT cu.id, cu.email, cu.name, cu.role::TEXT, cu.status FROM public.client_users cu WHERE cu.organization_id = (SELECT u2.organization_id FROM users u2 WHERE u2.auth_id = auth.uid());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_client_performance(from_date TEXT, to_date TEXT)
RETURNS JSONB AS $$
BEGIN
    -- This is a placeholder to resolve the 404 error.
    -- The application expects this function to exist.
    -- Actual implementation would require a complex query.
    RETURN '[]'::JSONB;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_top_cpt_codes(from_date TEXT, to_date TEXT)
RETURNS JSONB AS $$
BEGIN
    -- This is a placeholder to resolve the 404 error.
    RETURN '[]'::JSONB;
END;
$$ LANGUAGE plpgsql;
