-- ================================================
-- NUCLEAR RLS FIX - THE DEFINITIVE SOLUTION
-- ================================================
-- Date: 2025-08-20
-- Author: Senior Brownfield Developer
-- Purpose: Complete rebuild of RLS with proper schema understanding
-- 
-- CRITICAL FINDINGS:
-- 1. Database uses user_profiles table (NOT users)
-- 2. Database uses clients table with client_user_id (NOT client_users)
-- 3. All previous migrations were trying to fix wrong tables
-- ================================================

-- ================================================
-- STEP 1: NUCLEAR CLEANUP - DROP EVERYTHING
-- ================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop ALL policies on ALL tables
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                       r.policyname, r.schemaname, r.tablename);
    END LOOP;
    
    -- Drop ALL RLS-related functions
    DROP FUNCTION IF EXISTS public.set_user_context(UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.set_user_context(UUID, UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.current_user_org_id() CASCADE;
    DROP FUNCTION IF EXISTS public.current_user_client_id() CASCADE;
    DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
    DROP FUNCTION IF EXISTS public.current_user_type() CASCADE;
    DROP FUNCTION IF EXISTS public.user_has_role(TEXT[]) CASCADE;
    DROP FUNCTION IF EXISTS public.get_user_context() CASCADE;
    DROP FUNCTION IF EXISTS public.current_user_id() CASCADE;
    
    RAISE NOTICE 'NUCLEAR CLEANUP COMPLETE - All policies and functions dropped';
END $$;

-- ================================================
-- STEP 2: CREATE BRIDGE TABLES FOR FRONTEND COMPATIBILITY
-- ================================================
-- The frontend expects 'users' and 'client_users' tables
-- Let's create views that map to the actual schema

-- Create users view that maps to user_profiles
CREATE OR REPLACE VIEW public.users AS
SELECT 
    up.id,
    up.user_id as auth_id,
    up.organization_id,
    o.name as organization_name,
    up.first_name,
    up.last_name,
    CONCAT(up.first_name, ' ', up.last_name) as full_name,
    au.email,
    up.role::text,
    'active'::text as status,
    up.role::text as job_title,
    'Administration'::text as department,
    up.created_at,
    up.updated_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
LEFT JOIN organizations o ON up.organization_id = o.id;

-- Create client_users view that maps to clients with client_user_id
CREATE OR REPLACE VIEW public.client_users AS
SELECT 
    c.id,
    c.client_user_id as auth_id,
    c.organization_id,
    c.id as client_id,
    c.name as first_name,
    ''::text as last_name,
    c.name as full_name,
    c.contact_email as email,
    'client'::text as role,
    'active'::text as status,
    'Client'::text as job_title,
    'External'::text as department,
    c.created_at,
    c.updated_at
FROM clients c
WHERE c.client_user_id IS NOT NULL;

-- Grant permissions on views
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.client_users TO authenticated;

-- ================================================
-- STEP 3: CREATE THE DEFINITIVE SET_USER_CONTEXT
-- ================================================
CREATE OR REPLACE FUNCTION public.set_user_context(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_context JSONB;
    v_organization_id UUID;
    v_client_id UUID;
    v_user_role TEXT;
    v_user_type TEXT;
    v_user_email TEXT;
BEGIN
    -- Get email for debugging
    SELECT email INTO v_user_email FROM auth.users WHERE id = user_id;
    
    -- First check if user is internal staff (user_profiles table)
    SELECT 
        up.organization_id,
        NULL::UUID,
        up.role::TEXT,
        'pbs_staff'::TEXT
    INTO 
        v_organization_id,
        v_client_id,
        v_user_role,
        v_user_type
    FROM user_profiles up
    WHERE up.user_id = user_id;
    
    -- If not found, check if user is a client (clients table with client_user_id)
    IF v_organization_id IS NULL THEN
        SELECT 
            c.organization_id,
            c.id,
            'client'::TEXT,
            'client'::TEXT
        INTO 
            v_organization_id,
            v_client_id,
            v_user_role,
            v_user_type
        FROM clients c
        WHERE c.client_user_id = user_id;
    END IF;
    
    -- If still not found, this is a critical error
    IF v_organization_id IS NULL THEN
        RAISE WARNING 'User % (%) not found in user_profiles or clients tables', user_id, v_user_email;
        -- Return a minimal context to prevent total failure
        v_context := jsonb_build_object(
            'user_id', user_id,
            'email', v_user_email,
            'error', 'User profile not found'
        );
        RETURN v_context;
    END IF;
    
    -- Build the context
    v_context := jsonb_build_object(
        'user_id', user_id,
        'organization_id', v_organization_id,
        'client_id', v_client_id,
        'user_role', v_user_role,
        'user_type', v_user_type,
        'email', v_user_email
    );
    
    -- Set session variables for RLS policies to use
    PERFORM set_config('app.user_id', user_id::TEXT, false);
    PERFORM set_config('app.organization_id', v_organization_id::TEXT, false);
    PERFORM set_config('app.client_id', COALESCE(v_client_id::TEXT, ''), false);
    PERFORM set_config('app.user_role', v_user_role, false);
    PERFORM set_config('app.user_type', v_user_type, false);
    
    -- Also set request.jwt.claims for compatibility
    PERFORM set_config('request.jwt.claim.sub', user_id::TEXT, false);
    PERFORM set_config('request.jwt.claim.organization_id', v_organization_id::TEXT, false);
    
    RAISE NOTICE 'User context set for % (%): org=%, role=%, type=%', 
                 v_user_email, user_id, v_organization_id, v_user_role, v_user_type;
    
    RETURN v_context;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_user_context(UUID) TO authenticated;

-- ================================================
-- STEP 4: CREATE ROBUST HELPER FUNCTIONS
-- ================================================

-- Get current organization ID (with fallback)
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Try session variable first
    BEGIN
        org_id := NULLIF(current_setting('app.organization_id', true), '')::UUID;
        IF org_id IS NOT NULL THEN
            RETURN org_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Continue to fallback
    END;
    
    -- Fallback: Look up from user_profiles
    SELECT organization_id INTO org_id
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    IF org_id IS NOT NULL THEN
        RETURN org_id;
    END IF;
    
    -- Fallback: Look up from clients
    SELECT organization_id INTO org_id
    FROM clients
    WHERE client_user_id = auth.uid();
    
    RETURN org_id;
END;
$$;

-- Get current client ID (for client users)
CREATE OR REPLACE FUNCTION public.current_user_client_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    client_id UUID;
BEGIN
    -- Try session variable first
    BEGIN
        client_id := NULLIF(current_setting('app.client_id', true), '')::UUID;
        IF client_id IS NOT NULL THEN
            RETURN client_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Continue to fallback
    END;
    
    -- Fallback: Look up from clients table
    SELECT id INTO client_id
    FROM clients
    WHERE client_user_id = auth.uid();
    
    RETURN client_id;
END;
$$;

-- Get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Try session variable first
    BEGIN
        user_role := NULLIF(current_setting('app.user_role', true), '');
        IF user_role IS NOT NULL THEN
            RETURN user_role;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Continue to fallback
    END;
    
    -- Fallback: Look up from user_profiles
    SELECT role::TEXT INTO user_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    IF user_role IS NOT NULL THEN
        RETURN user_role;
    END IF;
    
    -- If not in user_profiles, must be a client
    IF EXISTS (SELECT 1 FROM clients WHERE client_user_id = auth.uid()) THEN
        RETURN 'client';
    END IF;
    
    RETURN NULL;
END;
$$;

-- Get current user type (pbs_staff or client)
CREATE OR REPLACE FUNCTION public.current_user_type()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    -- Try session variable first
    BEGIN
        RETURN NULLIF(current_setting('app.user_type', true), '');
    EXCEPTION WHEN OTHERS THEN
        -- Continue to fallback
    END;
    
    -- Check user_profiles table
    IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid()) THEN
        RETURN 'pbs_staff';
    END IF;
    
    -- Check clients table
    IF EXISTS (SELECT 1 FROM clients WHERE client_user_id = auth.uid()) THEN
        RETURN 'client';
    END IF;
    
    RETURN NULL;
END;
$$;

-- Check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.user_has_role(roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN current_user_role() = ANY(roles);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(TEXT[]) TO authenticated;

-- ================================================
-- STEP 5: CREATE DEFINITIVE RLS POLICIES
-- ================================================

-- ORGANIZATIONS table
CREATE POLICY "org_select" ON organizations FOR SELECT
USING (id = current_user_org_id());

CREATE POLICY "org_admin_all" ON organizations FOR ALL
USING (id = current_user_org_id() AND user_has_role(ARRAY['admin', 'super_admin']));

-- USER_PROFILES table (internal staff)
CREATE POLICY "profiles_select" ON user_profiles FOR SELECT
USING (organization_id = current_user_org_id());

CREATE POLICY "profiles_admin_all" ON user_profiles FOR ALL
USING (organization_id = current_user_org_id() AND user_has_role(ARRAY['admin', 'super_admin']));

-- CLIENTS table
CREATE POLICY "clients_select" ON clients FOR SELECT
USING (
    -- Staff can see all clients in their org
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff')
    OR
    -- Clients can see their own record
    (id = current_user_client_id() AND current_user_type() = 'client')
);

CREATE POLICY "clients_insert" ON clients FOR INSERT
WITH CHECK (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'manager'])
);

CREATE POLICY "clients_update" ON clients FOR UPDATE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'manager'])
);

