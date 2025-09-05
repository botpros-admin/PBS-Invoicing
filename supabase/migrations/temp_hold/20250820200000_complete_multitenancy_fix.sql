-- ================================================
-- COMPLETE MULTI-TENANT FIX WITH PROPER CONTEXT
-- ================================================
-- Date: 2025-08-20
-- Purpose: Fix multi-tenant isolation with proper set_user_context
-- This builds on existing functions and fixes the broken parts
-- ================================================

-- ================================================
-- STEP 1: DROP ALL EXISTING PROBLEMATIC FUNCTIONS
-- ================================================
DROP FUNCTION IF EXISTS public.set_user_context(UUID);
DROP FUNCTION IF EXISTS public.current_user_id();
DROP FUNCTION IF EXISTS public.current_user_org_id();
DROP FUNCTION IF EXISTS public.current_user_client_id();

-- ================================================
-- STEP 2: CREATE PROPER SET_USER_CONTEXT
-- ================================================
-- This function properly sets the user context including organization_id
CREATE OR REPLACE FUNCTION public.set_user_context(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_organization_id UUID;
    v_client_id UUID;
    v_user_role TEXT;
    v_user_type TEXT;
    v_context JSONB;
BEGIN
    -- First check PBS staff users table
    SELECT 
        u.id,
        u.organization_id,
        u.role::TEXT,
        NULL::UUID as client_id,
        'pbs_staff'::TEXT as user_type
    INTO 
        v_user_id,
        v_organization_id,
        v_user_role,
        v_client_id,
        v_user_type
    FROM public.users u
    WHERE u.auth_id = user_id
    LIMIT 1;

    -- If not found, check client users table
    IF v_user_id IS NULL THEN
        SELECT 
            cu.id,
            cu.organization_id,
            cu.role::TEXT,
            cu.client_id,
            'client'::TEXT as user_type
        INTO 
            v_user_id,
            v_organization_id,
            v_user_role,
            v_client_id,
            v_user_type
        FROM public.client_users cu
        WHERE cu.auth_id = user_id
        LIMIT 1;
    END IF;

    -- If still not found, return error
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User profile not found for auth_id: %', user_id;
    END IF;

    -- Build context JSON
    v_context := jsonb_build_object(
        'user_id', v_user_id,
        'auth_id', user_id,
        'organization_id', v_organization_id,
        'client_id', v_client_id,
        'user_role', v_user_role,
        'user_type', v_user_type
    );

    -- Set multiple session variables for different access patterns
    PERFORM set_config('app.user_context', v_context::TEXT, false);
    PERFORM set_config('app.organization_id', COALESCE(v_organization_id::TEXT, ''), false);
    PERFORM set_config('app.client_id', COALESCE(v_client_id::TEXT, ''), false);
    PERFORM set_config('app.user_role', COALESCE(v_user_role, ''), false);
    PERFORM set_config('app.user_type', COALESCE(v_user_type, ''), false);
    
    -- Also set for request.jwt compatibility
    PERFORM set_config('request.jwt.claim.sub', user_id::TEXT, false);
    PERFORM set_config('request.jwt.claim.organization_id', COALESCE(v_organization_id::TEXT, ''), false);

    -- Return the context for debugging
    RETURN v_context;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_user_context(UUID) TO authenticated;

-- ================================================
-- STEP 3: CREATE HELPER FUNCTIONS FOR RLS
-- ================================================

-- Get current user's organization ID from session
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
BEGIN
    -- Try to get from session first
    RETURN NULLIF(current_setting('app.organization_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to looking it up
        DECLARE
            org_id UUID;
        BEGIN
            -- Check users table
            SELECT organization_id INTO org_id
            FROM users
            WHERE auth_id = auth.uid();
            
            IF org_id IS NOT NULL THEN
                RETURN org_id;
            END IF;
            
            -- Check client_users table
            SELECT organization_id INTO org_id
            FROM client_users
            WHERE auth_id = auth.uid();
            
            RETURN org_id;
        END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current user's client ID from session
CREATE OR REPLACE FUNCTION public.current_user_client_id()
RETURNS UUID AS $$
BEGIN
    -- Try to get from session first
    RETURN NULLIF(current_setting('app.client_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to looking it up
        DECLARE
            client_id UUID;
        BEGIN
            SELECT client_id INTO client_id
            FROM client_users
            WHERE auth_id = auth.uid();
            
            RETURN client_id;
        END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current user's role from session
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
BEGIN
    -- Try to get from session first
    RETURN NULLIF(current_setting('app.user_role', true), '');
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to looking it up
        DECLARE
            user_role TEXT;
        BEGIN
            -- Check users table
            SELECT role::TEXT INTO user_role
            FROM users
            WHERE auth_id = auth.uid();
            
            IF user_role IS NOT NULL THEN
                RETURN user_role;
            END IF;
            
            -- Check client_users table
            SELECT role::TEXT INTO user_role
            FROM client_users
            WHERE auth_id = auth.uid();
            
            RETURN user_role;
        END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current user type (pbs_staff or client)
CREATE OR REPLACE FUNCTION public.current_user_type()
RETURNS TEXT AS $$
BEGIN
    -- Try to get from session first
    RETURN NULLIF(current_setting('app.user_type', true), '');
EXCEPTION
    WHEN OTHERS THEN
        -- Determine based on which table has the user
        IF EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid()) THEN
            RETURN 'pbs_staff';
        ELSIF EXISTS (SELECT 1 FROM client_users WHERE auth_id = auth.uid()) THEN
            RETURN 'client';
        ELSE
            RETURN NULL;
        END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.user_has_role(roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user_role() = ANY(roles);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(TEXT[]) TO authenticated;

-- ================================================
-- STEP 4: DROP TEMPORARY RESTRICTIVE POLICIES
-- ================================================
-- Drop all the USING(false) policies that block everything
DROP POLICY IF EXISTS "invoices_temp_restricted" ON invoices;
DROP POLICY IF EXISTS "clients_temp_restricted" ON clients;
DROP POLICY IF EXISTS "invoice_items_temp_restricted" ON invoice_items;
DROP POLICY IF EXISTS "payments_temp_restricted" ON payments;
DROP POLICY IF EXISTS "payment_allocations_temp_restricted" ON payment_allocations;
DROP POLICY IF EXISTS "account_credits_temp_restricted" ON account_credits;
DROP POLICY IF EXISTS "audit_logs_temp_restricted_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_temp_restricted_update" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_temp_restricted_delete" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_allow_insert" ON audit_logs;
DROP POLICY IF EXISTS "cpt_codes_temp_restricted" ON cpt_codes;

-- ================================================
-- STEP 5: CREATE PROPER MULTI-TENANT RLS POLICIES
-- ================================================

-- INVOICES table policies
CREATE POLICY "invoices_select" ON invoices FOR SELECT
USING (
    -- PBS staff see invoices from their organization
    (current_user_type() = 'pbs_staff' AND organization_id = current_user_org_id())
    OR
    -- Client users see invoices for their client
    (current_user_type() = 'client' AND client_id = current_user_client_id())
);

CREATE POLICY "invoices_insert" ON invoices FOR INSERT
WITH CHECK (
    current_user_type() = 'pbs_staff' 
    AND organization_id = current_user_org_id()
    AND user_has_role(ARRAY['super_admin', 'admin', 'billing'])
);

CREATE POLICY "invoices_update" ON invoices FOR UPDATE
USING (
    current_user_type() = 'pbs_staff' 
    AND organization_id = current_user_org_id()
    AND user_has_role(ARRAY['super_admin', 'admin', 'billing'])
)
WITH CHECK (
    organization_id = current_user_org_id()
);

CREATE POLICY "invoices_delete" ON invoices FOR DELETE
USING (
    current_user_type() = 'pbs_staff' 
    AND organization_id = current_user_org_id()
    AND user_has_role(ARRAY['super_admin', 'admin'])
);

-- CLIENTS table policies
CREATE POLICY "clients_select" ON clients FOR SELECT
USING (
    -- PBS staff see clients from their organization
    (current_user_type() = 'pbs_staff' AND organization_id = current_user_org_id())
    OR
    -- Client users see their own client record
    (current_user_type() = 'client' AND id = current_user_client_id())
);

CREATE POLICY "clients_insert" ON clients FOR INSERT
WITH CHECK (
    current_user_type() = 'pbs_staff' 
    AND organization_id = current_user_org_id()
    AND user_has_role(ARRAY['super_admin', 'admin', 'manager'])
);

CREATE POLICY "clients_update" ON clients FOR UPDATE
USING (
    current_user_type() = 'pbs_staff' 
    AND organization_id = current_user_org_id()
    AND user_has_role(ARRAY['super_admin', 'admin', 'manager'])
)
WITH CHECK (
    organization_id = current_user_org_id()
);

CREATE POLICY "clients_delete" ON clients FOR DELETE
USING (
    current_user_type() = 'pbs_staff' 
    AND organization_id = current_user_org_id()
    AND user_has_role(ARRAY['super_admin', 'admin'])
);

-- INVOICE_ITEMS table policies
CREATE POLICY "invoice_items_select" ON invoice_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.id = invoice_items.invoice_id
        AND (
            (current_user_type() = 'pbs_staff' AND i.organization_id = current_user_org_id())
            OR
            (current_user_type() = 'client' AND i.client_id = current_user_client_id())
        )
    )
);

CREATE POLICY "invoice_items_insert" ON invoice_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.id = invoice_items.invoice_id
        AND current_user_type() = 'pbs_staff'
        AND i.organization_id = current_user_org_id()
        AND user_has_role(ARRAY['super_admin', 'admin', 'billing'])
    )
);

CREATE POLICY "invoice_items_update" ON invoice_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.id = invoice_items.invoice_id
        AND current_user_type() = 'pbs_staff'
        AND i.organization_id = current_user_org_id()
        AND user_has_role(ARRAY['super_admin', 'admin', 'billing'])
    )
);

