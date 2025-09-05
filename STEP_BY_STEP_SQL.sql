-- ============================================================================
-- STEP 1: ADD PATIENT FIELDS TO INVOICE_ITEMS
-- Run this first and check if it works
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

-- Verify Step 1
SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'invoice_items' 
           AND column_name = 'patient_first_name') as patient_fields_added;

-- ============================================================================
-- STEP 2: CREATE DISPUTE TABLES (WITHOUT FOREIGN KEYS FIRST)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    invoice_id UUID,
    invoice_item_id UUID,
    client_id UUID,
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
    created_by UUID,
    assigned_to UUID,
    metadata JSONB
);

-- Now add foreign keys separately (easier to debug)
ALTER TABLE public.disputes 
  ADD CONSTRAINT fk_disputes_organization 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
  ON DELETE CASCADE;

ALTER TABLE public.disputes 
  ADD CONSTRAINT fk_disputes_invoice 
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
  ON DELETE SET NULL;

ALTER TABLE public.disputes 
  ADD CONSTRAINT fk_disputes_invoice_item 
  FOREIGN KEY (invoice_item_id) REFERENCES public.invoice_items(id)
  ON DELETE SET NULL;

ALTER TABLE public.disputes 
  ADD CONSTRAINT fk_disputes_client 
  FOREIGN KEY (client_id) REFERENCES public.clients(id)
  ON DELETE SET NULL;

ALTER TABLE public.disputes 
  ADD CONSTRAINT fk_disputes_created_by 
  FOREIGN KEY (created_by) REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE public.disputes 
  ADD CONSTRAINT fk_disputes_assigned_to 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Create dispute messages table
CREATE TABLE IF NOT EXISTS public.dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    attachments TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: CREATE PRICING TABLES
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

-- ============================================================================
-- STEP 4: CREATE AUDIT LOG TABLE
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

-- ============================================================================
-- STEP 5: CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_invoice_items_accession ON public.invoice_items(accession_number);
CREATE INDEX IF NOT EXISTS idx_disputes_org ON disputes(organization_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_client ON disputes(client_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_org_cpt ON pricing_rules(organization_id, cpt_code);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_default ON pricing_rules(is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_clinic_pricing_clinic_cpt ON clinic_pricing_overrides(clinic_id, cpt_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_clients_parent_id ON public.clients(parent_id);

-- ============================================================================
-- STEP 6: CREATE PARENT ACCOUNT FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_parent_clients_with_stats(
  org_id UUID,
  page_number INT DEFAULT 1,
  page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  parent_id UUID,
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
      p.parent_id,
      COUNT(DISTINCT c.id) as child_count,
      COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('sent', 'overdue')), 0) as total_outstanding,
      COUNT(DISTINCT i.id) as total_invoices,
      AVG(
        CASE 
          WHEN i.paid_at IS NOT NULL 
          THEN EXTRACT(DAY FROM i.paid_at - i.invoice_date)
          ELSE NULL
        END
      ) as avg_payment_days,
      MAX(GREATEST(p.updated_at, c.updated_at, i.updated_at)) as last_activity,
      jsonb_build_object(
        'address_line1', p.address_line1,
        'address_line2', p.address_line2,
        'city', p.city,
        'state', p.state,
        'zip_code', p.zip_code
      ) as address,
      jsonb_build_object(
        'phone', p.phone,
        'email', p.email,
        'contact_person', p.contact_person
      ) as contact_info,
      NULL::JSONB as metadata
    FROM clients p
    LEFT JOIN clients c ON c.parent_id = p.id AND c.organization_id = org_id
    LEFT JOIN invoices i ON (i.client_id = p.id OR i.client_id = c.id) 
      AND i.organization_id = org_id
    WHERE p.organization_id = org_id
      AND p.parent_id IS NULL
    GROUP BY p.id, p.name, p.code, p.parent_id, p.address_line1, p.address_line2, 
             p.city, p.state, p.zip_code, p.phone, p.email, p.contact_person
  )
  SELECT * FROM parent_stats
  ORDER BY child_count DESC, name ASC
  LIMIT page_size
  OFFSET (page_number - 1) * page_size;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_child_locations(
  parent_id_param UUID,
  org_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
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
    CASE WHEN c.is_active THEN 'active'::VARCHAR ELSE 'inactive'::VARCHAR END as status,
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('sent', 'overdue')), 0) as total_outstanding,
    MAX(i.invoice_date) as last_invoice_date,
    COUNT(DISTINCT i.id) as invoice_count,
    jsonb_build_object(
      'address_line1', c.address_line1,
      'address_line2', c.address_line2,
      'city', c.city,
      'state', c.state,
      'zip_code', c.zip_code
    ) as address,
    jsonb_build_object(
      'phone', c.phone,
      'email', c.email,
      'contact_person', c.contact_person
    ) as contact_info
  FROM clients c
  LEFT JOIN invoices i ON i.client_id = c.id AND i.organization_id = org_id
  WHERE c.parent_id = parent_id_param
    AND c.organization_id = org_id
  GROUP BY c.id, c.name, c.code, c.is_active, c.address_line1, c.address_line2, 
           c.city, c.state, c.zip_code, c.phone, c.email, c.contact_person
  ORDER BY c.name ASC;
END;
$$;

-- ============================================================================
-- STEP 7: GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_parent_clients_with_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_child_locations TO authenticated;

-- ============================================================================
-- STEP 8: ENABLE RLS
-- ============================================================================
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_pricing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
SELECT 
    'Patient fields added' as task,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'invoice_items' 
           AND column_name = 'patient_first_name') as completed
UNION ALL
SELECT 
    'Disputes table created' as task,
    EXISTS(SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'disputes') as completed
UNION ALL
SELECT 
    'Pricing rules table created' as task,
    EXISTS(SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'pricing_rules') as completed
UNION ALL
SELECT 
    'Parent functions created' as task,
    EXISTS(SELECT 1 FROM information_schema.routines 
           WHERE routine_name = 'get_parent_clients_with_stats') as completed;