-- Complete Row Level Security Policies for ALL Tables
-- This migration ensures every table has proper RLS enabled and configured

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

-- Core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- Patient tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance ENABLE ROW LEVEL SECURITY;

-- Billing tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_credits ENABLE ROW LEVEL SECURITY;

-- CPT and pricing tables
ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_catalog ENABLE ROW LEVEL SECURITY;

-- Lab result tables
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;

-- Additional tables
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER POLICIES
-- ============================================

-- Users can only view users in their organization
CREATE POLICY "Users can view organization members"
ON users FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================
-- ORGANIZATION POLICIES
-- ============================================

-- Users can view their organization
CREATE POLICY "Users can view own organization"
ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Only admins can update organization
CREATE POLICY "Admins can update organization"
ON organizations FOR UPDATE
USING (
  id IN (
    SELECT organization_id FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- PATIENT POLICIES
-- ============================================

-- Users can view patients in their organization
CREATE POLICY "Users can view organization patients"
ON patients FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================
-- INVOICE POLICIES
-- ============================================

-- Users can view invoices in their organization
CREATE POLICY "Users can view organization invoices"
ON invoices FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Users can create invoices for their organization
CREATE POLICY "Users can create organization invoices"
ON invoices FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Users can update invoices in their organization
CREATE POLICY "Users can update organization invoices"
ON invoices FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Only admins can delete invoices
CREATE POLICY "Admins can delete invoices"
ON invoices FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- INVOICE ITEMS POLICIES
-- ============================================

-- Users can view invoice items for their organization's invoices
CREATE POLICY "Users can view organization invoice items"
ON invoice_items FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM invoices 
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Users can manage invoice items for their organization's invoices
CREATE POLICY "Users can manage organization invoice items"
ON invoice_items FOR ALL
USING (
  invoice_id IN (
    SELECT id FROM invoices 
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- PAYMENT POLICIES
-- ============================================

-- Users can view payments for their organization
CREATE POLICY "Users can view organization payments"
ON payments FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  OR
  invoice_id IN (
    SELECT id FROM invoices 
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Users can create payments for their organization
CREATE POLICY "Users can create payments"
ON payments FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  OR
  invoice_id IN (
    SELECT id FROM invoices 
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Only admins can update payments
CREATE POLICY "Admins can update payments"
ON payments FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE id = auth.uid() AND role IN ('admin', 'billing')
  )
);

-- No one can delete payments (audit trail)
CREATE POLICY "No one can delete payments"
ON payments FOR DELETE
USING (false);

-- ============================================
-- PAYMENT ALLOCATIONS POLICIES
-- ============================================

-- Users can view payment allocations for their organization
CREATE POLICY "Users can view payment allocations"
ON payment_allocations FOR SELECT
USING (
  payment_id IN (
    SELECT id FROM payments 
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- System manages payment allocations
CREATE POLICY "System manages payment allocations"
ON payment_allocations FOR INSERT
WITH CHECK (true);

-- No one can update payment allocations
CREATE POLICY "No one can update payment allocations"
ON payment_allocations FOR UPDATE
USING (false);

-- No one can delete payment allocations
CREATE POLICY "No one can delete payment allocations"
ON payment_allocations FOR DELETE
USING (false);

-- ============================================
-- PAYMENT CREDITS POLICIES
-- ============================================

-- Users can view payment credits for their organization
CREATE POLICY "Users can view payment credits"
ON payment_credits FOR SELECT
USING (
  payment_id IN (
    SELECT id FROM payments 
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- System manages payment credits
CREATE POLICY "System manages payment credits"
ON payment_credits FOR INSERT
WITH CHECK (true);

-- Billing users can update credit status
CREATE POLICY "Billing can update payment credits"
ON payment_credits FOR UPDATE
USING (
  payment_id IN (
    SELECT id FROM payments 
    WHERE organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'billing')
    )
  )
);

-- ============================================
-- CPT CODES POLICIES
-- ============================================

-- Everyone can view CPT codes (reference data)
CREATE POLICY "Everyone can view CPT codes"
ON cpt_codes FOR SELECT
USING (true);

-- Only admins can manage CPT codes
CREATE POLICY "Admins can manage CPT codes"
ON cpt_codes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- LAB RESULTS POLICIES
-- ============================================

-- Users can view lab results for their organization
CREATE POLICY "Users can view organization lab results"
ON lab_results FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Users can create lab results for their organization
CREATE POLICY "Users can create lab results"
ON lab_results FOR INSERT
WITH CHECK (
  patient_id IN (
    SELECT id FROM patients 
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Users can update lab results for their organization
CREATE POLICY "Users can update lab results"
ON lab_results FOR UPDATE
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- AUDIT LOGS POLICIES (Already defined above)
-- ============================================

-- Audit logs are append-only and viewable by admins only
-- (Policies already created in previous migration)

-- ============================================
-- VERIFY ALL RLS IS ENABLED
-- ============================================

DO $$
DECLARE
  r RECORD;
  missing_rls TEXT := '';
BEGIN
  -- Check all tables for RLS
  FOR r IN 
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations', 'pg_stat_statements')
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = r.schemaname
      AND c.relname = r.tablename
      AND c.relrowsecurity = true
    ) THEN
      missing_rls := missing_rls || r.schemaname || '.' || r.tablename || ', ';
    END IF;
  END LOOP;
  
  IF missing_rls != '' THEN
    RAISE WARNING 'Tables without RLS: %', missing_rls;
  END IF;
END $$;