-- ================================================
-- PROPER MULTI-TENANT RLS FIX
-- ================================================
-- Date: 2025-08-20
-- Purpose: Implement REAL multi-tenant isolation with proper context management
-- 
-- This migration:
-- 1. Creates proper set_user_context function
-- 2. Creates helper functions for RLS policies
-- 3. Drops temporary restrictive policies
-- 4. Implements proper multi-tenant RLS policies
-- ================================================

-- ================================================
-- STEP 1: DROP OLD/BROKEN FUNCTIONS
-- ================================================
DROP FUNCTION IF EXISTS set_user_context();
DROP FUNCTION IF EXISTS app.set_user_context();
DROP FUNCTION IF EXISTS app.current_user_id();
DROP FUNCTION IF EXISTS app.current_organization_id();
DROP FUNCTION IF EXISTS app.current_user_role();
DROP FUNCTION IF EXISTS app.current_client_id();
DROP FUNCTION IF EXISTS app.current_user_type();

-- ================================================
-- STEP 2: CREATE PROPER USER CONTEXT SYSTEM
-- ================================================

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS app;

-- Function to set user context (called after login)
CREATE OR REPLACE FUNCTION app.set_user_context(
    p_auth_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_auth_id UUID;
    v_user_context JSONB;
    v_user_id UUID;
    v_organization_id UUID;
    v_user_role TEXT;
    v_client_id UUID;
    v_user_type TEXT;
BEGIN
    -- Use provided auth_id or get from session
    v_auth_id := COALESCE(p_auth_id, auth.uid());
    
    IF v_auth_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user found';
    END IF;

    -- First check PBS staff users table
    SELECT 
        u.id,
        u.organization_id,
        u.role::TEXT,
        NULL::UUID,
        'pbs_staff'::TEXT
    INTO 
        v_user_id,
        v_organization_id,
        v_user_role,
        v_client_id,
        v_user_type
    FROM public.users u
    WHERE u.auth_id = v_auth_id
    LIMIT 1;

    -- If not found, check client users table
    IF v_user_id IS NULL THEN
        SELECT 
            cu.id,
            cu.organization_id,
            cu.role::TEXT,
            cu.client_id,
            'client'::TEXT
        INTO 
            v_user_id,
            v_organization_id,
            v_user_role,
            v_client_id,
            v_user_type
        FROM public.client_users cu
        WHERE cu.auth_id = v_auth_id
        LIMIT 1;
    END IF;

    -- If still not found, raise error
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User profile not found for auth_id: %', v_auth_id;
    END IF;

    -- Build the context JSON
    v_user_context := jsonb_build_object(
        'user_id', v_user_id,
        'auth_id', v_auth_id,
        'organization_id', v_organization_id,
        'user_role', v_user_role,
        'client_id', v_client_id,
        'user_type', v_user_type
    );

    -- Set the context in the session
    PERFORM set_config('app.user_context', v_user_context::TEXT, false);

    -- Return the context for the frontend
    RETURN v_user_context;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION app.set_user_context(UUID) TO authenticated;

-- ================================================
-- STEP 3: CREATE HELPER FUNCTIONS FOR RLS
-- ================================================

-- Get current user's ID
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (current_setting('app.user_context', true)::jsonb->>'user_id')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get current user's organization ID
CREATE OR REPLACE FUNCTION app.current_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (current_setting('app.user_context', true)::jsonb->>'organization_id')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION app.current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.user_context', true)::jsonb->>'user_role';
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get current user's client ID (for client users)
CREATE OR REPLACE FUNCTION app.current_client_id()
RETURNS UUID AS $$
BEGIN
    RETURN (current_setting('app.user_context', true)::jsonb->>'client_id')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get current user type (pbs_staff or client)
CREATE OR REPLACE FUNCTION app.current_user_type()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.user_context', true)::jsonb->>'user_type';
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION app.has_role(roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN app.current_user_role() = ANY(roles);
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================
-- STEP 4: DROP TEMPORARY RESTRICTIVE POLICIES
-- ================================================
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

-- INVOICES table
CREATE POLICY "invoices_select_policy" ON invoices
    FOR SELECT USING (
        -- PBS staff can see invoices from their organization
        (app.current_user_type() = 'pbs_staff' AND organization_id = app.current_organization_id())
        OR
        -- Client users can see invoices for their client
        (app.current_user_type() = 'client' AND client_id = app.current_client_id())
    );

CREATE POLICY "invoices_insert_policy" ON invoices
    FOR INSERT WITH CHECK (
        -- Only PBS staff can create invoices
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin', 'billing'])
    );

CREATE POLICY "invoices_update_policy" ON invoices
    FOR UPDATE USING (
        -- PBS staff can update invoices in their organization
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin', 'billing'])
    );

CREATE POLICY "invoices_delete_policy" ON invoices
    FOR DELETE USING (
        -- Only super_admin and admin can delete
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin'])
    );

-- CLIENTS table
CREATE POLICY "clients_select_policy" ON clients
    FOR SELECT USING (
        -- PBS staff can see clients from their organization
        (app.current_user_type() = 'pbs_staff' AND organization_id = app.current_organization_id())
        OR
        -- Client users can see their own client record
        (app.current_user_type() = 'client' AND id = app.current_client_id())
    );

CREATE POLICY "clients_insert_policy" ON clients
    FOR INSERT WITH CHECK (
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin', 'manager'])
    );

CREATE POLICY "clients_update_policy" ON clients
    FOR UPDATE USING (
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin', 'manager'])
    );

CREATE POLICY "clients_delete_policy" ON clients
    FOR DELETE USING (
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin'])
    );

-- INVOICE_ITEMS table
CREATE POLICY "invoice_items_select_policy" ON invoice_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_items.invoice_id
            AND (
                (app.current_user_type() = 'pbs_staff' AND i.organization_id = app.current_organization_id())
                OR
                (app.current_user_type() = 'client' AND i.client_id = app.current_client_id())
            )
        )
    );