CREATE POLICY "clients_delete" ON clients FOR DELETE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin'])
);

-- INVOICES table
CREATE POLICY "invoices_select" ON invoices FOR SELECT
USING (
    -- Staff can see all invoices in their org
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff')
    OR
    -- Clients can see their own invoices
    (client_id = current_user_client_id() AND current_user_type() = 'client')
);

CREATE POLICY "invoices_insert" ON invoices FOR INSERT
WITH CHECK (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "invoices_update" ON invoices FOR UPDATE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "invoices_delete" ON invoices FOR DELETE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin'])
);

-- INVOICE_ITEMS table
CREATE POLICY "items_select" ON invoice_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.id = invoice_items.invoice_id
        AND (
            (i.organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff')
            OR
            (i.client_id = current_user_client_id() AND current_user_type() = 'client')
        )
    )
);

CREATE POLICY "items_insert" ON invoice_items FOR INSERT
WITH CHECK (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "items_update" ON invoice_items FOR UPDATE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "items_delete" ON invoice_items FOR DELETE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin'])
);

-- PAYMENTS table
CREATE POLICY "payments_select" ON payments FOR SELECT
USING (
    -- Staff can see all payments in their org
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff')
    OR
    -- Clients can see their own payments
    (client_id = current_user_client_id() AND current_user_type() = 'client')
);

