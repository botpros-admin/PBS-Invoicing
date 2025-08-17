-- ========================================
-- PBS Invoicing Row-Level Security Policies
-- Ensures complete data isolation between tenants
-- ========================================

-- ========================================
-- UTILITY FUNCTIONS FOR RLS
-- ========================================

-- Get current user's billing company ID
CREATE OR REPLACE FUNCTION get_user_billing_company_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT billing_company_id 
    FROM users_multitenant 
    WHERE supabase_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's provider ID
CREATE OR REPLACE FUNCTION get_user_provider_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT provider_id 
    FROM users_multitenant 
    WHERE supabase_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM users_multitenant 
    WHERE supabase_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is company admin or higher
CREATE OR REPLACE FUNCTION is_company_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
    FROM users_multitenant 
    WHERE supabase_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is provider admin or higher
CREATE OR REPLACE FUNCTION is_provider_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'PROVIDER_ADMIN')
    FROM users_multitenant 
    WHERE supabase_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT permission_name = ANY(permissions)
    FROM users_multitenant 
    WHERE supabase_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- BILLING COMPANIES RLS POLICIES
-- ========================================

ALTER TABLE billing_companies ENABLE ROW LEVEL SECURITY;

-- Company admins can see their own company
CREATE POLICY "billing_companies_select" ON billing_companies
  FOR SELECT USING (
    id = get_user_billing_company_id() 
    OR get_user_role() = 'SUPER_ADMIN'
  );

-- Only company admins can update their company
CREATE POLICY "billing_companies_update" ON billing_companies
  FOR UPDATE USING (
    id = get_user_billing_company_id() 
    AND is_company_admin()
  );

-- Super admins can insert new companies
CREATE POLICY "billing_companies_insert" ON billing_companies
  FOR INSERT WITH CHECK (
    get_user_role() = 'SUPER_ADMIN'
  );

-- Super admins can delete companies
CREATE POLICY "billing_companies_delete" ON billing_companies
  FOR DELETE USING (
    get_user_role() = 'SUPER_ADMIN'
  );

-- ========================================
-- HEALTHCARE PROVIDERS RLS POLICIES
-- ========================================

ALTER TABLE healthcare_providers ENABLE ROW LEVEL SECURITY;

-- Users can see providers in their billing company
CREATE POLICY "providers_select" ON healthcare_providers
  FOR SELECT USING (
    billing_company_id = get_user_billing_company_id()
    OR get_user_role() = 'SUPER_ADMIN'
  );

-- Company/Provider admins can update providers
CREATE POLICY "providers_update" ON healthcare_providers
  FOR UPDATE USING (
    billing_company_id = get_user_billing_company_id() 
    AND (
      is_company_admin() 
      OR (id = get_user_provider_id() AND is_provider_admin())
    )
  );

-- Company admins can create new providers
CREATE POLICY "providers_insert" ON healthcare_providers
  FOR INSERT WITH CHECK (
    billing_company_id = get_user_billing_company_id() 
    AND is_company_admin()
  );

-- Company admins can delete providers
CREATE POLICY "providers_delete" ON healthcare_providers
  FOR DELETE USING (
    billing_company_id = get_user_billing_company_id() 
    AND is_company_admin()
  );

-- ========================================
-- USERS RLS POLICIES
-- ========================================

ALTER TABLE users_multitenant ENABLE ROW LEVEL SECURITY;

-- Users can see other users in their billing company
CREATE POLICY "users_select" ON users_multitenant
  FOR SELECT USING (
    billing_company_id = get_user_billing_company_id()
    OR get_user_role() = 'SUPER_ADMIN'
  );

-- Users can update their own profile
CREATE POLICY "users_update_self" ON users_multitenant
  FOR UPDATE USING (
    supabase_id = auth.uid()::text
  );

-- Admins can update users in their scope
CREATE POLICY "users_update_admin" ON users_multitenant
  FOR UPDATE USING (
    billing_company_id = get_user_billing_company_id() 
    AND (
      is_company_admin() 
      OR (provider_id = get_user_provider_id() AND is_provider_admin())
    )
  );

-- Admins can create new users
CREATE POLICY "users_insert" ON users_multitenant
  FOR INSERT WITH CHECK (
    billing_company_id = get_user_billing_company_id() 
    AND (
      is_company_admin() 
      OR (provider_id = get_user_provider_id() AND is_provider_admin())
    )
  );

-- Admins can delete users
CREATE POLICY "users_delete" ON users_multitenant
  FOR DELETE USING (
    billing_company_id = get_user_billing_company_id() 
    AND is_company_admin()
  );

-- ========================================
-- PATIENTS RLS POLICIES
-- ========================================

