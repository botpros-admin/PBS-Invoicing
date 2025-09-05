-- ================================================
-- SIMPLE USER CONTEXT FUNCTION
-- ================================================
-- Creates a basic set_user_context function to fix the 404 error
-- ================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.set_user_context(UUID);
DROP FUNCTION IF EXISTS public.get_user_context();
DROP FUNCTION IF EXISTS public.set_user_context_simple(UUID);

-- Create simple version that just returns void
-- This is enough to prevent the 404 error
CREATE OR REPLACE FUNCTION public.set_user_context(user_uuid UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    -- Simply set the user context in the session
    -- This prevents the 404 error even if we don't use it for RLS
    SELECT set_config('request.jwt.claim.sub', user_uuid::text, false);
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_user_context(UUID) TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION public.set_user_context IS 'Sets the current user context for the session. This function is called by the frontend to establish user identity.';

-- ================================================
-- OPTIONAL: Get current user helper
-- ================================================
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;