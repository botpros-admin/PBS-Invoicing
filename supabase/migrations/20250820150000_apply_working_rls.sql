-- ==========================================
-- Apply Working RLS Policies
-- Date: 2025-08-20
-- Purpose: Apply RLS that works with existing schema
-- ==========================================

-- Clean up all old policies first
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  -- Drop all existing policies on key tables
  FOR policy_rec IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('users', 'client_users', 'invoices', 'clients', 'payments', 'invoice_items', 'cpt_codes')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_rec.policyname, policy_rec.tablename);
  END LOOP;
END $$;

-- ==========================================
-- SIMPLE HELPER FUNCTIONS
-- ==========================================

-- Get current user's organization ID
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get from users table
  SELECT organization_id INTO org_id
  FROM users
  WHERE auth_id = auth.uid();
  
  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;
  
  -- Get from client_users via clients table
  SELECT c.organization_id INTO org_id
  FROM client_users cu
  JOIN clients c ON cu.client_id = c.id
  WHERE cu.auth_id = auth.uid();
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE auth_id = auth.uid();
  
  IF user_role IS NOT NULL THEN
    RETURN user_role;
  END IF;
  
  -- If client user, return 'client'
  IF EXISTS (SELECT 1 FROM client_users WHERE auth_id = auth.uid()) THEN
    RETURN 'client';
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is a client
CREATE OR REPLACE FUNCTION is_client()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM client_users WHERE auth_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's client ID
CREATE OR REPLACE FUNCTION current_client_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT client_id FROM client_users WHERE auth_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- USERS TABLE RLS
-- ==========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can see themselves
CREATE POLICY "users_select_self" ON users
FOR SELECT USING (auth_id = auth.uid());

-- Users can see others in their organization
CREATE POLICY "users_select_organization" ON users
FOR SELECT USING (
  organization_id = current_user_org_id()
  AND current_user_org_id() IS NOT NULL
);

-- Users can update their own profile
CREATE POLICY "users_update_self" ON users
FOR UPDATE USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());

-- Admins can manage all users in their organization
CREATE POLICY "users_admin_all" ON users
FOR ALL USING (
  current_user_role() IN ('superadmin', 'admin')
  AND organization_id = current_user_org_id()
);

-- ==========================================
-- CLIENT_USERS TABLE RLS
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_users') THEN
    ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
    
    -- Client users can see themselves
    EXECUTE 'CREATE POLICY "client_users_select_self" ON client_users
    FOR SELECT USING (auth_id = auth.uid())';
    
    -- Staff can see client users for their organization's clients
    EXECUTE 'CREATE POLICY "client_users_select_staff" ON client_users
    FOR SELECT USING (
      NOT is_client()
      AND client_id IN (
        SELECT id FROM clients WHERE organization_id = current_user_org_id()
      )
    )';
    
    -- Client users can update their own profile
    EXECUTE 'CREATE POLICY "client_users_update_self" ON client_users
    FOR UPDATE USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid())';
  END IF;
END $$;

-- ==========================================
-- INVOICES RLS
-- ==========================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Staff can see all invoices in their organization
CREATE POLICY "invoices_select_staff" ON invoices
FOR SELECT USING (
  NOT is_client()
  AND organization_id = current_user_org_id()
);

-- Clients can see their own invoices
CREATE POLICY "invoices_select_client" ON invoices
FOR SELECT USING (
  is_client()
  AND client_id = current_client_id()
);

-- Staff can create invoices for their organization
CREATE POLICY "invoices_insert_staff" ON invoices
FOR INSERT WITH CHECK (
  NOT is_client()
  AND current_user_role() IN ('superadmin', 'admin', 'billing')
  AND organization_id = current_user_org_id()
);

-- Staff can update invoices in their organization
CREATE POLICY "invoices_update_staff" ON invoices
FOR UPDATE USING (
  NOT is_client()
  AND current_user_role() IN ('superadmin', 'admin', 'billing')
  AND organization_id = current_user_org_id()
);

-- Admins can delete invoices
CREATE POLICY "invoices_delete_admin" ON invoices
FOR DELETE USING (
  current_user_role() IN ('superadmin', 'admin')
  AND organization_id = current_user_org_id()
);

