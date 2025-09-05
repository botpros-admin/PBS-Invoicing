-- ================================================
-- UPDATE USER CONTEXT FOR MULTITENANCY
-- ================================================
-- This migration updates the set_user_context function to support multi-tenancy
-- by setting the organization_id in the session context. It also creates
-- a helper function to retrieve the current organization_id.
-- ================================================

-- Drop the old function that only accepted user_uuid
DROP FUNCTION IF EXISTS public.set_user_context(UUID);

-- Create the new function that accepts both user_uuid and organization_id
CREATE OR REPLACE FUNCTION public.set_user_context(user_uuid UUID, organization_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set the user's UUID and organization_id in the session context
  -- These will be used by RLS policies
  PERFORM set_config('request.jwt.claim.sub', user_uuid::text, false);
  PERFORM set_config('app.current_organization_id', organization_id::text, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_user_context(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.set_user_context IS 'Sets the user and organization context for the current session.';

-- ================================================
-- HELPER FUNCTION TO GET CURRENT ORGANIZATION ID
-- ================================================
CREATE OR REPLACE FUNCTION app.current_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.current_organization_id', true), '00000000-0000-0000-0000-000000000000')::UUID;
$$;

GRANT EXECUTE ON FUNCTION app.current_organization_id() TO authenticated;

COMMENT ON FUNCTION app.current_organization_id IS 'Returns the organization_id for the current session.';
