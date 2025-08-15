-- ================================================
-- COMPLETE CURRENT SCHEMA - SINGLE SOURCE OF TRUTH
-- ================================================
-- This represents the ACTUAL current state of the database
-- Generated: 2025-08-15
-- ================================================

-- ================================================
-- EXTENSIONS
-- ================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- ORGANIZATIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'billing_company' CHECK (type IN ('billing_company', 'lab', 'clinic')),
  parent_organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

-- ================================================
-- USER_PROFILES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  permissions JSONB DEFAULT '[]',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);

-- ================================================
-- ROLES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- USER_ROLES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ================================================
-- CLIENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  billing_terms INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_name ON clients(organization_id, name);

-- ================================================
-- CPT_CODES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS cpt_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cpt_codes_org ON cpt_codes(organization_id);

-- ================================================
-- INVOICES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  date_due DATE, -- Duplicate column from migration
  billing_period_start DATE,
  billing_period_end DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0, -- Duplicate column from migration
  paid_amount DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'disputed')),
  terms TEXT,
  notes TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Duplicate column
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_org_created ON invoices(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);

-- ================================================
-- INVOICE_ITEMS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  accession_number TEXT NOT NULL,
  cpt_code_id UUID NOT NULL REFERENCES cpt_codes(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  service_date DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  pricing_rule_id UUID REFERENCES pricing_rules(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, accession_number, cpt_code_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_organization_id ON invoice_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_accession_number ON invoice_items(accession_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_date ON invoice_items(service_date);

-- ================================================
-- PRICING_SCHEDULES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS pricing_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  effective_date DATE NOT NULL,
  expiration_date DATE,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_pricing_schedules_org ON pricing_schedules(organization_id);

-- ================================================
-- PRICING_RULES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pricing_schedule_id UUID NOT NULL REFERENCES pricing_schedules(id) ON DELETE CASCADE,
  cpt_code_id UUID NOT NULL REFERENCES cpt_codes(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  base_price DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  minimum_price DECIMAL(10,2),
  maximum_price DECIMAL(10,2),
  effective_date DATE NOT NULL,
  expiration_date DATE,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, pricing_schedule_id, cpt_code_id, client_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_org ON pricing_rules(organization_id);

-- ================================================
-- PAYMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_number TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('check', 'ach', 'wire', 'credit_card', 'cash', 'other')),
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')),
  deposited_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, payment_number)
);

CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ================================================
-- PAYMENT_ALLOCATIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(12,2) NOT NULL,
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- ACCOUNT_CREDITS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS account_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  credit_number TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  used_amount DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount - used_amount) STORED,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  related_invoice_id UUID REFERENCES invoices(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, credit_number)
);

-- ================================================
-- DISPUTES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  dispute_number TEXT NOT NULL,
  disputed_amount DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  dispute_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected', 'escalated')),
  resolution TEXT,
  resolved_date DATE,
  resolved_amount DECIMAL(12,2),
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, dispute_number)
);

-- ================================================
-- IMPORT_QUEUES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS import_queues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_queues_org ON import_queues(organization_id);

-- ================================================
-- AUDIT_LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);

-- ================================================
-- VIEW: user_roles_lookup
-- ================================================
CREATE OR REPLACE VIEW user_roles_lookup AS
SELECT 
  ur.id,
  ur.user_id,
  r.name as role_name,
  ur.organization_id,
  r.permissions,
  ur.created_at
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;