CREATE POLICY "invoice_items_delete" ON invoice_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.id = invoice_items.invoice_id
        AND current_user_type() = 'pbs_staff'
        AND i.organization_id = current_user_org_id()
        AND user_has_role(ARRAY['super_admin', 'admin'])
    )
);

-- PAYMENTS table policies
CREATE POLICY "payments_select" ON payments FOR SELECT
USING (
    -- PBS staff see payments from their organization
    (current_user_type() = 'pbs_staff' AND organization_id = current_user_org_id())
    OR
    -- Client users see payments for their client
    (current_user_type() = 'client' AND client_id = current_user_client_id())
);

CREATE POLICY "payments_insert" ON payments FOR INSERT
WITH CHECK (
    current_user_type() = 'pbs_staff' 
    AND organization_id = current_user_org_id()
    AND user_has_role(ARRAY['super_admin', 'admin', 'billing'])
);

CREATE POLICY "payments_update" ON payments FOR UPDATE
USING (
    current_user_type() = 'pbs_staff' 
    AND organization_id = current_user_org_id()
    AND user_has_role(ARRAY['super_admin', 'admin', 'billing'])
)
WITH CHECK (
    organization_id = current_user_org_id()
);

CREATE POLICY "payments_delete" ON payments FOR DELETE
USING (
    current_user_type() = 'pbs_staff' 
    AND organization_id = current_user_org_id()
    AND user_has_role(ARRAY['super_admin', 'admin'])
);

