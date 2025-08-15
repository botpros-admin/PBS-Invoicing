-- Emergency Hotfix: Fix set_user_context function
-- This migration ensures the function exists in the PUBLIC schema with correct permissions

-- Step 1: Drop ALL existing versions of set_user_context in ANY schema
DROP FUNCTION IF EXISTS api.set_user_context(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS auth.set_user_context(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS set_user_context(uuid, uuid) CASCADE;

-- Also drop any variants with different signatures
DROP FUNCTION IF EXISTS api.set_user_context(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context(text, text) CASCADE;
DROP FUNCTION IF EXISTS auth.set_user_context(text, text) CASCADE;

-- Step 2: Create the function ONLY in the PUBLIC schema with the EXACT signature expected
CREATE OR REPLACE FUNCTION public.set_user_context(
    p_user_id uuid,
    p_organization_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Set the current user context
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    PERFORM set_config('app.current_organization_id', p_organization_id::text, false);
    
    -- Log the context setting for debugging
    RAISE NOTICE 'User context set - User: %, Organization: %', p_user_id, p_organization_id;
END;
$$;

-- Step 3: Grant EXECUTE permissions to both authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.set_user_context(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_context(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.set_user_context(uuid, uuid) TO service_role;

-- Step 4: Add helpful comment
COMMENT ON FUNCTION public.set_user_context(uuid, uuid) IS 
'Sets the current user and organization context for the session. Used by the frontend AuthContext.';

-- Step 5: Create a companion function to get the current context (for debugging)
CREATE OR REPLACE FUNCTION public.get_user_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id text;
    v_org_id text;
BEGIN
    v_user_id := current_setting('app.current_user_id', true);
    v_org_id := current_setting('app.current_organization_id', true);
    
    RETURN json_build_object(
        'user_id', v_user_id,
        'organization_id', v_org_id
    );
END;
$$;

-- Grant permissions for the helper function
GRANT EXECUTE ON FUNCTION public.get_user_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_context() TO anon;

-- Step 6: Verify the function exists and is accessible
DO $$
BEGIN
    -- Check if function exists in public schema
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'set_user_context'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: set_user_context function was not created in public schema!';
    END IF;
    
    RAISE NOTICE 'SUCCESS: set_user_context function created in public schema';
END;
$$;