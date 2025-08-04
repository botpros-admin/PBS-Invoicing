-- Supabase Migration: Foundational Schema (Idempotent)
-- This migration creates the complete initial schema for the application.
-- It includes checks to ensure it can be run safely even if parts of the schema already exist.

-- Step 1: Create All Necessary ENUM types safely
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.client_user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.user_status AS ENUM ('active', 'invited', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'in_dispute', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'succeeded', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create Core Tables safely
CREATE TABLE IF NOT EXISTS public.organizations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    organization_id BIGINT NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES public.organizations(id),
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    role public.user_role NOT NULL DEFAULT 'staff',
    status public.user_status NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.client_users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id BIGINT REFERENCES public.clients(id) ON DELETE SET NULL,
    organization_id BIGINT NOT NULL REFERENCES public.organizations(id),
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    role public.client_user_role NOT NULL DEFAULT 'user',
    status public.user_status NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.patients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    client_id BIGINT NOT NULL REFERENCES public.clients(id),
    name TEXT NOT NULL,
    dob DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cpt_codes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    default_price NUMERIC(10, 2) NOT NULL CHECK (default_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.price_schedules (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES public.clients(id),
    cpt_code_id BIGINT NOT NULL REFERENCES public.cpt_codes(id),
    override_price NUMERIC(10, 2) NOT NULL CHECK (override_price >= 0),
    UNIQUE(client_id, cpt_code_id)
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    client_id BIGINT NOT NULL REFERENCES public.clients(id),
    invoice_number TEXT NOT NULL UNIQUE,
    status public.invoice_status NOT NULL DEFAULT 'draft',
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    date_due DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    patient_id BIGINT NOT NULL REFERENCES public.patients(id),
    cpt_code_id BIGINT NOT NULL REFERENCES public.cpt_codes(id),
    description TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    date_of_service DATE NOT NULL,
    accession_number TEXT,
    is_disputed BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES public.invoices(id),
    amount NUMERIC(10, 2) NOT NULL,
    status public.payment_status NOT NULL DEFAULT 'pending',
    transaction_id TEXT, -- From payment processor
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Create Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.get_my_claim(claim TEXT)
RETURNS TEXT AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> claim, '')::TEXT;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_my_user_type()
RETURNS TEXT AS $$
DECLARE
  user_type TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid()) THEN
    user_type := 'staff';
  ELSIF EXISTS (SELECT 1 FROM public.client_users WHERE auth_id = auth.uid()) THEN
    user_type := 'client';
  END IF;
  RETURN user_type;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Step 5: Add Basic RLS Policies
DROP POLICY IF EXISTS "Allow all authenticated users to view CPT codes" ON public.cpt_codes;
CREATE POLICY "Allow all authenticated users to view CPT codes" ON public.cpt_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow staff to manage their organizations data" ON public.organizations;
CREATE POLICY "Allow staff to manage their organizations data" ON public.organizations FOR ALL USING (id = (SELECT organization_id FROM users WHERE auth_id = auth.uid()));