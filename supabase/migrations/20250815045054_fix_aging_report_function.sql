-- Fix get_aging_report function to accept date parameters and use correct column names
DROP FUNCTION IF EXISTS public.get_aging_report();
DROP FUNCTION IF EXISTS public.get_aging_report(DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_aging_report(
  from_date DATE DEFAULT NULL,
  to_date DATE DEFAULT NULL
)
RETURNS TABLE (
  label TEXT,
  value NUMERIC,
  count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN i.balance_due = 0 OR i.balance_due IS NULL THEN 'Paid'
      WHEN EXTRACT(days FROM (CURRENT_DATE - i.due_date)) <= 0 THEN 'Current'
      WHEN EXTRACT(days FROM (CURRENT_DATE - i.due_date)) <= 30 THEN '1-30 days'
      WHEN EXTRACT(days FROM (CURRENT_DATE - i.due_date)) <= 60 THEN '31-60 days'
      WHEN EXTRACT(days FROM (CURRENT_DATE - i.due_date)) <= 90 THEN '61-90 days'
      ELSE '90+ days'
    END as label,
    COALESCE(SUM(i.balance_due), 0)::NUMERIC as value,
    COUNT(*)::INTEGER as count
  FROM invoices i
  WHERE i.organization_id = COALESCE(
    (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::UUID
  )
  AND (from_date IS NULL OR i.invoice_date >= from_date)
  AND (to_date IS NULL OR i.invoice_date <= to_date)
  GROUP BY label
  ORDER BY 
    CASE label
      WHEN 'Paid' THEN 0
      WHEN 'Current' THEN 1
      WHEN '1-30 days' THEN 2
      WHEN '31-60 days' THEN 3
      WHEN '61-90 days' THEN 4
      WHEN '90+ days' THEN 5
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_aging_report(DATE, DATE) TO authenticated;