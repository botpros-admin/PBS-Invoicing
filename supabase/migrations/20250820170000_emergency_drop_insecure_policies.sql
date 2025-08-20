-- ================================================
-- EMERGENCY: DROP ALL INSECURE RLS POLICIES
-- ================================================
-- Date: 2025-08-20
-- Severity: CRITICAL - IMMEDIATE ACTION REQUIRED
-- Purpose: Remove catastrophic security vulnerability where ANY authenticated 
--          user can access ALL data from ANY tenant
-- ================================================

-- Log the emergency action
DO $$
BEGIN
    RAISE WARNING '================================================';
    RAISE WARNING 'EMERGENCY RLS POLICY REMOVAL IN PROGRESS';
    RAISE WARNING 'Dropping all insecure is_authenticated() policies';
    RAISE WARNING 'These policies allowed ANY user to access ALL data';
    RAISE WARNING '================================================';
END $$;

-- ================================================
-- DROP ALL DISASTER POLICIES THAT USE is_authenticated()
-- ================================================

-- INVOICES table - DROP the security disaster policies
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON invoices;

-- CLIENTS table - DROP the security disaster policies  
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON clients;

-- INVOICE_ITEMS table - DROP the security disaster policies
DROP POLICY IF EXISTS "Authenticated users can view invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Authenticated users can manage invoice items" ON invoice_items;

-- PAYMENTS table - DROP the security disaster policies
DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can manage payments" ON payments;

-- PAYMENT_ALLOCATIONS table - DROP the security disaster policies
DROP POLICY IF EXISTS "Authenticated users can view payment allocations" ON payment_allocations;
DROP POLICY IF EXISTS "Authenticated users can manage payment allocations" ON payment_allocations;

-- ACCOUNT_CREDITS table - DROP the security disaster policies
DROP POLICY IF EXISTS "Authenticated users can view account credits" ON account_credits;
DROP POLICY IF EXISTS "Authenticated users can manage account credits" ON account_credits;

-- AUDIT_LOGS table - DROP the security disaster policies
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;

-- CPT_CODES table - DROP the security disaster policy
DROP POLICY IF EXISTS "Authenticated users can view cpt codes" ON cpt_codes;

-- ================================================
-- VERIFICATION: Ensure all disaster policies are gone
-- ================================================
DO $$
DECLARE
    policy_count INTEGER;
    bad_policies TEXT[];
BEGIN
    -- Count remaining policies that use the insecure pattern
    SELECT COUNT(*), array_agg(policyname)
    INTO policy_count, bad_policies
    FROM pg_policies
    WHERE schemaname = 'public'
    AND (
        policyname LIKE 'Authenticated users can%'
        OR policyname LIKE 'System can create audit logs'
    );
    
    IF policy_count > 0 THEN
        RAISE EXCEPTION 'CRITICAL: Failed to drop all insecure policies. Remaining: %', bad_policies;
    ELSE
        RAISE NOTICE 'SUCCESS: All insecure is_authenticated() policies have been dropped';
        RAISE NOTICE 'TABLES SECURED: invoices, clients, invoice_items, payments, payment_allocations, account_credits, audit_logs, cpt_codes';
    END IF;
END $$;

-- ================================================
-- CREATE TEMPORARY RESTRICTIVE POLICIES
-- ================================================
-- These are TEMPORARY policies that deny all access until proper 
-- multi-tenant policies are implemented. This is better than the 
-- "allow all" disaster we just removed.

-- INVOICES: Temporary restrictive policy
CREATE POLICY "invoices_temp_restricted" ON invoices
    FOR ALL USING (false);

-- CLIENTS: Temporary restrictive policy  
CREATE POLICY "clients_temp_restricted" ON clients
    FOR ALL USING (false);

-- INVOICE_ITEMS: Temporary restrictive policy
CREATE POLICY "invoice_items_temp_restricted" ON invoice_items
    FOR ALL USING (false);

-- PAYMENTS: Temporary restrictive policy
CREATE POLICY "payments_temp_restricted" ON payments
    FOR ALL USING (false);

-- PAYMENT_ALLOCATIONS: Temporary restrictive policy
CREATE POLICY "payment_allocations_temp_restricted" ON payment_allocations
    FOR ALL USING (false);

-- ACCOUNT_CREDITS: Temporary restrictive policy
CREATE POLICY "account_credits_temp_restricted" ON account_credits
    FOR ALL USING (false);

-- AUDIT_LOGS: Temporary restrictive policy (except INSERT for system logging)
CREATE POLICY "audit_logs_temp_restricted_select" ON audit_logs
    FOR SELECT USING (false);
CREATE POLICY "audit_logs_temp_restricted_update" ON audit_logs
    FOR UPDATE USING (false);
CREATE POLICY "audit_logs_temp_restricted_delete" ON audit_logs
    FOR DELETE USING (false);
-- Allow INSERT for system logging
CREATE POLICY "audit_logs_allow_insert" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- CPT_CODES: Reference data - keep restricted for now
CREATE POLICY "cpt_codes_temp_restricted" ON cpt_codes
    FOR ALL USING (false);

-- ================================================
-- CRITICAL NOTICE
-- ================================================
DO $$
BEGIN
    RAISE WARNING '================================================';
    RAISE WARNING 'EMERGENCY POLICIES REMOVED - SYSTEM NOW LOCKED DOWN';
    RAISE WARNING '';
    RAISE WARNING 'CURRENT STATE:';
    RAISE WARNING '- All insecure is_authenticated() policies REMOVED';
    RAISE WARNING '- Temporary restrictive policies in place (deny all)';
    RAISE WARNING '- System is now SECURE but UNUSABLE';
    RAISE WARNING '';
    RAISE WARNING 'NEXT STEPS REQUIRED:';
    RAISE WARNING '1. Apply proper multi-tenant RLS policies';
    RAISE WARNING '2. Fix set_user_context function';
    RAISE WARNING '3. Enable set_user_context call in frontend';
    RAISE WARNING '4. Test with multiple tenants';
    RAISE WARNING '================================================';
END $$;

-- ================================================
-- DROP THE DANGEROUS is_authenticated() FUNCTION
-- ================================================
-- This function was the root of the security disaster
DROP FUNCTION IF EXISTS is_authenticated();

-- Final verification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'is_authenticated' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RAISE EXCEPTION 'CRITICAL: Failed to drop is_authenticated() function';
    ELSE
        RAISE NOTICE 'SUCCESS: Dangerous is_authenticated() function has been dropped';
    END IF;
END $$;