-- ==========================================
-- CLIENTS RLS
-- ==========================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Staff can see all clients in their organization
CREATE POLICY "clients_select_staff" ON clients
FOR SELECT USING (
  NOT is_client()
  AND organization_id = current_user_org_id()
);

-- Client users can see their own client record
CREATE POLICY "clients_select_self" ON clients
FOR SELECT USING (
  is_client()
  AND id = current_client_id()
);

-- Admins can create clients
CREATE POLICY "clients_insert_admin" ON clients
FOR INSERT WITH CHECK (
  current_user_role() IN ('superadmin', 'admin')
  AND organization_id = current_user_org_id()
);

-- Admins can update clients
CREATE POLICY "clients_update_admin" ON clients
FOR UPDATE USING (
  current_user_role() IN ('superadmin', 'admin')
  AND organization_id = current_user_org_id()
);

-- Superadmins can delete clients
CREATE POLICY "clients_delete_superadmin" ON clients
FOR DELETE USING (
  current_user_role() = 'superadmin'
  AND organization_id = current_user_org_id()
);

-- ==========================================
-- PAYMENTS RLS
-- ==========================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Staff can see all payments in their organization
CREATE POLICY "payments_select_staff" ON payments
FOR SELECT USING (
  NOT is_client()
  AND organization_id = current_user_org_id()
);

-- Clients can see payments for their invoices
CREATE POLICY "payments_select_client" ON payments
FOR SELECT USING (
  is_client()
  AND invoice_id IN (
    SELECT id FROM invoices WHERE client_id = current_client_id()
  )
);

-- Staff can create payments
CREATE POLICY "payments_insert_staff" ON payments
FOR INSERT WITH CHECK (
  NOT is_client()
  AND current_user_role() IN ('superadmin', 'admin', 'billing')
  AND organization_id = current_user_org_id()
);

-- Clients can create payments for their invoices
CREATE POLICY "payments_insert_client" ON payments
FOR INSERT WITH CHECK (
  is_client()
  AND invoice_id IN (
    SELECT id FROM invoices WHERE client_id = current_client_id()
  )
);

-- Staff can update payments
CREATE POLICY "payments_update_staff" ON payments
FOR UPDATE USING (
  NOT is_client()
  AND current_user_role() IN ('superadmin', 'admin', 'billing')
  AND organization_id = current_user_org_id()
);

-- Admins can delete payments
CREATE POLICY "payments_delete_admin" ON payments
FOR DELETE USING (
  current_user_role() IN ('superadmin', 'admin')
  AND organization_id = current_user_org_id()
);

-- ==========================================
-- INVOICE_ITEMS RLS
-- ==========================================

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Staff can see invoice items for their organization
CREATE POLICY "invoice_items_select_staff" ON invoice_items
FOR SELECT USING (
  NOT is_client()
  AND invoice_id IN (
    SELECT id FROM invoices WHERE organization_id = current_user_org_id()
  )
);

-- Clients can see their invoice items
CREATE POLICY "invoice_items_select_client" ON invoice_items
FOR SELECT USING (
  is_client()
  AND invoice_id IN (
    SELECT id FROM invoices WHERE client_id = current_client_id()
  )
);

-- Staff can manage invoice items
CREATE POLICY "invoice_items_manage_staff" ON invoice_items
FOR ALL USING (
  NOT is_client()
  AND current_user_role() IN ('superadmin', 'admin', 'billing')
  AND invoice_id IN (
    SELECT id FROM invoices WHERE organization_id = current_user_org_id()
  )
);

-- ==========================================
-- CPT_CODES RLS
-- ==========================================

ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view CPT codes
CREATE POLICY "cpt_codes_select_all" ON cpt_codes
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only superadmins can manage CPT codes
CREATE POLICY "cpt_codes_manage_superadmin" ON cpt_codes
FOR ALL USING (current_user_role() = 'superadmin');

-- ==========================================
-- VERIFICATION
-- ==========================================

DO $$
DECLARE
  policy_count INTEGER;
  table_count INTEGER;
BEGIN
  -- Count policies created
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO table_count
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.schemaname = t.schemaname 
    AND p.tablename = t.tablename
  );
  
  RAISE NOTICE 'RLS Configuration Complete';
  RAISE NOTICE '- Tables with RLS enabled: %', table_count;
  RAISE NOTICE '- Total policies created: %', policy_count;
  RAISE NOTICE 'Multi-tenant access control is now active';
END $$;