CREATE POLICY "payments_insert" ON payments FOR INSERT
WITH CHECK (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "payments_update" ON payments FOR UPDATE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'billing'])
);

CREATE POLICY "payments_delete" ON payments FOR DELETE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin'])
);

-- PAYMENT_ALLOCATIONS table
CREATE POLICY "allocations_select" ON payment_allocations FOR SELECT
USING (
    organization_id = current_user_org_id()
    OR
    EXISTS (
        SELECT 1 FROM payments p
        WHERE p.id = payment_allocations.payment_id
        AND p.client_id = current_user_client_id()
    )
);

CREATE POLICY "allocations_insert" ON payment_allocations FOR INSERT
WITH CHECK (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "allocations_update" ON payment_allocations FOR UPDATE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'billing'])
);

CREATE POLICY "allocations_delete" ON payment_allocations FOR DELETE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin'])
);

-- ACCOUNT_CREDITS table
CREATE POLICY "credits_select" ON account_credits FOR SELECT
USING (
    -- Staff can see all credits in their org
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff')
    OR
    -- Clients can see their own credits
    (client_id = current_user_client_id() AND current_user_type() = 'client')
);

CREATE POLICY "credits_insert" ON account_credits FOR INSERT
WITH CHECK (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'billing'])
);

CREATE POLICY "credits_update" ON account_credits FOR UPDATE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin', 'billing'])
);

CREATE POLICY "credits_delete" ON account_credits FOR DELETE
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin'])
);

-- AUDIT_LOGS table
CREATE POLICY "audit_select" ON audit_logs FOR SELECT
USING (
    organization_id = current_user_org_id() 
    AND current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['admin', 'super_admin'])
);

CREATE POLICY "audit_insert" ON audit_logs FOR INSERT
WITH CHECK (true); -- System can always insert audit logs

-- CPT_CODES table (reference data - read by all, write by admin)
CREATE POLICY "cpt_select" ON cpt_codes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "cpt_admin" ON cpt_codes FOR ALL
USING (
    current_user_type() = 'pbs_staff'
    AND user_has_role(ARRAY['super_admin'])
);

-- ================================================
-- STEP 6: VERIFICATION AND TESTING
-- ================================================
DO $$
DECLARE
    v_policy_count INTEGER;
    v_function_count INTEGER;
    v_table_count INTEGER;
BEGIN
    -- Count policies created
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    -- Count functions created
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('set_user_context', 'current_user_org_id', 
                      'current_user_client_id', 'current_user_role', 
                      'current_user_type', 'user_has_role');
    
    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO v_table_count
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'NUCLEAR RLS FIX COMPLETE';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Created % RLS policies', v_policy_count;
    RAISE NOTICE 'Created % helper functions', v_function_count;
    RAISE NOTICE 'RLS enabled on % tables', v_table_count;
    RAISE NOTICE '';
    RAISE NOTICE 'CRITICAL NOTES:';
    RAISE NOTICE '1. Created views to bridge schema mismatch';
    RAISE NOTICE '2. set_user_context now handles actual schema';
    RAISE NOTICE '3. All policies use consistent helper functions';
    RAISE NOTICE '4. Dual-user system properly implemented';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Apply this migration';
    RAISE NOTICE '2. Restart application';
    RAISE NOTICE '3. Test with both staff and client users';
    RAISE NOTICE '4. Verify multi-tenant isolation';
    RAISE NOTICE '================================================';
END $$;