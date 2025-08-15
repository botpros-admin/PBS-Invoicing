-- Fix ALL Report Functions Comprehensive Migration
-- This migration drops and recreates all problematic functions with correct syntax

-- ============================================================================
-- STEP 1: DROP ALL EXISTING PROBLEMATIC FUNCTIONS
-- ============================================================================

-- Drop all versions of get_aging_report
DROP FUNCTION IF EXISTS public.get_aging_report() CASCADE;
DROP FUNCTION IF EXISTS public.get_aging_report(date, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_aging_report(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_aging_report(uuid, date, date) CASCADE;

-- Drop all versions of get_client_performance
DROP FUNCTION IF EXISTS public.get_client_performance() CASCADE;
DROP FUNCTION IF EXISTS public.get_client_performance(date, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_client_performance(uuid) CASCADE;

-- Drop all versions of get_top_cpt_codes
DROP FUNCTION IF EXISTS public.get_top_cpt_codes() CASCADE;
DROP FUNCTION IF EXISTS public.get_top_cpt_codes(date, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_cpt_codes(uuid) CASCADE;

-- ============================================================================
-- STEP 2: CREATE get_aging_report with FIXED column references
-- ============================================================================

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
DECLARE
    aging_label_text TEXT;
    aging_value NUMERIC;
    aging_count BIGINT;
BEGIN
    -- Use temporary table to avoid ambiguity
    CREATE TEMP TABLE IF NOT EXISTS aging_results (
        label_text TEXT,
        value_amount NUMERIC,
        count_number BIGINT
    ) ON COMMIT DROP;
    
    -- Clear any existing data
    TRUNCATE aging_results;
    
    -- Insert Current invoices
    INSERT INTO aging_results
    SELECT 
        'Current' AS label_text,
        COALESCE(SUM(COALESCE(i.balance_due, i.total, 0)), 0) AS value_amount,
        COUNT(*) AS count_number
    FROM invoices i
    WHERE i.status NOT IN ('paid', 'cancelled')
    AND COALESCE(i.balance_due, i.total, 0) > 0
    AND (from_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) >= from_date)
    AND (to_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) <= to_date)
    AND CURRENT_DATE - COALESCE(i.due_date, i.date_due, i.invoice_date)::date <= 0;
    
    -- Insert 1-30 Days invoices
    INSERT INTO aging_results
    SELECT 
        '1-30 Days' AS label_text,
        COALESCE(SUM(COALESCE(i.balance_due, i.total, 0)), 0) AS value_amount,
        COUNT(*) AS count_number
    FROM invoices i
    WHERE i.status NOT IN ('paid', 'cancelled')
    AND COALESCE(i.balance_due, i.total, 0) > 0
    AND (from_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) >= from_date)
    AND (to_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) <= to_date)
    AND CURRENT_DATE - COALESCE(i.due_date, i.date_due, i.invoice_date)::date BETWEEN 1 AND 30;
    
    -- Insert 31-60 Days invoices
    INSERT INTO aging_results
    SELECT 
        '31-60 Days' AS label_text,
        COALESCE(SUM(COALESCE(i.balance_due, i.total, 0)), 0) AS value_amount,
        COUNT(*) AS count_number
    FROM invoices i
    WHERE i.status NOT IN ('paid', 'cancelled')
    AND COALESCE(i.balance_due, i.total, 0) > 0
    AND (from_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) >= from_date)
    AND (to_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) <= to_date)
    AND CURRENT_DATE - COALESCE(i.due_date, i.date_due, i.invoice_date)::date BETWEEN 31 AND 60;
    
    -- Insert 61-90 Days invoices
    INSERT INTO aging_results
    SELECT 
        '61-90 Days' AS label_text,
        COALESCE(SUM(COALESCE(i.balance_due, i.total, 0)), 0) AS value_amount,
        COUNT(*) AS count_number
    FROM invoices i
    WHERE i.status NOT IN ('paid', 'cancelled')
    AND COALESCE(i.balance_due, i.total, 0) > 0
    AND (from_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) >= from_date)
    AND (to_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) <= to_date)
    AND CURRENT_DATE - COALESCE(i.due_date, i.date_due, i.invoice_date)::date BETWEEN 61 AND 90;
    
    -- Insert Over 90 Days invoices
    INSERT INTO aging_results
    SELECT 
        'Over 90 Days' AS label_text,
        COALESCE(SUM(COALESCE(i.balance_due, i.total, 0)), 0) AS value_amount,
        COUNT(*) AS count_number
    FROM invoices i
    WHERE i.status NOT IN ('paid', 'cancelled')
    AND COALESCE(i.balance_due, i.total, 0) > 0
    AND (from_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) >= from_date)
    AND (to_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) <= to_date)
    AND CURRENT_DATE - COALESCE(i.due_date, i.date_due, i.invoice_date)::date > 90;
    
    -- Insert Total Outstanding
    INSERT INTO aging_results
    SELECT 
        'Total Outstanding' AS label_text,
        COALESCE(SUM(COALESCE(i.balance_due, i.total, 0)), 0) AS value_amount,
        COUNT(*) AS count_number
    FROM invoices i
    WHERE i.status NOT IN ('paid', 'cancelled')
    AND COALESCE(i.balance_due, i.total, 0) > 0
    AND (from_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) >= from_date)
    AND (to_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) <= to_date);
    
    -- Return results ordered correctly
    RETURN QUERY
    SELECT 
        ar.label_text AS label,
        ar.value_amount AS value,
        ar.count_number AS count
    FROM aging_results ar
    ORDER BY 
        CASE ar.label_text
            WHEN 'Current' THEN 1
            WHEN '1-30 Days' THEN 2
            WHEN '31-60 Days' THEN 3
            WHEN '61-90 Days' THEN 4
            WHEN 'Over 90 Days' THEN 5
            WHEN 'Total Outstanding' THEN 6
        END;
