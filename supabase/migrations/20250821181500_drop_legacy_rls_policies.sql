-- Migration: Drop all legacy and incorrect RLS policies before rebuilding.
-- Date: 2025-08-21
-- Severity: CRITICAL SECURITY FIX
-- Issue: Emergency policies with is_authenticated() allow ANY user to access ALL data

BEGIN;

-- STEP 1: Drop all existing RLS policies on public tables to ensure a clean slate.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                       r.policyname, r.schemaname, r.tablename);
    END LOOP;
    RAISE NOTICE 'All existing RLS policies in public schema have been dropped.';
END $$;

-- STEP 2: Re-apply the definitive, correct RLS policies from the "nuclear_rls_fix" migration.
-- This ensures that only the correct, multi-tenant policies are active.

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
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff') OR
    (id = current_user_client_id() AND current_user_type() = 'client')
);

CREATE POLICY "clients_insert" ON clients FOR INSERT
WITH CHECK (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'manager'])
);

CREATE POLICY "clients_update" ON clients FOR UPDATE
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'manager'])
);

CREATE POLICY "clients_delete" ON clients FOR DELETE
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin'])
);

-- INVOICES table
CREATE POLICY "invoices_select" ON invoices FOR SELECT
USING (
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff') OR
    (client_id = current_user_client_id() AND current_user_type() = 'client')
);

CREATE POLICY "invoices_insert" ON invoices FOR INSERT
WITH CHECK (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "invoices_update" ON invoices FOR UPDATE
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "invoices_delete" ON invoices FOR DELETE
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin'])
);

-- INVOICE_ITEMS table
CREATE POLICY "items_select" ON invoice_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.id = invoice_items.invoice_id
        AND (
            (i.organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff') OR
            (i.client_id = current_user_client_id() AND current_user_type() = 'client')
        )
    )
);

CREATE POLICY "items_insert" ON invoice_items FOR INSERT
WITH CHECK (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "items_update" ON invoice_items FOR UPDATE
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "items_delete" ON invoice_items FOR DELETE
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin'])
);

-- PAYMENTS table
CREATE POLICY "payments_select" ON payments FOR SELECT
USING (
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff') OR
    (client_id = current_user_client_id() AND current_user_type() = 'client')
);

CREATE POLICY "payments_insert" ON payments FOR INSERT
WITH CHECK (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

CREATE POLICY "payments_update" ON payments FOR UPDATE
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing'])
);

CREATE POLICY "payments_delete" ON payments FOR DELETE
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin'])
);

-- CPT_CODES table (reference data)
CREATE POLICY "cpt_select" ON cpt_codes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "cpt_admin" ON cpt_codes FOR ALL
USING (
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['super_admin'])
);

-- LABORATORIES table
CREATE POLICY "labs_select" ON laboratories FOR SELECT
USING (organization_id = current_user_org_id());

CREATE POLICY "labs_admin" ON laboratories FOR ALL
USING (
    organization_id = current_user_org_id() AND
    user_has_role(ARRAY['admin', 'super_admin'])
);

-- IMPORT_QUEUES table
CREATE POLICY "import_select" ON import_queues FOR SELECT
USING (organization_id = current_user_org_id());

CREATE POLICY "import_manage" ON import_queues FOR ALL
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing', 'user'])
);

-- DUPLICATE_REVIEW_QUEUE table
CREATE POLICY "duplicate_select" ON duplicate_review_queue FOR SELECT
USING (organization_id = current_user_org_id());

CREATE POLICY "duplicate_manage" ON duplicate_review_queue FOR ALL
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing'])
);

-- AUDIT_TRAIL table (read-only for most users)
CREATE POLICY "audit_select" ON audit_trail FOR SELECT
USING (
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin'])
);

-- PRICING_SCHEDULES table
CREATE POLICY "pricing_select" ON pricing_schedules FOR SELECT
USING (
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff') OR
    (organization_id = current_user_org_id() AND current_user_type() = 'client')
);

CREATE POLICY "pricing_manage" ON pricing_schedules FOR ALL
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing'])
);

-- CLIENT_PRICING_OVERRIDES table
CREATE POLICY "overrides_select" ON client_pricing_overrides FOR SELECT
USING (
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff') OR
    (client_id = current_user_client_id() AND current_user_type() = 'client')
);

CREATE POLICY "overrides_manage" ON client_pricing_overrides FOR ALL
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing'])
);

-- DISPUTES table
CREATE POLICY "disputes_select" ON disputes FOR SELECT
USING (
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff') OR
    (EXISTS (
        SELECT 1 FROM invoice_items ii
        JOIN invoices i ON i.id = ii.invoice_id
        WHERE ii.id = disputes.invoice_item_id
        AND i.client_id = current_user_client_id()
        AND current_user_type() = 'client'
    ))
);

CREATE POLICY "disputes_insert" ON disputes FOR INSERT
WITH CHECK (
    -- PBS staff can create disputes on behalf of clients
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff') OR
    -- Clients can create disputes for their own invoice items
    (EXISTS (
        SELECT 1 FROM invoice_items ii
        JOIN invoices i ON i.id = ii.invoice_id
        WHERE ii.id = invoice_item_id
        AND i.client_id = current_user_client_id()
        AND current_user_type() = 'client'
    ))
);

CREATE POLICY "disputes_update" ON disputes FOR UPDATE
USING (
    organization_id = current_user_org_id() AND
    current_user_type() = 'pbs_staff' AND
    user_has_role(ARRAY['admin', 'super_admin', 'billing'])
);

-- PAYMENT_ALLOCATIONS table
CREATE POLICY "allocations_select" ON payment_allocations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM payments p
        WHERE p.id = payment_allocations.payment_id
        AND (
            (p.organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff') OR
            (p.client_id = current_user_client_id() AND current_user_type() = 'client')
        )
    )
);

CREATE POLICY "allocations_manage" ON payment_allocations FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM payments p
        WHERE p.id = payment_allocations.payment_id
        AND p.organization_id = current_user_org_id()
        AND current_user_type() = 'pbs_staff'
        AND user_has_role(ARRAY['admin', 'super_admin', 'billing'])
    )
);

-- USERS table (the view for PBS staff)
CREATE POLICY "users_select" ON users FOR SELECT
USING (organization_id = current_user_org_id());

CREATE POLICY "users_admin" ON users FOR ALL
USING (
    organization_id = current_user_org_id() AND
    user_has_role(ARRAY['admin', 'super_admin'])
);

-- CLIENT_USERS table (the view for client portal users)
CREATE POLICY "client_users_select" ON client_users FOR SELECT
USING (
    -- PBS staff can see client users in their organization
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff') OR
    -- Client admins can see users from their own client
    (client_id = current_user_client_id() AND current_user_type() = 'client' AND current_user_client_role() = 'admin')
);

CREATE POLICY "client_users_manage" ON client_users FOR ALL
USING (
    -- PBS staff can manage client users
    (organization_id = current_user_org_id() AND current_user_type() = 'pbs_staff' AND user_has_role(ARRAY['admin', 'super_admin'])) OR
    -- Client admins can manage their own users
    (client_id = current_user_client_id() AND current_user_type() = 'client' AND current_user_client_role() = 'admin')
);

RAISE NOTICE 'SUCCESS: All legacy RLS policies have been dropped and replaced with secure, multi-tenant policies.';

COMMIT;