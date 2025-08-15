-- ================================================
-- SEED DATA FOR PBS INVOICING
-- ================================================
-- Run this after migrations to populate initial data
-- This includes test data and required system data

-- ================================================
-- STEP 1: DEFAULT ORGANIZATION
-- ================================================
INSERT INTO organizations (id, name, slug, type, settings, subscription_tier, subscription_status, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000000'::UUID, 
  'Default Organization', 
  'default', 
  'billing_company',
  '{
    "features": ["invoicing", "payments", "reporting", "import", "export"],
    "theme": "default",
    "locale": "en-US",
    "timezone": "America/New_York",
    "currency": "USD",
    "fiscal_year_start": "01-01"
  }'::jsonb,
  'free',
  'active',
  true
) ON CONFLICT (id) DO NOTHING;

-- ================================================
-- STEP 2: DEFAULT ROLES
-- ================================================
INSERT INTO roles (id, name, permissions) VALUES
  ('11111111-1111-1111-1111-111111111111'::UUID, 'super_admin', '["*"]'::jsonb),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'admin', '["invoices:*", "clients:*", "payments:*", "reports:*", "settings:*"]'::jsonb),
  ('33333333-3333-3333-3333-333333333333'::UUID, 'manager', '["invoices:*", "clients:*", "payments:*", "reports:read"]'::jsonb),
  ('44444444-4444-4444-4444-444444444444'::UUID, 'user', '["invoices:read", "clients:read", "reports:read"]'::jsonb),
  ('55555555-5555-5555-5555-555555555555'::UUID, 'billing', '["invoices:*", "payments:*", "reports:read"]'::jsonb),
  ('66666666-6666-6666-6666-666666666666'::UUID, 'viewer', '["invoices:read", "clients:read"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- STEP 3: TEST CLIENTS
-- ================================================
INSERT INTO clients (
  id, 
  organization_id,
  name, 
  code,
  email, 
  phone,
  address_line1,
  address_line2,
  city,
  state,
  zip_code,
  contact_person,
  billing_terms,
  is_active
) VALUES
  ('c0000001-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000000'::UUID, 
   'Acme Corporation', 'ACME001', 'billing@acmecorp.com', '555-0100', 
   '123 Business Ave', 'Suite 100', 'New York', 'NY', '10001', 
   'John Smith', 30, true),
  
  ('c0000002-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'TechStart Inc.', 'TECH001', 'accounts@techstart.com', '555-0200',
   '456 Innovation Blvd', NULL, 'San Francisco', 'CA', '94105',
   'Jane Doe', 45, true),
  
  ('c0000003-0000-0000-0000-000000000003'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'Healthcare Partners', 'HLTH001', 'finance@healthpartners.com', '555-0300',
   '789 Medical Center Dr', 'Building A', 'Chicago', 'IL', '60601',
   'Dr. Robert Johnson', 60, true),
  
  ('c0000004-0000-0000-0000-000000000004'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'Global Logistics LLC', 'GLOB001', 'invoices@globallogistics.com', '555-0400',
   '321 Shipping Way', NULL, 'Los Angeles', 'CA', '90001',
   'Maria Garcia', 30, true),
  
  ('c0000005-0000-0000-0000-000000000005'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'Education First', 'EDUC001', 'billing@educationfirst.org', '555-0500',
   '654 University Blvd', 'Admin Building', 'Boston', 'MA', '02101',
   'Prof. David Lee', 90, true)
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- STEP 4: CPT CODES
-- ================================================
INSERT INTO cpt_codes (
  id,
  organization_id,
  code,
  description,
  category,
  is_active
) VALUES
  ('cpt00001-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   '99213', 'Office/outpatient visit, established patient, 15 minutes', 'E&M Services', true),
  
  ('cpt00002-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   '99214', 'Office/outpatient visit, established patient, 25 minutes', 'E&M Services', true),
  
  ('cpt00003-0000-0000-0000-000000000003'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   '80053', 'Comprehensive metabolic panel', 'Laboratory', true),
  
  ('cpt00004-0000-0000-0000-000000000004'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   '85025', 'Complete blood count with differential', 'Laboratory', true),
  
  ('cpt00005-0000-0000-0000-000000000005'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   '80061', 'Lipid panel', 'Laboratory', true),
  
  ('cpt00006-0000-0000-0000-000000000006'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   '83036', 'Hemoglobin A1c', 'Laboratory', true),
  
  ('cpt00007-0000-0000-0000-000000000007'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   '87086', 'Urine culture', 'Laboratory', true),
  
  ('cpt00008-0000-0000-0000-000000000008'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   '71045', 'Chest X-ray, single view', 'Radiology', true),
  
  ('cpt00009-0000-0000-0000-000000000009'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   '71046', 'Chest X-ray, 2 views', 'Radiology', true),
  
  ('cpt00010-0000-0000-0000-000000000010'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   '70450', 'CT scan, head/brain, without contrast', 'Radiology', true)
ON CONFLICT (organization_id, code) DO NOTHING;

-- ================================================
-- STEP 5: PRICING SCHEDULES
-- ================================================
INSERT INTO pricing_schedules (
  id,
  organization_id,
  name,
  description,
  effective_date,
  is_default,
  is_active
) VALUES
  ('ps000001-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'Standard Pricing 2025', 'Default pricing schedule for all clients', '2025-01-01', true, true),
  
  ('ps000002-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'Preferred Client Pricing', 'Discounted rates for high-volume clients', '2025-01-01', false, true)
ON CONFLICT (organization_id, name) DO NOTHING;

-- ================================================
-- STEP 6: PRICING RULES
-- ================================================
INSERT INTO pricing_rules (
  id,
  organization_id,
  pricing_schedule_id,
  cpt_code_id,
  client_id,
  base_price,
  discount_percentage,
  effective_date,
  is_active
) VALUES
  -- Standard pricing for all clients
  ('pr000001-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'ps000001-0000-0000-0000-000000000001'::UUID, 'cpt00001-0000-0000-0000-000000000001'::UUID, 
   NULL, 150.00, 0, '2025-01-01', true),
  
  ('pr000002-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'ps000001-0000-0000-0000-000000000001'::UUID, 'cpt00002-0000-0000-0000-000000000002'::UUID,
   NULL, 200.00, 0, '2025-01-01', true),
  
  ('pr000003-0000-0000-0000-000000000003'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'ps000001-0000-0000-0000-000000000001'::UUID, 'cpt00003-0000-0000-0000-000000000003'::UUID,
   NULL, 75.00, 0, '2025-01-01', true),
  
  ('pr000004-0000-0000-0000-000000000004'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'ps000001-0000-0000-0000-000000000001'::UUID, 'cpt00004-0000-0000-0000-000000000004'::UUID,
   NULL, 50.00, 0, '2025-01-01', true),
  
  ('pr000005-0000-0000-0000-000000000005'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'ps000001-0000-0000-0000-000000000001'::UUID, 'cpt00005-0000-0000-0000-000000000005'::UUID,
   NULL, 60.00, 0, '2025-01-01', true)
ON CONFLICT (organization_id, pricing_schedule_id, cpt_code_id, client_id, effective_date) DO NOTHING;

-- ================================================
-- STEP 7: SAMPLE INVOICES
-- ================================================
INSERT INTO invoices (
  id,
  organization_id,
  invoice_number,
  client_id,
  invoice_date,
  due_date,
  subtotal,
  total_amount,
  paid_amount,
  status,
  terms,
  notes
) VALUES 
  ('inv00001-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'INV-2025-0001', 'c0000001-0000-0000-0000-000000000001'::UUID,
   CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days',
   2500.00, 2500.00, 0, 'sent', 'Net 30', 'Monthly services'),
  
  ('inv00002-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'INV-2025-0002', 'c0000002-0000-0000-0000-000000000002'::UUID,
   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days',
   3750.00, 3750.00, 2000.00, 'partial', 'Net 30', 'Q1 2025 services'),
  
  ('inv00003-0000-0000-0000-000000000003'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'INV-2025-0003', 'c0000003-0000-0000-0000-000000000003'::UUID,
   CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days',
   1850.00, 1850.00, 1850.00, 'paid', 'Net 30', 'Lab work - January'),
  
  ('inv00004-0000-0000-0000-000000000004'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'INV-2025-0004', 'c0000004-0000-0000-0000-000000000004'::UUID,
   CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '60 days',
   5200.00, 5200.00, 0, 'overdue', 'Net 30', 'Consulting services'),
  
  ('inv00005-0000-0000-0000-000000000005'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'INV-2025-0005', 'c0000005-0000-0000-0000-000000000005'::UUID,
   CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '85 days',
   900.00, 900.00, 0, 'sent', 'Net 90', 'Educational services'),
  
  ('inv00006-0000-0000-0000-000000000006'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'INV-2025-0006', 'c0000001-0000-0000-0000-000000000001'::UUID,
   CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
   1500.00, 1500.00, 0, 'draft', 'Net 30', 'Draft invoice for review')
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- STEP 8: SAMPLE INVOICE ITEMS
-- ================================================
INSERT INTO invoice_items (
  id,
  organization_id,
  invoice_id,
  accession_number,
  cpt_code_id,
  description,
  service_date,
  quantity,
  unit_price
) VALUES
  -- Items for Invoice 1
  ('ii000001-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'inv00001-0000-0000-0000-000000000001'::UUID, 'ACC-2025-00001',
   'cpt00001-0000-0000-0000-000000000001'::UUID, 'Office visit', 
   CURRENT_DATE - INTERVAL '15 days', 5, 150.00),
  
  ('ii000002-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'inv00001-0000-0000-0000-000000000001'::UUID, 'ACC-2025-00002',
   'cpt00003-0000-0000-0000-000000000003'::UUID, 'Lab panel',
   CURRENT_DATE - INTERVAL '15 days', 10, 75.00),
  
  ('ii000003-0000-0000-0000-000000000003'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'inv00001-0000-0000-0000-000000000001'::UUID, 'ACC-2025-00003',
   'cpt00004-0000-0000-0000-000000000004'::UUID, 'Blood count',
   CURRENT_DATE - INTERVAL '15 days', 20, 50.00),
  
  -- Items for Invoice 2
  ('ii000004-0000-0000-0000-000000000004'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'inv00002-0000-0000-0000-000000000002'::UUID, 'ACC-2025-00004',
   'cpt00002-0000-0000-0000-000000000002'::UUID, 'Extended visit',
   CURRENT_DATE - INTERVAL '45 days', 15, 200.00),
  
  ('ii000005-0000-0000-0000-000000000005'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'inv00002-0000-0000-0000-000000000002'::UUID, 'ACC-2025-00005',
   'cpt00003-0000-0000-0000-000000000003'::UUID, 'Lab panel',
   CURRENT_DATE - INTERVAL '45 days', 10, 75.00)
ON CONFLICT (organization_id, accession_number, cpt_code_id) DO NOTHING;

-- ================================================
-- STEP 9: SAMPLE PAYMENTS
-- ================================================
INSERT INTO payments (
  id,
  organization_id,
  payment_number,
  client_id,
  payment_date,
  amount,
  payment_method,
  reference_number,
  status,
  notes
) VALUES
  ('pay00001-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'PAY-2025-0001', 'c0000002-0000-0000-0000-000000000002'::UUID,
   CURRENT_DATE - INTERVAL '30 days', 2000.00, 'check', 'CHK-12345',
   'cleared', 'Partial payment for INV-2025-0002'),
  
  ('pay00002-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'PAY-2025-0002', 'c0000003-0000-0000-0000-000000000003'::UUID,
   CURRENT_DATE - INTERVAL '35 days', 1850.00, 'ach', 'ACH-67890',
   'cleared', 'Full payment for INV-2025-0003')
ON CONFLICT (organization_id, payment_number) DO NOTHING;

-- ================================================
-- STEP 10: SAMPLE PAYMENT ALLOCATIONS
-- ================================================
INSERT INTO payment_allocations (
  id,
  organization_id,
  payment_id,
  invoice_id,
  allocated_amount,
  allocation_date
) VALUES
  ('pa000001-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'pay00001-0000-0000-0000-000000000001'::UUID, 'inv00002-0000-0000-0000-000000000002'::UUID,
   2000.00, CURRENT_DATE - INTERVAL '30 days'),
  
  ('pa000002-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000000'::UUID,
   'pay00002-0000-0000-0000-000000000002'::UUID, 'inv00003-0000-0000-0000-000000000003'::UUID,
   1850.00, CURRENT_DATE - INTERVAL '35 days')
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- VERIFICATION
-- ================================================
DO $$
DECLARE
  org_count INTEGER;
  role_count INTEGER;
  client_count INTEGER;
  invoice_count INTEGER;
  cpt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_count FROM organizations;
  SELECT COUNT(*) INTO role_count FROM roles;
  SELECT COUNT(*) INTO client_count FROM clients;
  SELECT COUNT(*) INTO invoice_count FROM invoices;
  SELECT COUNT(*) INTO cpt_count FROM cpt_codes;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'SEED DATA SUMMARY';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Organizations: %', org_count;
  RAISE NOTICE 'Roles: %', role_count;
  RAISE NOTICE 'Clients: %', client_count;
  RAISE NOTICE 'Invoices: %', invoice_count;
  RAISE NOTICE 'CPT Codes: %', cpt_count;
  RAISE NOTICE '====================================';
END $$;