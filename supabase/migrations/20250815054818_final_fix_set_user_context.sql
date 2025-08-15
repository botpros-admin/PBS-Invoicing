-- CRITICAL FIX: Create set_user_context function with CORRECT parameter name
-- AuthContext.tsx calls this with { user_uuid: uuid } (NOT user_id!)

-- Step 1: Drop ALL existing versions in ALL schemas
DROP FUNCTION IF EXISTS api.set_user_context CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context CASCADE;
DROP FUNCTION IF EXISTS auth.set_user_context CASCADE;

-- Drop any variants with different signatures
DROP FUNCTION IF EXISTS public.set_user_context(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context(user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context(user_uuid uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context(uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context(text) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context(jsonb) CASCADE;

-- Step 2: Create the function with EXACT parameter name matching AuthContext.tsx RPC call
-- CRITICAL: Parameter MUST be named user_uuid, not user_id!
CREATE OR REPLACE FUNCTION public.set_user_context(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_organization_id uuid;
    v_role text;
    v_user_type text;
BEGIN
    -- Set the user context immediately
    PERFORM set_config('app.current_user_id', user_uuid::text, false);
    PERFORM set_config('request.jwt.claim.sub', user_uuid::text, false);
    
    -- First check if user exists in users table (staff)
    SELECT organization_id, role
    INTO v_organization_id, v_role
    FROM users
    WHERE auth_id = user_uuid
    LIMIT 1;
    
    IF v_organization_id IS NOT NULL THEN
        v_user_type := 'staff';
    ELSE
        -- Check client_users table
        SELECT organization_id, role
        INTO v_organization_id, v_role
        FROM client_users
        WHERE auth_id = user_uuid
        LIMIT 1;
        
        IF v_organization_id IS NOT NULL THEN
            v_user_type := 'client';
        END IF;
    END IF;
    
    -- Set additional context if found
    IF v_organization_id IS NOT NULL THEN
        PERFORM set_config('app.current_organization_id', v_organization_id::text, false);
        PERFORM set_config('app.current_user_role', COALESCE(v_role, 'user'), false);
        PERFORM set_config('app.current_user_type', v_user_type, false);
        
        -- Return success with context info
        RETURN json_build_object(
            'success', true,
            'user_id', user_uuid,
            'organization_id', v_organization_id,
            'role', v_role,
            'user_type', v_user_type
        );
    ELSE
        -- User not found, but don't error - just return partial context
        RETURN json_build_object(
            'success', true,
            'user_id', user_uuid,
            'message', 'User context partially set'
        );
    END IF;
END;
$$;

-- Step 3: Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION public.set_user_context(user_uuid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_context(user_uuid uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.set_user_context(user_uuid uuid) TO service_role;

-- Step 4: Add documentation
COMMENT ON FUNCTION public.set_user_context(user_uuid uuid) IS 
'Sets the current user context for the session. Called by AuthContext.tsx with user_uuid parameter from Supabase auth.';

-- Step 5: Create helper function to get current context (for debugging)
CREATE OR REPLACE FUNCTION public.get_user_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id text;
    v_org_id text;
    v_role text;
    v_type text;
BEGIN
    v_user_id := current_setting('app.current_user_id', true);
    v_org_id := current_setting('app.current_organization_id', true);
    v_role := current_setting('app.current_user_role', true);
    v_type := current_setting('app.current_user_type', true);
    
    RETURN json_build_object(
        'user_id', v_user_id,
        'organization_id', v_org_id,
        'role', v_role,
        'user_type', v_type
    );
END;
$$;

-- Grant permissions for helper function
GRANT EXECUTE ON FUNCTION public.get_user_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_context() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_context() TO service_role;

-- Step 6: Verify the function was created with correct parameter name
DO $$
DECLARE
    func_exists boolean;
BEGIN
    -- Check for function with exact signature and parameter name
    SELECT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'set_user_context'
        AND pg_get_function_arguments(p.oid) = 'user_uuid uuid'
    ) INTO func_exists;
    
    IF NOT func_exists THEN
        RAISE EXCEPTION 'CRITICAL: set_user_context(user_uuid uuid) was not created correctly!';
    END IF;
    
    RAISE NOTICE 'SUCCESS: set_user_context(user_uuid uuid) function created with correct parameter name';
END;
$$;