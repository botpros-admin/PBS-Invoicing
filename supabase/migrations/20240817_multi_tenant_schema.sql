-- ========================================
-- PBS Invoicing Multi-Tenant Schema Migration
-- Phase 1: Create New Tenant Tables
-- ========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CORE TENANT MANAGEMENT TABLES
-- ========================================

-- Billing Companies table (Top-level tenants)
CREATE TABLE IF NOT EXISTS billing_companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  domain TEXT UNIQUE,
  logo TEXT,
  address JSONB,
  phone TEXT,
  email TEXT,
  tax_id TEXT UNIQUE,
  
  -- Subscription & Billing
  subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'professional', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
  billing_email TEXT,
  
  -- Configuration
  settings JSONB DEFAULT '{}',
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Multi-tenant isolation
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Healthcare Providers table (Sub-tenants)
CREATE TABLE IF NOT EXISTS healthcare_providers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  npi TEXT,
  tax_id TEXT,
  
  -- Address & Contact
  address JSONB,
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Provider Type & Specialization
  provider_type TEXT NOT NULL CHECK (provider_type IN ('hospital', 'clinic', 'practice', 'laboratory')),
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Billing Configuration
  billing_address JSONB,
  clearinghouse TEXT,
  
  -- Multi-tenant relationships
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id) ON DELETE CASCADE,
  
  -- Status & Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(billing_company_id, npi)
);

-- ========================================
-- ENHANCED USER MANAGEMENT
-- ========================================

-- Create UserRole enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'COMPANY_ADMIN',
    'PROVIDER_ADMIN',
    'BILLING_MANAGER',
    'USER',
    'READ_ONLY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enhanced Users table with multi-tenant support
CREATE TABLE IF NOT EXISTS users_multitenant (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  supabase_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  
  -- Multi-tenant relationships
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id) ON DELETE CASCADE,
  provider_id TEXT REFERENCES healthcare_providers(id) ON DELETE SET NULL,
  
  -- Role-based access control
  role user_role DEFAULT 'USER',
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- User status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- TENANT-AWARE DATA TABLES
-- ========================================

-- Enhanced Patients table with multi-tenant support
CREATE TABLE IF NOT EXISTS patients_multitenant (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Patient Information
  mrn TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT,
  ssn TEXT, -- Should be encrypted
  
  -- Contact Information
  address JSONB,
  phone TEXT,
  email TEXT,
  emergency_contact JSONB,
  
  -- Insurance Information
  primary_insurance JSONB,
  secondary_insurance JSONB,
  
  -- Multi-tenant isolation
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES healthcare_providers(id) ON DELETE CASCADE,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(provider_id, mrn)
);

-- Create InvoiceStatus enum type
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'DRAFT',
    'PENDING',
    'SENT',
    'PAID',
    'PARTIAL',
    'OVERDUE',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enhanced Invoices table with multi-tenant support
CREATE TABLE IF NOT EXISTS invoices_multitenant (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_number TEXT NOT NULL,
  
  -- Invoice Details
  service_date DATE NOT NULL,
  billing_date TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  
  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Status
  status invoice_status DEFAULT 'DRAFT',
  
  -- Multi-tenant isolation
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES healthcare_providers(id) ON DELETE CASCADE,
  
  -- Relationships
  patient_id TEXT NOT NULL REFERENCES patients_multitenant(id),
  created_by_id TEXT NOT NULL REFERENCES users_multitenant(id),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(provider_id, invoice_number)
);