ALTER TABLE patients_multitenant ENABLE ROW LEVEL SECURITY;

-- Users can see patients in their provider or company (if company admin)
CREATE POLICY "patients_select" ON patients_multitenant
  FOR SELECT USING (
    billing_company_id = get_user_billing_company_id() 
    AND (
      is_company_admin() 
      OR provider_id = get_user_provider_id()
      OR has_permission('patients.view_all')
    )
  );

-- Users can create patients in their provider
CREATE POLICY "patients_insert" ON patients_multitenant
  FOR INSERT WITH CHECK (
    billing_company_id = get_user_billing_company_id() 
    AND (
      provider_id = get_user_provider_id()
      OR is_company_admin()
    )
    AND has_permission('patients.create')
  );

-- Users can update patients in their provider
CREATE POLICY "patients_update" ON patients_multitenant
  FOR UPDATE USING (
    billing_company_id = get_user_billing_company_id() 
    AND (
      provider_id = get_user_provider_id()
      OR is_company_admin()
    )
    AND has_permission('patients.update')
  );

-- Users can delete patients in their provider (if admin)
CREATE POLICY "patients_delete" ON patients_multitenant
  FOR DELETE USING (
    billing_company_id = get_user_billing_company_id() 
    AND provider_id = get_user_provider_id()
    AND is_provider_admin()
  );

-- ========================================
-- INVOICES RLS POLICIES
-- ========================================

ALTER TABLE invoices_multitenant ENABLE ROW LEVEL SECURITY;

-- Users can see invoices in their scope
CREATE POLICY "invoices_select" ON invoices_multitenant
  FOR SELECT USING (
    billing_company_id = get_user_billing_company_id() 
    AND (
      is_company_admin() 
      OR provider_id = get_user_provider_id()
      OR has_permission('invoices.view_all')
    )
  );

-- Users can create invoices in their provider
CREATE POLICY "invoices_insert" ON invoices_multitenant
  FOR INSERT WITH CHECK (
    billing_company_id = get_user_billing_company_id() 
    AND provider_id = get_user_provider_id()
    AND has_permission('invoices.create')
  );

-- Users can update invoices in their provider
CREATE POLICY "invoices_update" ON invoices_multitenant
  FOR UPDATE USING (
    billing_company_id = get_user_billing_company_id() 
    AND (
      (provider_id = get_user_provider_id() AND has_permission('invoices.update'))
      OR is_company_admin()
    )
  );

-- Admins can delete invoices
CREATE POLICY "invoices_delete" ON invoices_multitenant
  FOR DELETE USING (
    billing_company_id = get_user_billing_company_id() 
    AND provider_id = get_user_provider_id()
    AND is_provider_admin()
  );

-- ========================================
-- INVOICE LINE ITEMS RLS POLICIES
-- ========================================

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Line items inherit access from their invoice
CREATE POLICY "line_items_select" ON invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices_multitenant 
      WHERE invoices_multitenant.id = invoice_line_items.invoice_id
      AND invoices_multitenant.billing_company_id = get_user_billing_company_id()
      AND (
        is_company_admin() 
        OR invoices_multitenant.provider_id = get_user_provider_id()
        OR has_permission('invoices.view_all')
      )
    )
  );

CREATE POLICY "line_items_insert" ON invoice_line_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices_multitenant 
      WHERE invoices_multitenant.id = invoice_line_items.invoice_id
      AND invoices_multitenant.billing_company_id = get_user_billing_company_id()
      AND invoices_multitenant.provider_id = get_user_provider_id()
      AND has_permission('invoices.create')
    )
  );

CREATE POLICY "line_items_update" ON invoice_line_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices_multitenant 
      WHERE invoices_multitenant.id = invoice_line_items.invoice_id
      AND invoices_multitenant.billing_company_id = get_user_billing_company_id()
      AND invoices_multitenant.provider_id = get_user_provider_id()
      AND has_permission('invoices.update')
    )
  );

CREATE POLICY "line_items_delete" ON invoice_line_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices_multitenant 
      WHERE invoices_multitenant.id = invoice_line_items.invoice_id
      AND invoices_multitenant.billing_company_id = get_user_billing_company_id()
      AND invoices_multitenant.provider_id = get_user_provider_id()
      AND is_provider_admin()
    )
  );

-- ========================================
-- PAYMENTS RLS POLICIES
-- ========================================

ALTER TABLE payments_multitenant ENABLE ROW LEVEL SECURITY;

-- Users can see payments in their scope
CREATE POLICY "payments_select" ON payments_multitenant
  FOR SELECT USING (
    billing_company_id = get_user_billing_company_id() 
    AND (
      is_company_admin() 
      OR provider_id = get_user_provider_id()
      OR has_permission('payments.view_all')
    )
  );