-- PAYMENT_ALLOCATIONS table policies
CREATE POLICY "payment_allocations_select" ON payment_allocations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM payments p
        WHERE p.id = payment_allocations.payment_id
        AND (
            (current_user_type() = 'pbs_staff' AND p.organization_id = current_user_org_id())
            OR
            (current_user_type() = 'client' AND p.client_id = current_user_client_id())
        )
    )
);

CREATE POLICY "payment_allocations_insert" ON payment_allocations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM payments p
        WHERE p.id = payment_allocations.payment_id
        AND current_user_type() = 'pbs_staff'
        AND p.organization_id = current_user_org_id()
        AND user_has_role(ARRAY['super_admin', 'admin', 'billing'])
    )
);

CREATE POLICY "payment_allocations_update" ON payment_allocations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM payments p
        WHERE p.id = payment_allocations.payment_id
        AND current_user_type() = 'pbs_staff'
        AND p.organization_id = current_user_org_id()
        AND user_has_role(ARRAY['super_admin', 'admin', 'billing'])
    )
);

CREATE POLICY "payment_allocations_delete" ON payment_allocations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM payments p
        WHERE p.id = payment_allocations.payment_id
        AND current_user_type() = 'pbs_staff'
        AND p.organization_id = current_user_org_id()
        AND user_has_role(ARRAY['super_admin', 'admin'])
    )
);

