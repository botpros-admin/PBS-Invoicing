
-- supabase/migrations/20250820120100_create_organizations.sql

-- Step 1: Create the organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create a linking table for users and organizations
CREATE TABLE IF NOT EXISTS public.organization_users (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- e.g., 'admin', 'member', 'billing'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_users_organization_id ON public.organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON public.organization_users(user_id);

-- Step 4: Enable RLS on the new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- Step 5: Define RLS policies for organizations
-- Users can see organizations they are a part of.
DROP POLICY IF EXISTS "Users can view their own organizations" ON public.organizations;
CREATE POLICY "Users can view their own organizations"
    ON public.organizations FOR SELECT
    USING (id IN (
        SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    ));

-- Step 6: Define RLS policies for organization_users
-- Users can see their own membership record.
DROP POLICY IF EXISTS "Users can view their own membership" ON public.organization_users;
CREATE POLICY "Users can view their own membership"
    ON public.organization_users FOR SELECT
    USING (user_id = auth.uid());

-- Admins of an organization can see all memberships for that org.
DROP POLICY IF EXISTS "Admins can view all memberships in their organization" ON public.organization_users;
CREATE POLICY "Admins can view all memberships in their organization"
    ON public.organization_users FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

RAISE NOTICE 'Organizations and organization_users tables created and secured.';
