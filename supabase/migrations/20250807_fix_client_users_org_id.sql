-- Supabase Migration: Fix Missing organization_id on client_users
-- This migration adds the critical missing column to the client_users table
-- and backfills the data from the associated client record.

-- Step 1: Add the missing column
ALTER TABLE public.client_users
ADD COLUMN IF NOT EXISTS organization_id BIGINT;

-- Step 2: Backfill the organization_id from the parent client
UPDATE public.client_users cu
SET organization_id = c.organization_id
FROM public.clients c
WHERE cu.client_id = c.id
AND cu.organization_id IS NULL;

-- Step 3: Add the foreign key constraint
ALTER TABLE public.client_users
ADD CONSTRAINT client_users_organization_id_fkey
FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- Step 4: Make the column NOT NULL now that it's backfilled
ALTER TABLE public.client_users
ALTER COLUMN organization_id SET NOT NULL;
