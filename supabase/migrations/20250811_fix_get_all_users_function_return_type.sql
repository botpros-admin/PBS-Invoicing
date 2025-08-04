-- Supabase Migration: Fix get_all_users_in_organization function return type
-- This migration corrects the function to cast the email column to TEXT.

CREATE OR REPLACE FUNCTION public.get_all_users_in_organization()
RETURNS TABLE (
    id BIGINT,
    email TEXT,
    name TEXT,
    role TEXT,
    status public.user_status
) AS $$
BEGIN
    -- Union results from staff and client users
    RETURN QUERY
        SELECT u.id, u.email::TEXT, (u.first_name || ' ' || u.last_name) as name, u.role::TEXT, u.status FROM public.users u WHERE u.organization_id = (SELECT u2.organization_id FROM users u2 WHERE u2.auth_id = auth.uid())
        UNION ALL
        SELECT cu.id, cu.email::TEXT, (cu.first_name || ' ' || cu.last_name) as name, cu.role::TEXT, cu.status FROM public.client_users cu WHERE cu.organization_id = (SELECT u2.organization_id FROM users u2 WHERE u2.auth_id = auth.uid());
END;
$$ LANGUAGE plpgsql;
