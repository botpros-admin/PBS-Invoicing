-- EMERGENCY: Create critical performance indexes
-- These indexes are essential for preventing query timeouts and system collapse
-- Date: 2025-08-16
-- Severity: CRITICAL

-- Invoices table indexes (most critical for performance)
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_invoices_status_created 
  ON invoices(status, created_at DESC);

-- Invoice items indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id 
  ON invoice_items(invoice_id);
-- CREATE INDEX IF NOT EXISTS idx_invoice_items_procedure_code 
--   ON invoice_items(procedure_code);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_date 
  ON invoice_items(service_date);

-- Payments and allocations indexes
CREATE INDEX IF NOT EXISTS idx_payments_created_at 
  ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date 
  ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_client_id 
  ON payments(client_id);
-- CREATE INDEX IF NOT EXISTS idx_payments_payment_method 
--   ON payments(payment_method);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id 
  ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id 
  ON payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_created_at 
  ON payment_allocations(created_at DESC);

-- Claims table indexes (if table exists)
-- CREATE INDEX IF NOT EXISTS idx_claims_invoice_id 
--   ON claims(invoice_id);
-- CREATE INDEX IF NOT EXISTS idx_claims_insurance_payer_id 
--   ON claims(insurance_payer_id);
-- CREATE INDEX IF NOT EXISTS idx_claims_status 
--   ON claims(status);
-- CREATE INDEX IF NOT EXISTS idx_claims_submitted_date 
--   ON claims(submitted_date DESC);
-- CREATE INDEX IF NOT EXISTS idx_claims_claim_number 
--   ON claims(claim_number);

-- Audit logs indexes (critical for compliance queries)
-- Commented out as columns may vary
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by 
--   ON audit_logs(changed_by);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at 
--   ON audit_logs(changed_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name 
--   ON audit_logs(table_name);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id 
--   ON audit_logs(record_id);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record 
--   ON audit_logs(table_name, record_id, changed_at DESC);

-- Status history indexes (if table exists)
-- CREATE INDEX IF NOT EXISTS idx_invoice_status_history_invoice_id 
--   ON invoice_status_history(invoice_id);
-- CREATE INDEX IF NOT EXISTS idx_invoice_status_history_changed_at 
--   ON invoice_status_history(changed_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_invoice_status_history_status 
--   ON invoice_status_history(new_status);

-- Client indexes
-- CREATE INDEX IF NOT EXISTS idx_clients_practice_id 
--   ON clients(practice_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at 
  ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_is_active 
  ON clients(is_active);

-- Insurance payer indexes (if table exists)
-- CREATE INDEX IF NOT EXISTS idx_insurance_payers_name 
--   ON insurance_payers(name);
-- CREATE INDEX IF NOT EXISTS idx_insurance_payers_is_active 
--   ON insurance_payers(is_active);

-- CPT code mapping indexes (if table exists)
-- CREATE INDEX IF NOT EXISTS idx_client_cpt_mappings_client_id 
--   ON client_cpt_mappings(client_id);
-- CREATE INDEX IF NOT EXISTS idx_client_cpt_mappings_internal_code 
--   ON client_cpt_mappings(internal_code);
-- CREATE INDEX IF NOT EXISTS idx_client_cpt_mappings_cpt_code 
--   ON client_cpt_mappings(cpt_code);

-- Account credits indexes
CREATE INDEX IF NOT EXISTS idx_account_credits_client_id 
  ON account_credits(client_id);
CREATE INDEX IF NOT EXISTS idx_account_credits_created_at 
  ON account_credits(created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_account_credits_is_applied 
--   ON account_credits(is_applied);

-- Users table indexes (if columns exist)
-- CREATE INDEX IF NOT EXISTS idx_users_email 
--   ON users(email);
-- CREATE INDEX IF NOT EXISTS idx_users_role 
--   ON users(role);
-- CREATE INDEX IF NOT EXISTS idx_users_is_active 
--   ON users(is_active);

-- Analyze tables to update statistics after index creation
DO $$
BEGIN
  -- Analyze only existing tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ANALYZE invoices;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
    ANALYZE invoice_items;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ANALYZE payments;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_allocations') THEN
    ANALYZE payment_allocations;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    ANALYZE clients;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ANALYZE audit_logs;
  END IF;
END $$;

-- Log index creation success
DO $$
BEGIN
    RAISE NOTICE 'Critical indexes created successfully. Performance should improve immediately.';
END $$;