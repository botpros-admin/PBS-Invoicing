-- Fix report functions that have issues

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_client_performance(text, text);
DROP FUNCTION IF EXISTS get_client_performance(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_top_cpt_codes(text, text, integer);
DROP FUNCTION IF EXISTS get_top_cpt_codes(timestamp with time zone, timestamp with time zone, integer);

-- Create get_client_performance_by_range function with clear naming
CREATE OR REPLACE FUNCTION get_client_performance_by_range(
    start_date_text TEXT,
    end_date_text TEXT
)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    clinic TEXT,
    invoice_count INTEGER,
    total_value NUMERIC,
    dispute_rate NUMERIC,
    avg_days_to_payment NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cl.id::TEXT,
        cl.name,
        COALESCE(clinic.name, 'No Clinic') as clinic,
        COUNT(DISTINCT i.id)::INTEGER as invoice_count,
        COALESCE(SUM(i.total), 0) as total_value,
        ROUND(
            CAST(COUNT(DISTINCT CASE WHEN ili.is_disputed THEN i.id END) AS NUMERIC) / 
            NULLIF(COUNT(DISTINCT i.id), 0) * 100, 
            2
        ) as dispute_rate,
        ROUND(
            AVG(
                CASE 
                    WHEN i.status = 'paid' AND i.updated_at > i.created_at 
                    THEN EXTRACT(EPOCH FROM (i.updated_at - i.created_at)) / 86400
                    ELSE NULL
                END
            ), 
            2
        ) as avg_days_to_payment
    FROM clients cl
    LEFT JOIN invoices i ON cl.id = i.client_id
        AND i.date_created >= start_date_text::DATE
        AND i.date_created <= end_date_text::DATE
    LEFT JOIN clinics clinic ON i.clinic_id = clinic.id
    LEFT JOIN invoice_line_items ili ON i.id = ili.invoice_id
    GROUP BY cl.id, cl.name, clinic.name
    HAVING COUNT(DISTINCT i.id) > 0
    ORDER BY total_value DESC;
END;
$$;

-- Create wrapper function that matches the original name for backward compatibility
CREATE OR REPLACE FUNCTION get_client_performance(
    from_date TEXT,
    to_date TEXT
)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    clinic TEXT,
    invoice_count INTEGER,
    total_value NUMERIC,
    dispute_rate NUMERIC,
    avg_days_to_payment NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_client_performance_by_range(from_date, to_date);
END;
$$;

-- Create get_top_cpt_codes function with fixed column reference
CREATE OR REPLACE FUNCTION get_top_cpt_codes(
    from_date TEXT,
    to_date TEXT,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    code TEXT,
    description TEXT,
    count BIGINT,
    value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ii.cpt_code as code,  -- Fixed: was ii.cpt_code_id
        MAX(ii.description) as description,
        COUNT(*)::BIGINT as count,
        SUM(ii.total) as value
    FROM invoice_line_items ii
    INNER JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.date_created >= from_date::DATE
        AND i.date_created <= to_date::DATE
        AND ii.cpt_code IS NOT NULL
    GROUP BY ii.cpt_code
    ORDER BY count DESC, value DESC
    LIMIT limit_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_client_performance_by_range(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_client_performance_by_range(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_performance_by_range(TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION get_client_performance(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_client_performance(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_performance(TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION get_top_cpt_codes(TEXT, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_top_cpt_codes(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_cpt_codes(TEXT, TEXT, INTEGER) TO service_role;