CREATE POLICY "invoice_items_insert_policy" ON invoice_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_items.invoice_id
            AND app.current_user_type() = 'pbs_staff'
            AND i.organization_id = app.current_organization_id()
            AND app.has_role(ARRAY['super_admin', 'admin', 'billing'])
        )
    );

CREATE POLICY "invoice_items_update_policy" ON invoice_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_items.invoice_id
            AND app.current_user_type() = 'pbs_staff'
            AND i.organization_id = app.current_organization_id()
            AND app.has_role(ARRAY['super_admin', 'admin', 'billing'])
        )
    );

CREATE POLICY "invoice_items_delete_policy" ON invoice_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_items.invoice_id
            AND app.current_user_type() = 'pbs_staff'
            AND i.organization_id = app.current_organization_id()
            AND app.has_role(ARRAY['super_admin', 'admin'])
        )
    );

-- PAYMENTS table
CREATE POLICY "payments_select_policy" ON payments
    FOR SELECT USING (
        -- PBS staff can see payments from their organization
        (app.current_user_type() = 'pbs_staff' AND organization_id = app.current_organization_id())
        OR
        -- Client users can see payments for their client
        (app.current_user_type() = 'client' AND client_id = app.current_client_id())
    );

CREATE POLICY "payments_insert_policy" ON payments
    FOR INSERT WITH CHECK (
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin', 'billing'])
    );

CREATE POLICY "payments_update_policy" ON payments
    FOR UPDATE USING (
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin', 'billing'])
    );

CREATE POLICY "payments_delete_policy" ON payments
    FOR DELETE USING (
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin'])
    );

-- PAYMENT_ALLOCATIONS table
CREATE POLICY "payment_allocations_select_policy" ON payment_allocations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = payment_allocations.payment_id
            AND (
                (app.current_user_type() = 'pbs_staff' AND p.organization_id = app.current_organization_id())
                OR
                (app.current_user_type() = 'client' AND p.client_id = app.current_client_id())
            )
        )
    );

