-- ================================================
-- FUNCTIONS AND TRIGGERS - CURRENT STATE
-- ================================================
-- All functions and triggers currently in the database
-- Generated: 2025-08-15

-- ================================================
-- UTILITY FUNCTIONS
-- ================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set updated_at function (alias)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- USER AND ORGANIZATION FUNCTIONS
-- ================================================

-- Get user organizations
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id 
  FROM user_profiles 
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's primary organization
CREATE OR REPLACE FUNCTION get_user_primary_organization()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM user_profiles 
  WHERE user_id = auth.uid() AND is_primary = true
  LIMIT 1;
  
  IF org_id IS NULL THEN
    SELECT organization_id INTO org_id
    FROM user_profiles 
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::UUID);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check organization access
CREATE OR REPLACE FUNCTION has_organization_access(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set user context for audit
CREATE OR REPLACE FUNCTION set_user_context(user_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.user_id', user_id::text, false);
  PERFORM set_config('app.organization_id', 
    COALESCE(
      (SELECT organization_id::text 
       FROM user_profiles 
       WHERE user_profiles.user_id = set_user_context.user_id 
       AND is_primary = true
       LIMIT 1),
      '00000000-0000-0000-0000-000000000000'
    ), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id, organization_id, role, permissions, is_primary)
  VALUES (
    NEW.id, 
    '00000000-0000-0000-0000-000000000000'::UUID, 
    'user',
    '["read"]'::jsonb,
    true
  )
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- REPORTING FUNCTIONS (RPC)
-- ================================================

-- Get aging report
CREATE OR REPLACE FUNCTION public.get_aging_report()
RETURNS TABLE (
  age_bracket TEXT,
  count BIGINT,
  total_amount NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN i.balance_due = 0 THEN 'Paid'
      WHEN EXTRACT(days FROM (CURRENT_DATE - i.due_date)) <= 0 THEN 'Current'
      WHEN EXTRACT(days FROM (CURRENT_DATE - i.due_date)) <= 30 THEN '1-30 days'
      WHEN EXTRACT(days FROM (CURRENT_DATE - i.due_date)) <= 60 THEN '31-60 days'
      WHEN EXTRACT(days FROM (CURRENT_DATE - i.due_date)) <= 90 THEN '61-90 days'
      ELSE '90+ days'
    END as age_bracket,
    COUNT(*)::BIGINT as count,
    COALESCE(SUM(i.balance_due), 0)::NUMERIC as total_amount
  FROM invoices i
  WHERE i.organization_id = COALESCE(
    (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::UUID
  )
  GROUP BY age_bracket
  ORDER BY 
    CASE age_bracket
      WHEN 'Paid' THEN 0
      WHEN 'Current' THEN 1
      WHEN '1-30 days' THEN 2
      WHEN '31-60 days' THEN 3
      WHEN '61-90 days' THEN 4
      ELSE 5
    END;
END;
$$;

-- Get client performance
CREATE OR REPLACE FUNCTION public.get_client_performance()
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  total_invoices BIGINT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  outstanding_amount NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    COUNT(i.id)::BIGINT as total_invoices,
    COALESCE(SUM(i.total_amount), 0)::NUMERIC as total_amount,
    COALESCE(SUM(i.paid_amount), 0)::NUMERIC as paid_amount,
    COALESCE(SUM(i.balance_due), 0)::NUMERIC as outstanding_amount
  FROM clients c
  LEFT JOIN invoices i ON c.id = i.client_id
  WHERE c.organization_id = COALESCE(
    (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::UUID
  )
  GROUP BY c.id, c.name
  ORDER BY total_amount DESC NULLS LAST;
END;
$$;

-- Get top CPT codes
CREATE OR REPLACE FUNCTION public.get_top_cpt_codes()
RETURNS TABLE (
  cpt_code TEXT,
  description TEXT,
  usage_count BIGINT,
  total_revenue NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(cpt.code, 'UNKNOWN') as cpt_code,
    COALESCE(cpt.description, ii.description) as description,
    COUNT(ii.id)::BIGINT as usage_count,
    COALESCE(SUM(ii.line_total), 0)::NUMERIC as total_revenue
  FROM invoice_items ii
  LEFT JOIN cpt_codes cpt ON ii.cpt_code_id = cpt.id
  WHERE ii.organization_id = COALESCE(
    (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::UUID
  )
  GROUP BY cpt.code, cpt.description, ii.description
  ORDER BY total_revenue DESC, usage_count DESC
  LIMIT 10;
END;
$$;

-- Get all invoices
CREATE OR REPLACE FUNCTION public.get_all_invoices()
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  client_name TEXT,
  invoice_date DATE,
  due_date DATE,
  total_amount NUMERIC,
  balance_due NUMERIC,
  status TEXT,
  organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.invoice_number,
    c.name as client_name,
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.balance_due,
    i.status,
    i.organization_id
  FROM invoices i
  LEFT JOIN clients c ON i.client_id = c.id
  ORDER BY i.created_at DESC;
END;
$$;

-- Get dashboard summary
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS TABLE (
  total_invoices BIGINT,
  total_clients BIGINT,
  total_revenue NUMERIC,
  outstanding_balance NUMERIC,
  paid_this_month NUMERIC,
  organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM invoices WHERE organization_id = '00000000-0000-0000-0000-000000000000'::UUID)::BIGINT as total_invoices,
    (SELECT COUNT(*) FROM clients WHERE organization_id = '00000000-0000-0000-0000-000000000000'::UUID)::BIGINT as total_clients,
    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE organization_id = '00000000-0000-0000-0000-000000000000'::UUID)::NUMERIC as total_revenue,
    (SELECT COALESCE(SUM(balance_due), 0) FROM invoices WHERE organization_id = '00000000-0000-0000-0000-000000000000'::UUID AND balance_due > 0)::NUMERIC as outstanding_balance,
    (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE organization_id = '00000000-0000-0000-0000-000000000000'::UUID AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE))::NUMERIC as paid_this_month,
    '00000000-0000-0000-0000-000000000000'::UUID as organization_id;
END;
$$;

-- Get invoices with details
CREATE OR REPLACE FUNCTION public.get_invoices_with_details()
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  client_id UUID,
  client_name TEXT,
  invoice_date DATE,
  due_date DATE,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  balance_due NUMERIC,
  status TEXT,
  organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.invoice_number,
    i.client_id,
    c.name as client_name,
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.paid_amount,
    i.balance_due,
    i.status,
    i.organization_id
  FROM invoices i
  LEFT JOIN clients c ON i.client_id = c.id
  WHERE i.organization_id = COALESCE(
    (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::UUID
  )
  ORDER BY i.created_at DESC;
END;
$$;

-- Diagnose data issues
CREATE OR REPLACE FUNCTION public.diagnose_data_issues()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_invoice_count INTEGER;
  v_client_count INTEGER;
  v_visible_invoices INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  SELECT organization_id INTO v_org_id
  FROM user_profiles
  WHERE user_id = v_user_id
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    'Authentication'::TEXT,
    CASE WHEN v_user_id IS NOT NULL THEN 'PASS' ELSE 'FAIL' END::TEXT,
    COALESCE('User ID: ' || v_user_id::TEXT, 'Not authenticated')::TEXT;
  
  RETURN QUERY
  SELECT 
    'User Profile'::TEXT,
    CASE WHEN v_org_id IS NOT NULL THEN 'PASS' ELSE 'FAIL' END::TEXT,
    COALESCE('Organization: ' || v_org_id::TEXT, 'No profile found')::TEXT;
  
  SELECT COUNT(*) INTO v_invoice_count FROM invoices;
  RETURN QUERY
  SELECT 
    'Total Invoices'::TEXT,
    CASE WHEN v_invoice_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('Found %s invoices in database', v_invoice_count)::TEXT;
  
  SELECT COUNT(*) INTO v_client_count FROM clients;
  RETURN QUERY
  SELECT 
    'Total Clients'::TEXT,
    CASE WHEN v_client_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('Found %s clients in database', v_client_count)::TEXT;
  
  SELECT COUNT(*) INTO v_visible_invoices 
  FROM invoices i
  LEFT JOIN clients c ON i.client_id = c.id
  WHERE i.organization_id = COALESCE(v_org_id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  RETURN QUERY
  SELECT 
    'Visible Invoices'::TEXT,
    CASE WHEN v_visible_invoices > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('User can see %s invoices', v_visible_invoices)::TEXT;
  
  RETURN QUERY
  SELECT 
    'RPC Functions'::TEXT,
    CASE 
      WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_aging_report')
      AND EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_client_performance')
      AND EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_top_cpt_codes')
      THEN 'PASS' 
      ELSE 'FAIL' 
    END::TEXT,
    'All required RPC functions exist'::TEXT;
END;
$$;

-- ================================================
-- INVOICE CALCULATION FUNCTIONS
-- ================================================

-- Update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals(invoice_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE invoices 
  SET 
    subtotal = (
      SELECT COALESCE(SUM(line_total), 0) 
      FROM invoice_items 
      WHERE invoice_id = invoice_uuid
    ),
    total_amount = subtotal + tax_amount,
    updated_at = NOW()
  WHERE id = invoice_uuid;
END;
$$ LANGUAGE plpgsql;

-- Update invoice paid amount
CREATE OR REPLACE FUNCTION update_invoice_paid_amount(invoice_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE invoices 
  SET 
    paid_amount = (
      SELECT COALESCE(SUM(allocated_amount), 0) 
      FROM payment_allocations 
      WHERE invoice_id = invoice_uuid
    ),
    updated_at = NOW()
  WHERE id = invoice_uuid;
  
  UPDATE invoices 
  SET status = CASE 
    WHEN paid_amount >= total_amount THEN 'paid'
    WHEN paid_amount > 0 THEN 'partial'
    ELSE status
  END
  WHERE id = invoice_uuid;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- AUDIT FUNCTIONS
-- ================================================

-- Safe audit trigger function
CREATE OR REPLACE FUNCTION safe_audit_trigger()
RETURNS trigger AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_record_id UUID;
  v_table_name TEXT;
  v_operation TEXT;
BEGIN
  v_table_name := TG_TABLE_NAME;
  v_operation := TG_OP;
  
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;
  
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_org_id := OLD.organization_id;
      v_record_id := OLD.id;
    ELSE
      v_org_id := NEW.organization_id;
      v_record_id := NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_org_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END;
  
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'audit_logs' AND column_name = 'organization_id'
    ) THEN
      INSERT INTO audit_logs (
        organization_id,
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_by,
        changed_at
      ) VALUES (
        v_org_id,
        v_table_name,
        v_record_id,
        v_operation,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        v_user_id,
        NOW()
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit logging failed for % on %: %', v_operation, v_table_name, SQLERRM;
  END;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- TRIGGERS
-- ================================================

-- Update timestamp triggers
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at 
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at 
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- New user trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Invoice calculation triggers
CREATE OR REPLACE FUNCTION invoice_item_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_invoice_totals(OLD.invoice_id);
    RETURN OLD;
  ELSE
    PERFORM update_invoice_totals(NEW.invoice_id);
    IF TG_OP = 'UPDATE' AND OLD.invoice_id != NEW.invoice_id THEN
      PERFORM update_invoice_totals(OLD.invoice_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_item_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION invoice_item_trigger();

-- Payment allocation trigger
CREATE OR REPLACE FUNCTION payment_allocation_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_invoice_paid_amount(OLD.invoice_id);
    RETURN OLD;
  ELSE
    PERFORM update_invoice_paid_amount(NEW.invoice_id);
    IF TG_OP = 'UPDATE' AND OLD.invoice_id != NEW.invoice_id THEN
      PERFORM update_invoice_paid_amount(OLD.invoice_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_allocation_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION payment_allocation_trigger();

-- ================================================
-- PERMISSIONS
-- ================================================
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;