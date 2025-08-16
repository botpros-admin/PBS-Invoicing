-- SIMPLIFIED RLS POLICIES - Development Phase
-- These policies allow authenticated users to access data
-- Will be refined for production with proper multi-tenancy
-- Date: 2025-08-16
-- Severity: CRITICAL

-- Helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INVOICES: Allow authenticated users to access invoices
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON invoices;

CREATE POLICY "Authenticated users can view invoices" ON invoices
    FOR SELECT USING (is_authenticated());

CREATE POLICY "Authenticated users can manage invoices" ON invoices
    FOR ALL USING (is_authenticated());

-- CLIENTS: Allow authenticated users to access clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON clients;

CREATE POLICY "Authenticated users can view clients" ON clients
    FOR SELECT USING (is_authenticated());

CREATE POLICY "Authenticated users can manage clients" ON clients
    FOR ALL USING (is_authenticated());

-- INVOICE ITEMS: Allow authenticated users to access invoice items
DROP POLICY IF EXISTS "Authenticated users can view invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Authenticated users can manage invoice items" ON invoice_items;

CREATE POLICY "Authenticated users can view invoice items" ON invoice_items
    FOR SELECT USING (is_authenticated());

CREATE POLICY "Authenticated users can manage invoice items" ON invoice_items
    FOR ALL USING (is_authenticated());

-- PAYMENTS: Allow authenticated users to access payments
DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can manage payments" ON payments;

CREATE POLICY "Authenticated users can view payments" ON payments
    FOR SELECT USING (is_authenticated());

CREATE POLICY "Authenticated users can manage payments" ON payments
    FOR ALL USING (is_authenticated());

-- PAYMENT ALLOCATIONS: Allow authenticated users to access allocations
DROP POLICY IF EXISTS "Authenticated users can view payment allocations" ON payment_allocations;
DROP POLICY IF EXISTS "Authenticated users can manage payment allocations" ON payment_allocations;

CREATE POLICY "Authenticated users can view payment allocations" ON payment_allocations
    FOR SELECT USING (is_authenticated());

CREATE POLICY "Authenticated users can manage payment allocations" ON payment_allocations
    FOR ALL USING (is_authenticated());

-- ACCOUNT CREDITS: Allow authenticated users to access credits
DROP POLICY IF EXISTS "Authenticated users can view account credits" ON account_credits;
DROP POLICY IF EXISTS "Authenticated users can manage account credits" ON account_credits;

CREATE POLICY "Authenticated users can view account credits" ON account_credits
    FOR SELECT USING (is_authenticated());

CREATE POLICY "Authenticated users can manage account credits" ON account_credits
    FOR ALL USING (is_authenticated());

-- AUDIT LOGS: Allow authenticated users to view audit logs
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;

CREATE POLICY "Authenticated users can view audit logs" ON audit_logs
    FOR SELECT USING (is_authenticated());

CREATE POLICY "System can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- CPT CODES: All authenticated users can view (reference data)
DROP POLICY IF EXISTS "Authenticated users can view cpt codes" ON cpt_codes;

CREATE POLICY "Authenticated users can view cpt codes" ON cpt_codes
    FOR SELECT USING (is_authenticated());

-- Log successful policy creation
DO $$
BEGIN
    RAISE NOTICE 'RLS policies created successfully. Data is now protected with authentication requirement.';
    RAISE NOTICE 'All authenticated users can access data during development phase.';
    RAISE NOTICE 'TODO: Implement proper multi-tenancy before production launch.';
END $$;