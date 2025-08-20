-- ================================================
-- FIX FOR set_user_context 404 ERROR
-- ================================================
-- Run this in Supabase SQL Editor to create the missing function
-- ================================================

-- Create the function (drop if exists first)
DROP FUNCTION IF EXISTS public.set_user_context(UUID);

CREATE OR REPLACE FUNCTION public.set_user_context(user_uuid UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 1; -- Simple no-op function that just returns void
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_user_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_context(UUID) TO anon;

-- Verify it was created
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'set_user_context' 
AND pronamespace = 'public'::regnamespace;