-- Report functions to improve performance by moving calculations server-side
-- This allows complex report calculations to be done in the database
-- rather than fetching all data and calculating client-side

-- Drop the function first if it exists (to allow changing return type)
DROP FUNCTION IF EXISTS public.get_aging_report(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- Function to get aging buckets for invoices
CREATE OR REPLACE FUNCTION public.get_aging_report(
  from_date TIMESTAMP WITH TIME ZONE,
  to_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  label TEXT,
  value NUMERIC,
  count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH aging_buckets AS (
    SELECT
      CASE
        WHEN CURRENT_DATE - date_due <= 0 THEN 'Current'
        WHEN CURRENT_DATE - date_due BETWEEN 1 AND 30 THEN '1-30 Days'
        WHEN CURRENT_DATE - date_due BETWEEN 31 AND 60 THEN '31-60 Days'
        WHEN CURRENT_DATE - date_due BETWEEN 61 AND 90 THEN '61-90 Days'
        ELSE '90+ Days'
      END AS label,
      SUM(balance) AS value,
      COUNT(*)::INTEGER AS count -- Cast COUNT to INTEGER
    FROM invoices
    WHERE 
      date_created BETWEEN from_date AND to_date
      AND status NOT IN ('cancelled', 'write_off')
      AND balance > 0
    GROUP BY label
    ORDER BY 
      CASE label
        WHEN 'Current' THEN 1
        WHEN '1-30 Days' THEN 2
        WHEN '31-60 Days' THEN 3
        WHEN '61-90 Days' THEN 4
        WHEN '90+ Days' THEN 5
        ELSE 6
      END
  )
  -- Return all buckets, even empty ones
  SELECT
    bucket.label,
    COALESCE(aging.value, 0)::NUMERIC(10,2) AS value,
    COALESCE(aging.count, 0) AS count
  FROM (
    VALUES
      ('Current'),
      ('1-30 Days'),
      ('31-60 Days'),
      ('61-90 Days'),
      ('90+ Days')
  ) AS bucket(label)
  LEFT JOIN aging_buckets aging ON bucket.label = aging.label
  ORDER BY 
    CASE bucket.label
      WHEN 'Current' THEN 1
      WHEN '1-30 Days' THEN 2
      WHEN '31-60 Days' THEN 3
      WHEN '61-90 Days' THEN 4
      WHEN '90+ Days' THEN 5
      ELSE 6
    END;
END;
$$ LANGUAGE plpgsql;

-- Drop the function first if it exists
DROP FUNCTION IF EXISTS public.get_status_distribution(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- Function to get invoice status distribution
CREATE OR REPLACE FUNCTION public.get_status_distribution(
  from_date TIMESTAMP WITH TIME ZONE,
  to_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  name TEXT,
  value INTEGER,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH status_counts AS (
    SELECT
      status,
      COUNT(*) AS count,
      SUM(total) AS total_value
    FROM invoices
    WHERE date_created BETWEEN from_date AND to_date
    GROUP BY status
  ),
  total_count AS (
    SELECT COALESCE(SUM(count), 0) AS count
    FROM status_counts
  )
  SELECT
    INITCAP(sc.status::TEXT) AS name, -- Cast status to TEXT for INITCAP
    CASE 
      WHEN tc.count > 0 THEN ROUND((sc.count::NUMERIC / tc.count) * 100)::INTEGER
      ELSE 0
    END AS value,
    CASE sc.status
      WHEN 'paid' THEN '#10B981'
      WHEN 'partial' THEN '#F59E0B'
      WHEN 'sent' THEN '#3B82F6'
      WHEN 'draft' THEN '#6B7280'
      WHEN 'dispute' THEN '#EF4444'
      WHEN 'write_off' THEN '#8B5CF6'
      WHEN 'exhausted' THEN '#EC4899'
      WHEN 'cancelled' THEN '#9CA3AF'
      ELSE '#6B7280'
    END AS color
  FROM status_counts sc, total_count tc
  ORDER BY value DESC;
END;
$$ LANGUAGE plpgsql;

-- Drop the function first if it exists
DROP FUNCTION IF EXISTS public.get_client_performance(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- Function to get client performance data
CREATE OR REPLACE FUNCTION public.get_client_performance(
  from_date TIMESTAMP WITH TIME ZONE,
  to_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  clinic TEXT,
  invoice_count INTEGER,
  total_value NUMERIC,
  dispute_rate INTEGER,
  avg_days_to_payment INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH invoice_data AS (
    SELECT
      c.id AS client_id,
      c.name AS client_name,
      cl.id AS clinic_id,
      cl.name AS clinic_name,
      COUNT(i.id)::INTEGER AS calculated_invoice_count, -- Alias calculated count
      SUM(i.total) AS total_value,
      -- Calculate dispute rate
      COALESCE(
        ROUND(
          (COUNT(DISTINCT CASE WHEN it.is_disputed THEN it.id END)::NUMERIC / 
           NULLIF(COUNT(DISTINCT it.id), 0)) * 100
        ), 0
      ) AS dispute_rate,
      -- Estimate average days to payment (assuming payment is 14 days after creation for paid invoices)
      COALESCE(
        ROUND(
          AVG(
            CASE 
              WHEN i.status IN ('paid', 'partial') AND i.amount_paid > 0 
              THEN 14 -- Estimated payment days
            END
          )
        ), 0
      ) AS avg_days_to_payment
    FROM clients c
    JOIN clinics cl ON cl.client_id = c.id
    JOIN invoices i ON i.clinic_id = cl.id
    LEFT JOIN invoice_items it ON it.invoice_id = i.id
    WHERE i.date_created BETWEEN from_date AND to_date
    GROUP BY c.id, c.name, cl.id, cl.name
  )
  SELECT
    client_id::TEXT,
    client_name,
    clinic_name,
    calculated_invoice_count AS invoice_count, -- Use alias in final SELECT
    ROUND(total_value::NUMERIC, 2) AS total_value,
    dispute_rate,
    avg_days_to_payment
  FROM invoice_data
  WHERE invoice_count > 0
  ORDER BY total_value DESC;
END;
$$ LANGUAGE plpgsql;

-- Drop the function first if it exists
DROP FUNCTION IF EXISTS public.get_top_cpt_codes(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER);

-- Function to get top CPT codes by usage
CREATE OR REPLACE FUNCTION public.get_top_cpt_codes(
  from_date TIMESTAMP WITH TIME ZONE,
  to_date TIMESTAMP WITH TIME ZONE,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  code TEXT,
  description TEXT,
  count INTEGER,
  value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.code::TEXT, -- Cast code to TEXT
    cc.description,
    COUNT(ii.id)::INTEGER AS count, -- Cast COUNT to INTEGER
    ROUND(SUM(ii.total)::NUMERIC, 2) AS value
  FROM invoice_items ii
  JOIN cpt_codes cc ON cc.id = ii.cpt_code_id
  JOIN invoices i ON i.id = ii.invoice_id
  WHERE i.date_created BETWEEN from_date AND to_date
  GROUP BY cc.code, cc.description
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Drop the function first if it exists
DROP FUNCTION IF EXISTS public.get_monthly_trends(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- Function to get monthly trends
CREATE OR REPLACE FUNCTION public.get_monthly_trends(
  from_date TIMESTAMP WITH TIME ZONE,
  to_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  month TEXT,
  invoiced NUMERIC,
  collected NUMERIC
) AS $$
DECLARE
  curr_date DATE := date_trunc('month', from_date)::DATE;
  end_date DATE := date_trunc('month', to_date)::DATE;
BEGIN
  -- Create a CTE for all months in the range
  CREATE TEMP TABLE IF NOT EXISTS months_range (
    month_date DATE,
    month_name TEXT
  ) ON COMMIT DROP;
  
  TRUNCATE months_range;
  
  -- Generate all months in range
  WHILE curr_date <= end_date LOOP
    INSERT INTO months_range (month_date, month_name)
    VALUES (curr_date, to_char(curr_date, 'Mon'));
    
    curr_date := curr_date + interval '1 month';
  END LOOP;
  
  -- Return data for all months
  RETURN QUERY
  SELECT
    mr.month_name,
    COALESCE(ROUND(SUM(i.total)::NUMERIC, 2), 0) AS invoiced,
    COALESCE(ROUND(SUM(p.amount)::NUMERIC, 2), 0) AS collected
  FROM months_range mr
  LEFT JOIN invoices i ON 
    date_trunc('month', i.date_created)::DATE = mr.month_date
  LEFT JOIN payments p ON 
    date_trunc('month', p.payment_date)::DATE = mr.month_date
  GROUP BY mr.month_date, mr.month_name
  ORDER BY mr.month_date;
END;
$$ LANGUAGE plpgsql;

-- Drop the function first if it exists
DROP FUNCTION IF EXISTS public.get_complete_report_data(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- Create an RPC function to get all report data in one call
CREATE OR REPLACE FUNCTION public.get_complete_report_data(
  from_date TIMESTAMP WITH TIME ZONE,
  to_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
  aging_data JSON;
  status_data JSON;
  performance_data JSON;
  result JSON;
BEGIN
  -- Get aging data
  SELECT json_agg(row_to_json(t)) INTO aging_data
  FROM public.get_aging_report(from_date, to_date) t;
  
  -- Get status data
  SELECT json_agg(row_to_json(t)) INTO status_data
  FROM public.get_status_distribution(from_date, to_date) t;
  
  -- Get client performance data
  SELECT json_agg(row_to_json(t)) INTO performance_data
  FROM public.get_client_performance(from_date, to_date) t;
  
  -- Combine into a single JSON response
  SELECT json_build_object(
    'agingBuckets', COALESCE(aging_data, '[]'::JSON),
    'statusDistribution', COALESCE(status_data, '[]'::JSON),
    'clientPerformance', COALESCE(performance_data, '[]'::JSON)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
