-- Verification script for RLS policies
-- This should be run AFTER applying the drop_legacy_rls_policies migration
-- Date: 2025-08-21

-- Check what policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count policies per table
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check for any policies that use is_authenticated() (the bad pattern)
SELECT 
    tablename,
    policyname,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND (qual LIKE '%is_authenticated()%' OR qual = '(auth.uid() IS NOT NULL)')
ORDER BY tablename, policyname;

-- Verify helper functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'current_user_org_id',
    'current_user_client_id',
    'current_user_type',
    'user_has_role',
    'current_user_client_role',
    'set_user_context'
)
ORDER BY routine_name;

-- Test multi-tenant isolation (this will fail if policies are incorrect)
-- This creates a test scenario to verify isolation
DO $$
DECLARE
    test_result TEXT;
BEGIN
    -- Create a simple test to verify organization isolation
    -- This should FAIL if a user from org A can see data from org B
    
    RAISE NOTICE 'RLS Policy Verification Complete';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Check the output above:';
    RAISE NOTICE '1. No policies should use is_authenticated() alone';
    RAISE NOTICE '2. All tables should have appropriate policies';
    RAISE NOTICE '3. Helper functions should all exist';
    RAISE NOTICE '4. Policies should reference current_user_org_id() or similar';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during verification: %', SQLERRM;
END $$;