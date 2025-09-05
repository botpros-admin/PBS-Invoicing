-- ============================================================================
-- CRITICAL SQL MIGRATIONS FOR LABORATORY BILLING FEATURES
-- Apply these in Supabase SQL Editor in ORDER
-- ============================================================================

-- 1. ADD PATIENT FIELDS AND LABORATORY FEATURES TO INVOICE_ITEMS
-- ============================================================================
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS patient_first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS patient_last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS patient_dob DATE,
ADD COLUMN IF NOT EXISTS patient_mrn VARCHAR(50),
ADD COLUMN IF NOT EXISTS patient_insurance_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS units DECIMAL(10, 2) DEFAULT 1,
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'Regular',
ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS dispute_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispute_resolved_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispute_resolution TEXT,
ADD COLUMN IF NOT EXISTS is_duplicate_override BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS duplicate_override_reason TEXT,
ADD COLUMN IF NOT EXISTS duplicate_override_by UUID,
ADD COLUMN IF NOT EXISTS duplicate_override_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS import_batch_id UUID,
ADD COLUMN IF NOT EXISTS import_row_number INT,
ADD COLUMN IF NOT EXISTS import_status VARCHAR(50) DEFAULT 'success',
ADD COLUMN IF NOT EXISTS import_error_message TEXT;

-- Create index for accession number (already exists but safe to run)
CREATE INDEX IF NOT EXISTS idx_invoice_items_accession ON public.invoice_items(accession_number);

-- Create unique constraint for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_accession_cpt_org 
ON public.invoice_items(accession_number, cpt_code, organization_id) 
WHERE is_duplicate_override = FALSE;

-- ============================================================================
-- 2. PARENT-CHILD CLIENT RELATIONSHIPS (For 150-300 location management)
-- ============================================================================
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS parent_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parent_client_id ON public.clients(parent_client_id);

-- ============================================================================
-- 3. DISPUTE TICKETING SYSTEM TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    invoice_id UUID REFERENCES public.invoices(id),
    invoice_item_id UUID REFERENCES public.invoice_items(id),
    client_id UUID REFERENCES public.clients(id),
    dispute_number VARCHAR(50) NOT NULL,
    disputed_amount DECIMAL(10, 2),
    reason_category VARCHAR(50),
    reason_details TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    source VARCHAR(50) DEFAULT 'portal',
    resolution_type VARCHAR(50),
    resolution_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_disputes_org ON disputes(organization_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_client ON disputes(client_id);

CREATE TABLE IF NOT EXISTS public.dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    attachments TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);

-- ============================================================================
-- 4. PRICING TABLES FOR DYNAMIC PRICING WITH FALLBACK
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    cpt_code VARCHAR(20) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_org_cpt ON pricing_rules(organization_id, cpt_code);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_default ON pricing_rules(is_default) WHERE is_default = TRUE;

CREATE TABLE IF NOT EXISTS public.clinic_pricing_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    clinic_id UUID NOT NULL REFERENCES public.clients(id),
    cpt_code VARCHAR(20) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_pricing_clinic_cpt ON clinic_pricing_overrides(clinic_id, cpt_code);

-- ============================================================================
-- 5. PARENT ACCOUNT AGGREGATION FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_parent_clients_with_stats(
  org_id UUID,
  page_number INT DEFAULT 1,
  page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  code VARCHAR,
  parent_client_id UUID,
  child_count BIGINT,
  total_outstanding DECIMAL,
  total_invoices BIGINT,
  avg_payment_days DECIMAL,
  last_activity TIMESTAMPTZ,
  address JSONB,
  contact_info JSONB,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH parent_stats AS (
    SELECT 
      p.id,
      p.name,
      p.code,
      p.parent_client_id,
      COUNT(DISTINCT c.id) as child_count,
      COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('sent', 'overdue')), 0) as total_outstanding,
      COUNT(DISTINCT i.id) as total_invoices,
      AVG(
        CASE 
          WHEN i.paid_date IS NOT NULL 
          THEN EXTRACT(DAY FROM i.paid_date - i.issue_date)
          ELSE NULL
        END
      ) as avg_payment_days,
      MAX(GREATEST(p.updated_at, c.updated_at, i.updated_at)) as last_activity,
      p.address,
      p.contact_info,
      p.metadata
    FROM clients p
    LEFT JOIN clients c ON c.parent_client_id = p.id AND c.organization_id = org_id
    LEFT JOIN invoices i ON (i.client_id = p.id OR i.client_id = c.id) 
      AND i.organization_id = org_id
    WHERE p.organization_id = org_id
      AND p.parent_client_id IS NULL  -- Only get parent accounts
    GROUP BY p.id, p.name, p.code, p.parent_client_id, p.address, p.contact_info, p.metadata
  )
  SELECT * FROM parent_stats
  ORDER BY child_count DESC, name ASC
  LIMIT page_size
  OFFSET (page_number - 1) * page_size;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_child_locations(
  parent_id UUID,
  org_id UUID
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  code VARCHAR,
  status VARCHAR,
  total_outstanding DECIMAL,
  last_invoice_date DATE,
  invoice_count BIGINT,
  address JSONB,
  contact_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.code,
    c.status,
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('sent', 'overdue')), 0) as total_outstanding,
    MAX(i.issue_date) as last_invoice_date,
    COUNT(DISTINCT i.id) as invoice_count,
    c.address,
    c.contact_info
  FROM clients c
  LEFT JOIN invoices i ON i.client_id = c.id AND i.organization_id = org_id
  WHERE c.parent_client_id = parent_id
    AND c.organization_id = org_id
  GROUP BY c.id, c.name, c.code, c.status, c.address, c.contact_info
  ORDER BY c.name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_parent_account_invoice_summary(
  parent_id UUID,
  org_id UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  month DATE,
  total_amount DECIMAL,
  paid_amount DECIMAL,
  outstanding_amount DECIMAL,
  invoice_count BIGINT,
  child_location_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT 
      DATE_TRUNC('month', i.issue_date)::DATE as month,
      SUM(i.total_amount) as total_amount,
      SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN i.status IN ('sent', 'overdue') THEN i.total_amount ELSE 0 END) as outstanding_amount,
      COUNT(DISTINCT i.id) as invoice_count,
      COUNT(DISTINCT i.client_id) as child_location_count
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    WHERE (c.id = parent_id OR c.parent_client_id = parent_id)
      AND i.organization_id = org_id
      AND (start_date IS NULL OR i.issue_date >= start_date)
      AND (end_date IS NULL OR i.issue_date <= end_date)
    GROUP BY DATE_TRUNC('month', i.issue_date)
  )
  SELECT * FROM monthly_data
  ORDER BY month DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_parent_clients_with_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_child_locations TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_account_invoice_summary TO authenticated;

