-- ================================================
-- ROW LEVEL SECURITY POLICIES - CURRENT STATE
-- ================================================
-- All RLS policies currently active in the database
-- Generated: 2025-08-15

-- ================================================
-- ENABLE RLS ON ALL TABLES
-- ================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- CURRENT POLICIES (TEMPORARY OPEN ACCESS)
-- ================================================
-- NOTE: These are currently set to allow all authenticated users
-- This is TEMPORARY for testing and should be updated for production

-- Organizations policies
CREATE POLICY "allow_all_organizations" ON organizations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- User profiles policies  
CREATE POLICY "allow_all_user_profiles" ON user_profiles
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Roles policies
CREATE POLICY "Roles are viewable by authenticated users" ON roles
  FOR SELECT TO authenticated
  USING (true);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user roles" ON user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin'
    )
  );

-- Clients policies
CREATE POLICY "allow_all_clients" ON clients
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- CPT codes policies
CREATE POLICY "allow_all_cpt_codes" ON cpt_codes
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Invoices policies
CREATE POLICY "allow_all_invoices" ON invoices
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Invoice items policies
CREATE POLICY "allow_all_invoice_items" ON invoice_items
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Pricing schedules policies
CREATE POLICY "allow_all_pricing_schedules" ON pricing_schedules
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Pricing rules policies
CREATE POLICY "allow_all_pricing_rules" ON pricing_rules
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Payments policies
CREATE POLICY "allow_all_payments" ON payments
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Payment allocations policies
CREATE POLICY "allow_all_payment_allocations" ON payment_allocations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Account credits policies
CREATE POLICY "allow_all_account_credits" ON account_credits
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Disputes policies
CREATE POLICY "allow_all_disputes" ON disputes
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Import queues policies
CREATE POLICY "allow_all_import_queues" ON import_queues
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Audit logs policies
CREATE POLICY "allow_all_audit_logs" ON audit_logs
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ================================================
-- PRODUCTION RLS POLICIES (COMMENTED OUT)
-- ================================================
-- Uncomment these for production use with proper organization-based isolation

/*
-- Organizations - Users can only see their own organizations
CREATE POLICY "users_view_own_organizations" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Clients - Organization-based isolation
CREATE POLICY "organization_clients" ON clients
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Invoices - Organization-based isolation
CREATE POLICY "organization_invoices" ON invoices
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Invoice Items - Organization-based isolation
CREATE POLICY "organization_invoice_items" ON invoice_items
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Payments - Organization-based isolation
CREATE POLICY "organization_payments" ON payments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Audit Logs - Organization-based isolation
CREATE POLICY "organization_audit_logs" ON audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );
*/