-- ACCOUNT_CREDITS table policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_credits') THEN
        EXECUTE 'CREATE POLICY "account_credits_select" ON account_credits FOR SELECT
        USING (
            (current_user_type() = ''pbs_staff'' AND organization_id = current_user_org_id())
            OR
            (current_user_type() = ''client'' AND client_id = current_user_client_id())
        )';
        
        EXECUTE 'CREATE POLICY "account_credits_insert" ON account_credits FOR INSERT
        WITH CHECK (
            current_user_type() = ''pbs_staff'' 
            AND organization_id = current_user_org_id()
            AND user_has_role(ARRAY[''super_admin'', ''admin'', ''billing''])
        )';
        
        EXECUTE 'CREATE POLICY "account_credits_update" ON account_credits FOR UPDATE
        USING (
            current_user_type() = ''pbs_staff'' 
            AND organization_id = current_user_org_id()
            AND user_has_role(ARRAY[''super_admin'', ''admin'', ''billing''])
        )
        WITH CHECK (
            organization_id = current_user_org_id()
        )';
        
        EXECUTE 'CREATE POLICY "account_credits_delete" ON account_credits FOR DELETE
        USING (
            current_user_type() = ''pbs_staff'' 
            AND organization_id = current_user_org_id()
            AND user_has_role(ARRAY[''super_admin'', ''admin''])
        )';
    END IF;
END $$;

-- AUDIT_LOGS table policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        EXECUTE 'CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
        USING (
            current_user_type() = ''pbs_staff'' 
            AND organization_id = current_user_org_id()
            AND user_has_role(ARRAY[''super_admin'', ''admin''])
        )';
        
        EXECUTE 'CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
        WITH CHECK (true)'; -- Allow system to insert audit logs
    END IF;
END $$;

-- CPT_CODES table policies (reference data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cpt_codes') THEN
        EXECUTE 'CREATE POLICY "cpt_codes_select" ON cpt_codes FOR SELECT
        USING (auth.uid() IS NOT NULL)'; -- All authenticated users can read
        
        EXECUTE 'CREATE POLICY "cpt_codes_insert" ON cpt_codes FOR INSERT
        WITH CHECK (
            current_user_type() = ''pbs_staff''
            AND user_has_role(ARRAY[''super_admin''])
        )';
        
        EXECUTE 'CREATE POLICY "cpt_codes_update" ON cpt_codes FOR UPDATE
        USING (
            current_user_type() = ''pbs_staff''
            AND user_has_role(ARRAY[''super_admin''])
        )';
    END IF;
END $$;

-- ================================================
-- STEP 6: VERIFICATION
-- ================================================
DO $$
DECLARE
    policy_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('invoices', 'clients', 'invoice_items', 'payments', 'payment_allocations');
    
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('set_user_context', 'current_user_org_id', 'current_user_client_id', 'current_user_role', 'current_user_type');
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'MULTI-TENANT FIX APPLIED SUCCESSFULLY';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Created % RLS policies', policy_count;
    RAISE NOTICE 'Created % helper functions', function_count;
    RAISE NOTICE '';
    RAISE NOTICE 'CRITICAL NEXT STEPS:';
    RAISE NOTICE '1. Restart your application';
    RAISE NOTICE '2. Test login with different user types';
    RAISE NOTICE '3. Verify set_user_context is being called';
    RAISE NOTICE '4. Test data isolation between organizations';
    RAISE NOTICE '================================================';
END $$;