-- Invoice Line Items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Line Item Details
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Medical Coding
  cpt_code TEXT,
  modifier TEXT,
  diagnosis_code TEXT,
  
  -- Multi-tenant isolation (inherited from invoice)
  billing_company_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  
  -- Relationships
  invoice_id TEXT NOT NULL REFERENCES invoices_multitenant(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create PaymentMethod enum type
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'CASH',
    'CHECK',
    'CREDIT_CARD',
    'ACH',
    'WIRE_TRANSFER',
    'INSURANCE',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create PaymentSource enum type
DO $$ BEGIN
  CREATE TYPE payment_source AS ENUM (
    'PATIENT',
    'PRIMARY_INSURANCE',
    'SECONDARY_INSURANCE',
    'GOVERNMENT',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enhanced Payments table with multi-tenant support
CREATE TABLE IF NOT EXISTS payments_multitenant (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Payment Details
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method payment_method NOT NULL,
  reference_number TEXT,
  
  -- Payment Source
  source payment_source NOT NULL,
  insurance_info JSONB,
  
  -- Multi-tenant isolation
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES healthcare_providers(id) ON DELETE CASCADE,
  
  -- Relationships
  invoice_id TEXT NOT NULL REFERENCES invoices_multitenant(id),
  created_by_id TEXT NOT NULL REFERENCES users_multitenant(id),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CONFIGURATION & SETTINGS
-- ========================================

-- Company Settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  category TEXT NOT NULL,
  
  -- Multi-tenant isolation
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(billing_company_id, key)
);

-- Provider Settings table
CREATE TABLE IF NOT EXISTS provider_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  category TEXT NOT NULL,
  
  -- Multi-tenant isolation
  billing_company_id TEXT NOT NULL,
  provider_id TEXT NOT NULL REFERENCES healthcare_providers(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(provider_id, key)
);

-- Create PricingRuleType enum type
DO $$ BEGIN
  CREATE TYPE pricing_rule_type AS ENUM (
    'FIXED_PRICE',
    'PERCENTAGE_DISCOUNT',
    'PERCENTAGE_MARKUP',
    'INSURANCE_FEE_SCHEDULE',
    'MEDICARE_FEE_SCHEDULE',
    'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Pricing Rules table
CREATE TABLE IF NOT EXISTS pricing_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Rule Configuration
  rule_type pricing_rule_type NOT NULL,
  criteria JSONB NOT NULL,
  action JSONB NOT NULL,
  
  -- Scope
  cpt_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  diagnosis_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Multi-tenant isolation
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id) ON DELETE CASCADE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_date TIMESTAMPTZ DEFAULT NOW(),
  expiration_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- REFERENCE DATA (SHARED ACROSS TENANTS)
-- ========================================

-- CPT Codes table (shared reference data)
CREATE TABLE IF NOT EXISTS cpt_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  
  -- Reference data
  rvu DECIMAL(8, 2),
  medicare_2024 DECIMAL(10, 2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  termination_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diagnosis Codes table (shared reference data)
CREATE TABLE IF NOT EXISTS diagnosis_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  
  -- ICD-10 specific
  code_type TEXT DEFAULT 'ICD10',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  termination_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- AUDIT & LOGGING
-- ========================================

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Audit Details
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  
  -- Multi-tenant context
  billing_company_id TEXT,
  provider_id TEXT,
  user_id TEXT REFERENCES users_multitenant(id),
  
  -- Request context
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Billing Companies indexes
CREATE INDEX IF NOT EXISTS idx_billing_companies_subdomain ON billing_companies(subdomain);
CREATE INDEX IF NOT EXISTS idx_billing_companies_is_active ON billing_companies(is_active);

-- Healthcare Providers indexes
CREATE INDEX IF NOT EXISTS idx_healthcare_providers_billing_company ON healthcare_providers(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_providers_npi ON healthcare_providers(npi);
CREATE INDEX IF NOT EXISTS idx_healthcare_providers_is_active ON healthcare_providers(is_active);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_billing_company ON users_multitenant(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users_multitenant(provider_id);
CREATE INDEX IF NOT EXISTS idx_users_supabase ON users_multitenant(supabase_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users_multitenant(email);

-- Patients indexes
CREATE INDEX IF NOT EXISTS idx_patients_billing_company ON patients_multitenant(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_patients_provider ON patients_multitenant(provider_id);
CREATE INDEX IF NOT EXISTS idx_patients_mrn_provider ON patients_multitenant(mrn, provider_id);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_billing_company ON invoices_multitenant(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_provider ON invoices_multitenant(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices_multitenant(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices_multitenant(status);
CREATE INDEX IF NOT EXISTS idx_invoices_service_date ON invoices_multitenant(service_date);

-- Invoice Line Items indexes
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_cpt ON invoice_line_items(cpt_code);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_billing_company ON payments_multitenant(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments_multitenant(provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments_multitenant(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments_multitenant(payment_date);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_company_settings_billing_company ON company_settings(billing_company_id, category);
CREATE INDEX IF NOT EXISTS idx_provider_settings_provider ON provider_settings(provider_id, category);

-- Pricing Rules indexes
CREATE INDEX IF NOT EXISTS idx_pricing_rules_billing_company ON pricing_rules(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_is_active ON pricing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_effective_date ON pricing_rules(effective_date);

-- Reference Data indexes
CREATE INDEX IF NOT EXISTS idx_cpt_codes_code ON cpt_codes(code);
CREATE INDEX IF NOT EXISTS idx_cpt_codes_category ON cpt_codes(category);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_code ON diagnosis_codes(code);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_category ON diagnosis_codes(category);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_type ON diagnosis_codes(code_type);

-- Audit Log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_billing_company ON audit_logs(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_provider ON audit_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_billing_companies_updated_at BEFORE UPDATE ON billing_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_healthcare_providers_updated_at BEFORE UPDATE ON healthcare_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users_multitenant
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients_multitenant
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices_multitenant
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_line_items_updated_at BEFORE UPDATE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments_multitenant
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_settings_updated_at BEFORE UPDATE ON provider_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cpt_codes_updated_at BEFORE UPDATE ON cpt_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagnosis_codes_updated_at BEFORE UPDATE ON diagnosis_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();