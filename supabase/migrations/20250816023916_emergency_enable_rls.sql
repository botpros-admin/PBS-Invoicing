-- EMERGENCY: Enable Row Level Security on all tables
-- This is CRITICAL for security - prevents unauthorized data access
-- Date: 2025-08-16
-- Severity: CRITICAL

-- Enable RLS on core business tables
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS insurance_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit and tracking tables
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS account_credits ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lookup and configuration tables
ALTER TABLE IF EXISTS cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_cpt_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS procedure_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS insurance_payer_rules ENABLE ROW LEVEL SECURITY;

-- Enable RLS on document tables
ALTER TABLE IF EXISTS claims_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS insurance_authorization_documents ENABLE ROW LEVEL SECURITY;

-- Enable RLS on laboratory tables
ALTER TABLE IF EXISTS laboratory_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS laboratory_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS laboratory_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS laboratory_billing_rules ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled (for logging purposes)
DO $$
DECLARE
    table_record RECORD;
    disabled_count INTEGER := 0;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE '_prisma%'
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = table_record.schemaname
            AND c.relname = table_record.tablename
            AND c.relrowsecurity = true
        ) THEN
            disabled_count := disabled_count + 1;
            RAISE WARNING 'Table %.% still has RLS disabled', 
                table_record.schemaname, table_record.tablename;
        END IF;
    END LOOP;
    
    IF disabled_count > 0 THEN
        RAISE WARNING 'Total tables with RLS disabled: %', disabled_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All tables have RLS enabled';
    END IF;
END $$;