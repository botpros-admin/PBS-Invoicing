-- Create function to get parent clients with aggregated statistics
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

-- Create function to get child locations for a parent
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

-- Create function to get aggregated invoice data for parent account
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_status ON invoices(client_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_parent_org ON clients(parent_client_id, organization_id);