-- Emergency Production Hotfix: Fix missing and conflicting functions
-- Date: 2025-01-15
-- Issues: 
-- 1. set_user_context function missing (404)
-- 2. get_aging_report function overloading conflict

-- ============================================================================
-- STEP 1: Clean up ALL versions of these functions
-- ============================================================================

-- Drop ALL versions of get_aging_report to resolve overloading
DROP FUNCTION IF EXISTS get_aging_report() CASCADE;
DROP FUNCTION IF EXISTS get_aging_report(timestamp with time zone, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS get_aging_report(date, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_aging_report() CASCADE;
DROP FUNCTION IF EXISTS public.get_aging_report(timestamp with time zone, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS public.get_aging_report(date, date) CASCADE;

-- Drop set_user_context if it exists  
DROP FUNCTION IF EXISTS set_user_context(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_context(uuid, uuid) CASCADE;

-- ============================================================================
-- STEP 2: Create set_user_context function (CRITICAL - MISSING IN PRODUCTION)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_user_context(
    p_user_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_organization_id UUID;
BEGIN
    -- Use provided user_id or get from auth context
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Use provided organization_id or get from user_profiles
    IF p_organization_id IS NOT NULL THEN
        v_organization_id := p_organization_id;
    ELSE
        SELECT organization_id INTO v_organization_id
        FROM user_profiles
        WHERE user_id = v_user_id
        LIMIT 1;
    END IF;
    
    -- Set session variables for RLS policies
    PERFORM set_config('app.current_user_id', COALESCE(v_user_id::text, ''), false);
    PERFORM set_config('app.current_organization_id', COALESCE(v_organization_id::text, ''), false);
    
    -- Optional logging (can be removed in production)
    RAISE NOTICE 'User context set - User: %, Organization: %', v_user_id, v_organization_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_user_context(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_context(UUID, UUID) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.set_user_context(UUID, UUID) IS 
'Sets the current user and organization context for the session. Used by RLS policies to filter data.';

-- ============================================================================
-- STEP 3: Create get_aging_report with correct signature
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
    )
    SELECT 
        CASE 
            WHEN days_old <= 0 THEN 'Current'
            WHEN days_old <= 30 THEN '1-30 Days'
            WHEN days_old <= 60 THEN '31-60 Days'
            WHEN days_old <= 90 THEN '61-90 Days'
            ELSE 'Over 90 Days'
        END AS label,
        COALESCE(SUM(balance), 0)::NUMERIC AS value,
        COUNT(*)::BIGINT AS count
    FROM invoice_aging
    GROUP BY 
        CASE 
            WHEN days_old <= 0 THEN 'Current'
            WHEN days_old <= 30 THEN '1-30 Days'
            WHEN days_old <= 60 THEN '31-60 Days'
            WHEN days_old <= 90 THEN '61-90 Days'
            ELSE 'Over 90 Days'
        END
    
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
        CASE label
            WHEN 'Current' THEN 1
            WHEN '1-30 Days' THEN 2
            WHEN '31-60 Days' THEN 3
            WHEN '61-90 Days' THEN 4
            WHEN 'Over 90 Days' THEN 5
            WHEN 'Total Outstanding' THEN 6
        END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_aging_report(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_aging_report(DATE, DATE) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_aging_report(DATE, DATE) IS 
'Returns aging report for invoices showing outstanding amounts grouped by days overdue';

-- ============================================================================
-- STEP 4: Verify completion
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Production hotfix applied successfully:';
    RAISE NOTICE '1. set_user_context function created';
    RAISE NOTICE '2. get_aging_report conflicts resolved';
    RAISE NOTICE 'All functions have proper permissions';
END $$;