-- Laboratory Billing System: 3-Level Hierarchy
-- PBS → Laboratory → Clinic

-- Billing Company (PBS level)
CREATE TABLE IF NOT EXISTS billing_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Laboratories (second level)
CREATE TABLE IF NOT EXISTS laboratories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_company_id UUID NOT NULL REFERENCES billing_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(billing_company_id, name)
);

-- Update clinics table to reference laboratories
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id),
  ADD COLUMN IF NOT EXISTS parent_clinic_id UUID REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS invoice_type TEXT CHECK (invoice_type IN ('SNF', 'Hospice', 'Standard', 'Other')),
  ADD COLUMN IF NOT EXISTS sales_rep TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS fee_schedule_id UUID;

-- Import failures queue
CREATE TABLE IF NOT EXISTS import_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  failure_type TEXT NOT NULL CHECK (failure_type IN ('duplicate', 'missing_clinic', 'missing_cpt', 'invalid_format', 'other')),
  failure_reason TEXT NOT NULL,
  row_data JSONB NOT NULL,
  fixable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

-- CPT Code Mappings (VLOOKUP style)
CREATE TABLE IF NOT EXISTS cpt_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  input_code TEXT NOT NULL,
  output_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, input_code)
);

-- Fee Schedules
CREATE TABLE IF NOT EXISTS fee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  effective_date DATE NOT NULL,
  expiration_date DATE,
  parent_schedule_id UUID REFERENCES fee_schedules(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Fee Schedule Items
CREATE TABLE IF NOT EXISTS fee_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_schedule_id UUID NOT NULL REFERENCES fee_schedules(id) ON DELETE CASCADE,
  cpt_code TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fee_schedule_id, cpt_code)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clients(id),
  payment_number TEXT NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Check', 'ACH', 'Card', 'Cash', 'Credit')),
  check_number TEXT,
  amount DECIMAL(10,2) NOT NULL,
  applied_amount DECIMAL(10,2) DEFAULT 0,
  unapplied_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unapplied' CHECK (status IN ('unapplied', 'applied', 'on_hold')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, payment_number)
);

-- Payment Allocations (line-level)
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  invoice_line_id UUID NOT NULL REFERENCES invoice_items(id),
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credits
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clients(id),
  amount DECIMAL(10,2) NOT NULL,
  applied_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes (line-level)
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  invoice_line_id UUID REFERENCES invoice_items(id),
  clinic_id UUID NOT NULL REFERENCES clients(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolution TEXT,
  disputed_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

-- Update invoice_items for line-level tracking
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS accession_number TEXT,
  ADD COLUMN IF NOT EXISTS patient_first_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_last_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_dob DATE,
  ADD COLUMN IF NOT EXISTS date_of_service DATE,
  ADD COLUMN IF NOT EXISTS units INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS display_note TEXT,
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disputed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add unique constraint for duplicate detection
ALTER TABLE invoice_items
  ADD CONSTRAINT unique_accession_cpt UNIQUE (invoice_id, accession_number, test_name);

-- Add invoice status tracking
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_on_hold BOOLEAN DEFAULT false;

-- Audit log table for HIPAA compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'DOWNLOAD', 'EXPORT')),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_laboratories_billing_company ON laboratories(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_clients_laboratory ON clients(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_clients_parent ON clients(parent_clinic_id);
CREATE INDEX IF NOT EXISTS idx_import_failures_tenant ON import_failures(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpt_mappings_lookup ON cpt_mappings(tenant_id, input_code);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_tenant ON fee_schedules(tenant_id, is_default);
CREATE INDEX IF NOT EXISTS idx_payments_clinic ON payments(clinic_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credits_clinic ON credits(clinic_id, remaining_amount);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_accession ON invoice_items(accession_number, test_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(table_name, record_id, created_at DESC);

-- Insert default billing company for PBS
INSERT INTO billing_companies (name) 
VALUES ('Precision Billing Solutions')
ON CONFLICT DO NOTHING;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_companies_updated_at BEFORE UPDATE ON billing_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_laboratories_updated_at BEFORE UPDATE ON laboratories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_cpt_mappings_updated_at BEFORE UPDATE ON cpt_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_fee_schedules_updated_at BEFORE UPDATE ON fee_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_fee_schedule_items_updated_at BEFORE UPDATE ON fee_schedule_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();