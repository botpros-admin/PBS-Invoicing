-- ================================================
-- USER CONTEXT FUNCTION FOR RLS
-- ================================================
-- Sets the current user context for Row Level Security
-- This allows RLS policies to identify the current user
-- ================================================

-- Create the function to set user context
CREATE OR REPLACE FUNCTION public.set_user_context(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set the current user ID in the session for RLS policies to use
    -- This is a session-level setting that RLS policies can reference
    PERFORM set_config('app.current_user_id', user_uuid::text, false);
    
    -- Optionally, we can also set additional user context like laboratory_id
    -- First, get the user's laboratory_id if they have one
    DECLARE
        v_laboratory_id UUID;
        v_organization_id UUID;
        v_role TEXT;
    BEGIN
        -- Get user's organization and role
        SELECT 
            up.organization_id,
            u.role,
            o.laboratory_id
        INTO 
            v_organization_id,
            v_role,
            v_laboratory_id
        FROM public.user_profiles up
        JOIN public.users u ON u.auth_id = user_uuid
        LEFT JOIN public.organizations o ON o.id = up.organization_id
        WHERE up.user_id = user_uuid
        AND up.is_primary = true
        LIMIT 1;
        
        -- Set additional context if found
        IF v_organization_id IS NOT NULL THEN
            PERFORM set_config('app.current_organization_id', v_organization_id::text, false);
        END IF;
        
        IF v_laboratory_id IS NOT NULL THEN
            PERFORM set_config('app.current_laboratory_id', v_laboratory_id::text, false);
        END IF;
        
        IF v_role IS NOT NULL THEN
            PERFORM set_config('app.current_user_role', v_role, false);
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- If we can't get additional context, that's okay
            -- The user_id is the most important part
            NULL;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_user_context(UUID) TO authenticated;

-- ================================================
-- HELPER FUNCTION: Get current user context
-- ================================================
-- Retrieves the current user context from the session
-- ================================================
CREATE OR REPLACE FUNCTION public.get_user_context()
RETURNS TABLE (
    user_id UUID,
    organization_id UUID,
    laboratory_id UUID,
    user_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        NULLIF(current_setting('app.current_user_id', true), '')::UUID as user_id,
        NULLIF(current_setting('app.current_organization_id', true), '')::UUID as organization_id,
        NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID as laboratory_id,
        NULLIF(current_setting('app.current_user_role', true), '') as user_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_context() TO authenticated;

-- ================================================
-- ALTERNATIVE: Use auth.uid() directly in RLS
-- ================================================
-- Note: Supabase already provides auth.uid() function that returns
-- the current user's ID from the JWT token. This is often sufficient
-- for RLS policies without needing set_user_context.
--
-- However, set_user_context can be useful for:
-- 1. Setting additional context (organization, laboratory, role)
-- 2. Complex multi-tenant scenarios
-- 3. Impersonation features (admin viewing as another user)
-- ================================================

-- Example RLS policy using the context
-- This shows how to use the context in RLS policies
COMMENT ON FUNCTION public.set_user_context IS 'Sets the current user context for Row Level Security. Called at the beginning of each session to establish user identity and permissions context.';
COMMENT ON FUNCTION public.get_user_context IS 'Retrieves the current user context from the session. Useful for debugging and in stored procedures that need to know the current user context.';

-- ================================================
-- OPTIONAL: Create a simpler version if the complex one fails
-- ================================================
-- If the above function has issues, here's a simpler version
-- that just sets the user ID without additional context
CREATE OR REPLACE FUNCTION public.set_user_context_simple(user_uuid UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT set_config('app.current_user_id', user_uuid::text, false);
$$;

GRANT EXECUTE ON FUNCTION public.set_user_context_simple(UUID) TO authenticated;