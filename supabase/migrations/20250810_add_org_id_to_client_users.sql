-- Supabase Migration: Add organization_id to client_users
-- This migration adds the missing organization_id column to the client_users table,
-- which is critical for RLS policies and joining data correctly.

-- Step 1: Add the organization_id column, allowing it to be NULL initially.
ALTER TABLE public.client_users
ADD COLUMN IF NOT EXISTS organization_id BIGINT;

-- Step 2: Backfill the new column by joining with the clients table.
UPDATE public.client_users cu
SET organization_id = c.organization_id
FROM public.clients c
WHERE cu.client_id = c.id
AND cu.organization_id IS NULL; -- Only update rows that haven't been filled

-- Step 3: Add the foreign key constraint to enforce data integrity.
-- This assumes the backfill was successful.
ALTER TABLE public.client_users
ADD CONSTRAINT fk_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- Step 4: Make the column NOT NULL, as all client users must belong to an organization.
ALTER TABLE public.client_users
ALTER COLUMN organization_id SET NOT NULL;
