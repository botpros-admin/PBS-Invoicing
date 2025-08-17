-- Complete Row Level Security Policies for EXISTING Tables
-- This migration ensures every existing table has proper RLS enabled and configured

-- ============================================
-- ENABLE RLS ON EXISTING TABLES ONLY
-- ============================================

-- Enable RLS on tables that exist
DO $$
BEGIN
  -- Check and enable RLS for each table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
    ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
    ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_allocations') THEN
    ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cpt_codes') THEN
    ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- CREATE RLS POLICIES FOR EXISTING TABLES
-- ============================================

-- Users table policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view organization members" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    
    -- Create new policies
    CREATE POLICY "Users can view organization members"
    ON users FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    );

    CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Clients table policies  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    DROP POLICY IF EXISTS "Users can view organization clients" ON clients;
    DROP POLICY IF EXISTS "Users can manage organization clients" ON clients;
    
    CREATE POLICY "Users can view organization clients"
    ON clients FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    );
    
    CREATE POLICY "Users can manage organization clients"
    ON clients FOR ALL
    USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    );
  END IF;
END $$;

-- Invoices table policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    DROP POLICY IF EXISTS "Users can view organization invoices" ON invoices;
    DROP POLICY IF EXISTS "Users can create organization invoices" ON invoices;
    DROP POLICY IF EXISTS "Users can update organization invoices" ON invoices;
    
    CREATE POLICY "Users can view organization invoices"
    ON invoices FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
      OR
      client_id IN (
        SELECT id FROM clients WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    );

    CREATE POLICY "Users can create organization invoices"
    ON invoices FOR INSERT
    WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
      OR
      client_id IN (
        SELECT id FROM clients WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    );

    CREATE POLICY "Users can update organization invoices"
    ON invoices FOR UPDATE
    USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
      OR
      client_id IN (
        SELECT id FROM clients WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Invoice items table policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
    DROP POLICY IF EXISTS "Users can view organization invoice items" ON invoice_items;
    DROP POLICY IF EXISTS "Users can manage organization invoice items" ON invoice_items;
    
    CREATE POLICY "Users can view organization invoice items"
    ON invoice_items FOR SELECT
    USING (
      invoice_id IN (
        SELECT id FROM invoices 
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR client_id IN (
          SELECT id FROM clients WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
          )
        )
      )
    );

    CREATE POLICY "Users can manage organization invoice items"
    ON invoice_items FOR ALL
    USING (
      invoice_id IN (
        SELECT id FROM invoices 
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR client_id IN (
          SELECT id FROM clients WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
          )
        )
      )
    );
  END IF;
END $$;

-- Payments table policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    DROP POLICY IF EXISTS "Users can view organization payments" ON payments;
    DROP POLICY IF EXISTS "Users can create payments" ON payments;
    DROP POLICY IF EXISTS "No one can delete payments" ON payments;
    
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
        OR client_id IN (
          SELECT id FROM clients WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
          )
        )
      )
      OR
      client_id IN (
        SELECT id FROM clients WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    );

    CREATE POLICY "Users can create payments"
    ON payments FOR INSERT
    WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
      OR
      client_id IN (
        SELECT id FROM clients WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    );

    -- No one can delete payments (audit trail)
    CREATE POLICY "No one can delete payments"
    ON payments FOR DELETE
    USING (false);
  END IF;
END $$;

-- CPT codes table policies (reference data - everyone can view)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cpt_codes') THEN
    DROP POLICY IF EXISTS "Everyone can view CPT codes" ON cpt_codes;
    
    CREATE POLICY "Everyone can view CPT codes"
    ON cpt_codes FOR SELECT
    USING (true);
  END IF;
END $$;

-- ============================================
-- VERIFY RLS IS ENABLED
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
    AND tablename NOT IN ('schema_migrations', 'pg_stat_statements', 'supabase_migrations')
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