-- ============================================================================
-- 6. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_pricing_overrides ENABLE ROW LEVEL SECURITY;

-- Disputes policies
CREATE POLICY "Users can view disputes in their organization"
ON public.disputes FOR SELECT
USING (organization_id = current_user_org_id());

CREATE POLICY "Users can create disputes in their organization"
ON public.disputes FOR INSERT
WITH CHECK (organization_id = current_user_org_id());

CREATE POLICY "Users can update disputes in their organization"
ON public.disputes FOR UPDATE
USING (organization_id = current_user_org_id());

-- Dispute messages policies
CREATE POLICY "Users can view dispute messages"
ON public.dispute_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM disputes d
  WHERE d.id = dispute_messages.dispute_id
  AND d.organization_id = current_user_org_id()
));

CREATE POLICY "Users can create dispute messages"
ON public.dispute_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM disputes d
  WHERE d.id = dispute_messages.dispute_id
  AND d.organization_id = current_user_org_id()
));

-- Pricing rules policies
CREATE POLICY "Users can view pricing rules in their organization"
ON public.pricing_rules FOR SELECT
USING (organization_id = current_user_org_id());

CREATE POLICY "Users can manage pricing rules in their organization"
ON public.pricing_rules FOR ALL
USING (organization_id = current_user_org_id());

-- Clinic pricing overrides policies
CREATE POLICY "Users can view clinic pricing in their organization"
ON public.clinic_pricing_overrides FOR SELECT
USING (organization_id = current_user_org_id());

CREATE POLICY "Users can manage clinic pricing in their organization"
ON public.clinic_pricing_overrides FOR ALL
USING (organization_id = current_user_org_id());

-- ============================================================================
-- 7. AUDIT LOG TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    action VARCHAR(50),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs in their organization"
ON public.audit_logs FOR SELECT
USING (organization_id = current_user_org_id());

CREATE POLICY "System can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (organization_id = current_user_org_id());

-- ============================================================================
-- VERIFICATION QUERY - Run this after applying all migrations
-- ============================================================================
-- SELECT 
--     'invoice_items patient fields' as feature,
--     EXISTS(SELECT 1 FROM information_schema.columns 
--            WHERE table_name = 'invoice_items' 
--            AND column_name = 'patient_first_name') as exists
-- UNION ALL
-- SELECT 
--     'parent_client_id field' as feature,
--     EXISTS(SELECT 1 FROM information_schema.columns 
--            WHERE table_name = 'clients' 
--            AND column_name = 'parent_client_id') as exists
-- UNION ALL
-- SELECT 
--     'disputes table' as feature,
--     EXISTS(SELECT 1 FROM information_schema.tables 
--            WHERE table_name = 'disputes') as exists
-- UNION ALL
-- SELECT 
--     'pricing_rules table' as feature,
--     EXISTS(SELECT 1 FROM information_schema.tables 
--            WHERE table_name = 'pricing_rules') as exists
-- UNION ALL
-- SELECT 
--     'get_parent_clients_with_stats function' as feature,
--     EXISTS(SELECT 1 FROM information_schema.routines 
--            WHERE routine_name = 'get_parent_clients_with_stats') as exists;