END;
$$;

-- ============================================================================
-- STEP 3: CREATE get_client_performance (simplified without clinic_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_client_performance(
    from_date DATE DEFAULT NULL,
    to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    client_name TEXT,
    invoice_count BIGINT,
    total_billed NUMERIC,
    total_paid NUMERIC,
    outstanding NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name AS client_name,
        COUNT(i.id)::BIGINT AS invoice_count,
        COALESCE(SUM(COALESCE(i.total_amount, i.total, 0)), 0)::NUMERIC AS total_billed,
        COALESCE(SUM(COALESCE(i.paid_amount, 0)), 0)::NUMERIC AS total_paid,
        COALESCE(SUM(COALESCE(i.balance_due, i.total, 0)), 0)::NUMERIC AS outstanding
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    WHERE (from_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) >= from_date)
    AND (to_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) <= to_date)
    GROUP BY c.id, c.name
    ORDER BY total_billed DESC
    LIMIT 20;
END;
$$;

-- ============================================================================
-- STEP 4: CREATE get_top_cpt_codes (simplified)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_top_cpt_codes(
    from_date DATE DEFAULT NULL,
    to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    cpt_code TEXT,
    description TEXT,
    usage_count BIGINT,
    total_amount NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cpt.code AS cpt_code,
        cpt.description AS description,
        COUNT(ii.id)::BIGINT AS usage_count,
        COALESCE(SUM(ii.line_total), 0)::NUMERIC AS total_amount
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    JOIN cpt_codes cpt ON cpt.id = ii.cpt_code_id
    WHERE (from_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) >= from_date)
    AND (to_date IS NULL OR COALESCE(i.invoice_date, i.created_at::date) <= to_date)
    GROUP BY cpt.id, cpt.code, cpt.description
    ORDER BY usage_count DESC
    LIMIT 20;
END;
$$;

-- ============================================================================
-- STEP 5: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.get_aging_report(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_aging_report(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_aging_report(DATE, DATE) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_client_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_performance(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_performance(DATE, DATE) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_top_cpt_codes(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_cpt_codes(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_top_cpt_codes(DATE, DATE) TO service_role;

-- ============================================================================
-- STEP 6: VERIFY DEPLOYMENT
-- ============================================================================

DO $$
BEGIN
    -- Check if functions exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_aging_report') THEN
        RAISE NOTICE 'SUCCESS: get_aging_report function created';
    ELSE
        RAISE EXCEPTION 'FAILED: get_aging_report function not created';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_client_performance') THEN
        RAISE NOTICE 'SUCCESS: get_client_performance function created';
    ELSE
        RAISE EXCEPTION 'FAILED: get_client_performance function not created';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_top_cpt_codes') THEN
        RAISE NOTICE 'SUCCESS: get_top_cpt_codes function created';
    ELSE
        RAISE EXCEPTION 'FAILED: get_top_cpt_codes function not created';
    END IF;
    
    -- Note: set_user_context was already fixed in previous migration
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_user_context') THEN
        RAISE NOTICE 'SUCCESS: set_user_context function exists';
    END IF;
END;
$$;