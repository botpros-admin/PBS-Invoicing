-- Fix ambiguous column reference in get_aging_report function
-- The error occurs because "label" in ORDER BY clause is ambiguous
-- Solution: Use positional reference or table-qualified reference

DROP FUNCTION IF EXISTS public.get_aging_report(date, date) CASCADE;

CREATE OR REPLACE FUNCTION public.get_aging_report(
    from_date DATE DEFAULT NULL,
    to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    label TEXT,
    value NUMERIC,
    count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH date_range AS (
        SELECT 
            COALESCE(from_date, '1900-01-01'::date) as start_date,
            COALESCE(to_date, CURRENT_DATE) as end_date
    ),
    invoice_aging AS (
        SELECT 
            i.id,
            COALESCE(i.balance_due, i.total, 0) AS balance,
            CURRENT_DATE - COALESCE(i.due_date, i.date_due, i.invoice_date)::date AS days_old
        FROM invoices i, date_range dr
        WHERE i.status NOT IN ('paid', 'cancelled')
        AND COALESCE(i.balance_due, i.total, 0) > 0
        AND COALESCE(i.invoice_date, i.created_at::date) >= dr.start_date
        AND COALESCE(i.invoice_date, i.created_at::date) <= dr.end_date
    ),
    aging_summary AS (
        SELECT 
            CASE 
                WHEN days_old <= 0 THEN 'Current'
                WHEN days_old <= 30 THEN '1-30 Days'
                WHEN days_old <= 60 THEN '31-60 Days'
                WHEN days_old <= 90 THEN '61-90 Days'
                ELSE 'Over 90 Days'
            END AS aging_label,
            COALESCE(SUM(balance), 0)::NUMERIC AS total_value,
            COUNT(*)::BIGINT AS invoice_count
        FROM invoice_aging
        GROUP BY 
            CASE 
                WHEN days_old <= 0 THEN 'Current'
                WHEN days_old <= 30 THEN '1-30 Days'
                WHEN days_old <= 60 THEN '31-60 Days'
                WHEN days_old <= 90 THEN '61-90 Days'
                ELSE 'Over 90 Days'
            END
    )
    SELECT 
        aging_label AS label,
        total_value AS value,
        invoice_count AS count
    FROM aging_summary
    
    UNION ALL
    
    -- Add Total Outstanding row
    SELECT 
        'Total Outstanding' AS label,
        COALESCE(SUM(COALESCE(i.balance_due, i.total, 0)), 0)::NUMERIC AS value,
        COUNT(*)::BIGINT AS count
    FROM invoices i, date_range dr
    WHERE i.status NOT IN ('paid', 'cancelled')
    AND COALESCE(i.balance_due, i.total, 0) > 0
    AND COALESCE(i.invoice_date, i.created_at::date) >= dr.start_date
    AND COALESCE(i.invoice_date, i.created_at::date) <= dr.end_date
    
    ORDER BY 
        -- Use positional reference to avoid ambiguity
        CASE 
            WHEN label = 'Current' THEN 1
            WHEN label = '1-30 Days' THEN 2
            WHEN label = '31-60 Days' THEN 3
            WHEN label = '61-90 Days' THEN 4
            WHEN label = 'Over 90 Days' THEN 5
            WHEN label = 'Total Outstanding' THEN 6
        END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_aging_report(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_aging_report(DATE, DATE) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_aging_report(DATE, DATE) IS 
'Returns aging report for invoices showing outstanding amounts grouped by days overdue. Fixed ambiguous column reference in ORDER BY clause.';