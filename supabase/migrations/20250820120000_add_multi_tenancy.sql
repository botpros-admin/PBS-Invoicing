
-- supabase/migrations/20250820120000_add_multi_tenancy.sql

-- Step 1: Add organization_id to all relevant tables.
-- We will make it nullable initially to add it to tables with existing data,
-- then populate it, and finally set it to NOT NULL.

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Step 2: Populate the new organization_id column.
-- This is a critical step. We'll update the organization_id based on the organization
-- of the user who created the record. This assumes user_profiles is the source of truth.

UPDATE public.clients c
SET organization_id = up.organization_id
FROM public.user_profiles up
WHERE c.user_id = up.user_id AND c.organization_id IS NULL;

UPDATE public.invoices i
SET organization_id = up.organization_id
FROM public.user_profiles up
WHERE i.user_id = up.user_id AND i.organization_id IS NULL;

UPDATE public.payments p
SET organization_id = up.organization_id
FROM public.user_profiles up
WHERE p.user_id = up.user_id AND p.organization_id IS NULL;

UPDATE public.disputes d
SET organization_id = up.organization_id
FROM public.user_profiles up
WHERE d.user_id = up.user_id AND d.organization_id IS NULL;

-- Step 3: Make the organization_id column NOT NULL.
-- Now that the data is populated, we can enforce this constraint.

ALTER TABLE public.clients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.disputes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.user_profiles ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Add foreign key constraints for data integrity.
-- This assumes an 'organizations' table exists. If not, this step will fail
-- and the organizations table should be created first.

ALTER TABLE public.clients
ADD CONSTRAINT fk_clients_organization_id
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.invoices
ADD CONSTRAINT fk_invoices_organization_id
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.payments
ADD CONSTRAINT fk_payments_organization_id
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.disputes
ADD CONSTRAINT fk_disputes_organization_id
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.user_profiles
ADD CONSTRAINT fk_user_profiles_organization_id
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Step 5: Create indexes for performance.
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_disputes_organization_id ON public.disputes(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON public.user_profiles(organization_id);

RAISE NOTICE 'Multi-tenancy schema migration complete. organization_id added and populated.';