-- Users can create payments in their provider
CREATE POLICY "payments_insert" ON payments_multitenant
  FOR INSERT WITH CHECK (
    billing_company_id = get_user_billing_company_id() 
    AND provider_id = get_user_provider_id()
    AND has_permission('payments.create')
  );

-- Users can update payments in their provider
CREATE POLICY "payments_update" ON payments_multitenant
  FOR UPDATE USING (
    billing_company_id = get_user_billing_company_id() 
    AND provider_id = get_user_provider_id()
    AND has_permission('payments.update')
  );

-- Admins can delete payments
CREATE POLICY "payments_delete" ON payments_multitenant
  FOR DELETE USING (
    billing_company_id = get_user_billing_company_id() 
    AND provider_id = get_user_provider_id()
    AND is_provider_admin()
  );

-- ========================================
-- SETTINGS RLS POLICIES
-- ========================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Company admins can manage company settings
CREATE POLICY "company_settings_select" ON company_settings
  FOR SELECT USING (
    billing_company_id = get_user_billing_company_id()
  );

CREATE POLICY "company_settings_insert" ON company_settings
  FOR INSERT WITH CHECK (
    billing_company_id = get_user_billing_company_id() 
    AND is_company_admin()
  );

CREATE POLICY "company_settings_update" ON company_settings
  FOR UPDATE USING (
    billing_company_id = get_user_billing_company_id() 
    AND is_company_admin()
  );

CREATE POLICY "company_settings_delete" ON company_settings
  FOR DELETE USING (
    billing_company_id = get_user_billing_company_id() 
    AND is_company_admin()
  );

-- Provider settings policies
ALTER TABLE provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_settings_select" ON provider_settings
  FOR SELECT USING (
    billing_company_id = get_user_billing_company_id()
    AND (
      is_company_admin()
      OR provider_id = get_user_provider_id()
    )
  );

CREATE POLICY "provider_settings_insert" ON provider_settings
  FOR INSERT WITH CHECK (
    billing_company_id = get_user_billing_company_id() 
    AND (
      is_company_admin() 
      OR (provider_id = get_user_provider_id() AND is_provider_admin())
    )
  );

CREATE POLICY "provider_settings_update" ON provider_settings
  FOR UPDATE USING (
    billing_company_id = get_user_billing_company_id() 
    AND (
      is_company_admin() 
      OR (provider_id = get_user_provider_id() AND is_provider_admin())
    )
  );

CREATE POLICY "provider_settings_delete" ON provider_settings
  FOR DELETE USING (
    billing_company_id = get_user_billing_company_id() 
    AND (
      is_company_admin() 
      OR (provider_id = get_user_provider_id() AND is_provider_admin())
    )
  );

-- ========================================
-- PRICING RULES RLS POLICIES
-- ========================================

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_rules_select" ON pricing_rules
  FOR SELECT USING (
    billing_company_id = get_user_billing_company_id()
  );

CREATE POLICY "pricing_rules_insert" ON pricing_rules
  FOR INSERT WITH CHECK (
    billing_company_id = get_user_billing_company_id() 
    AND is_company_admin()
  );

CREATE POLICY "pricing_rules_update" ON pricing_rules
  FOR UPDATE USING (
    billing_company_id = get_user_billing_company_id() 
    AND is_company_admin()
  );

CREATE POLICY "pricing_rules_delete" ON pricing_rules
  FOR DELETE USING (
    billing_company_id = get_user_billing_company_id() 
    AND is_company_admin()
  );

-- ========================================
-- REFERENCE DATA POLICIES (NO RLS - SHARED)
-- ========================================

-- CPT Codes and Diagnosis Codes are shared reference data
-- All authenticated users can read them
ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpt_codes_read_all" ON cpt_codes
  FOR SELECT USING (true);

-- Only super admins can modify reference data
CREATE POLICY "cpt_codes_modify" ON cpt_codes
  FOR ALL USING (get_user_role() = 'SUPER_ADMIN');

ALTER TABLE diagnosis_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diagnosis_codes_read_all" ON diagnosis_codes
  FOR SELECT USING (true);

CREATE POLICY "diagnosis_codes_modify" ON diagnosis_codes
  FOR ALL USING (get_user_role() = 'SUPER_ADMIN');

-- ========================================
-- AUDIT LOG POLICIES
-- ========================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Company admins can see audit logs for their billing company
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (
    billing_company_id = get_user_billing_company_id() 
    AND is_company_admin()
  );

-- System can insert audit logs (through service role)
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ========================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ========================================

-- Grant basic permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;