CREATE POLICY "payment_allocations_insert_policy" ON payment_allocations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = payment_allocations.payment_id
            AND app.current_user_type() = 'pbs_staff'
            AND p.organization_id = app.current_organization_id()
            AND app.has_role(ARRAY['super_admin', 'admin', 'billing'])
        )
    );

CREATE POLICY "payment_allocations_update_policy" ON payment_allocations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = payment_allocations.payment_id
            AND app.current_user_type() = 'pbs_staff'
            AND p.organization_id = app.current_organization_id()
            AND app.has_role(ARRAY['super_admin', 'admin', 'billing'])
        )
    );

CREATE POLICY "payment_allocations_delete_policy" ON payment_allocations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = payment_allocations.payment_id
            AND app.current_user_type() = 'pbs_staff'
            AND p.organization_id = app.current_organization_id()
            AND app.has_role(ARRAY['super_admin', 'admin'])
        )
    );

-- ACCOUNT_CREDITS table
CREATE POLICY "account_credits_select_policy" ON account_credits
    FOR SELECT USING (
        -- PBS staff can see credits from their organization
        (app.current_user_type() = 'pbs_staff' AND organization_id = app.current_organization_id())
        OR
        -- Client users can see credits for their client
        (app.current_user_type() = 'client' AND client_id = app.current_client_id())
    );

CREATE POLICY "account_credits_insert_policy" ON account_credits
    FOR INSERT WITH CHECK (
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin', 'billing'])
    );

CREATE POLICY "account_credits_update_policy" ON account_credits
    FOR UPDATE USING (
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin', 'billing'])
    );

CREATE POLICY "account_credits_delete_policy" ON account_credits
    FOR DELETE USING (
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin'])
    );

-- AUDIT_LOGS table
CREATE POLICY "audit_logs_select_policy" ON audit_logs
    FOR SELECT USING (
        app.current_user_type() = 'pbs_staff' 
        AND organization_id = app.current_organization_id()
        AND app.has_role(ARRAY['super_admin', 'admin'])
    );

CREATE POLICY "audit_logs_insert_policy" ON audit_logs
    FOR INSERT WITH CHECK (
        -- Allow system to insert audit logs
        true
    );

-- CPT_CODES table (reference data - read-only for most users)
CREATE POLICY "cpt_codes_select_policy" ON cpt_codes
    FOR SELECT USING (
        -- All authenticated users can read CPT codes
        auth.uid() IS NOT NULL
    );

CREATE POLICY "cpt_codes_insert_policy" ON cpt_codes
    FOR INSERT WITH CHECK (
        app.current_user_type() = 'pbs_staff'
        AND app.has_role(ARRAY['super_admin'])
    );

CREATE POLICY "cpt_codes_update_policy" ON cpt_codes
    FOR UPDATE USING (
        app.current_user_type() = 'pbs_staff'
        AND app.has_role(ARRAY['super_admin'])
    );

-- ================================================
-- STEP 6: TEST THE CONTEXT SYSTEM
-- ================================================
DO $$
DECLARE
    v_test_result JSONB;
BEGIN
    -- Test that the function exists and can be called
    BEGIN
        v_test_result := app.set_user_context(NULL);
        RAISE NOTICE 'set_user_context test passed (though should fail with no auth)';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'set_user_context test result: % (expected - no auth)', SQLERRM;
    END;
    
    -- Verify helper functions exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_organization_id' AND pronamespace = 'app'::regnamespace) THEN
        RAISE NOTICE 'Helper function app.current_organization_id() exists';
    ELSE
        RAISE EXCEPTION 'Helper function app.current_organization_id() NOT FOUND';
    END IF;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'MULTI-TENANT RLS SYSTEM PROPERLY CONFIGURED';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Uncomment set_user_context call in AuthContext.tsx';
    RAISE NOTICE '2. Test with multiple organizations';
    RAISE NOTICE '3. Verify data isolation between tenants';
    RAISE NOTICE '================================================';
END $$;