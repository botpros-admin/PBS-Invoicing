-- ============================================================================
-- COMPREHENSIVE AUTH VERIFICATION SCRIPT
-- ============================================================================
-- Run this to verify all authentication components are properly configured
-- ============================================================================

-- 1. Check if auth.users exist with proper structure
SELECT 
    '=== AUTH USERS ===' as section,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
    COUNT(CASE WHEN encrypted_password IS NOT NULL THEN 1 END) as users_with_passwords
FROM auth.users
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com',
    'superadmin@pbsmedical.com',
    'client@hospitalnetwork.com',
    'client@cityclinic.com'
);

-- 2. Detailed user information
SELECT 
    '=== USER DETAILS ===' as section,
    u.email,
    u.id,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    u.encrypted_password IS NOT NULL as has_password,
    u.raw_user_meta_data->>'role' as user_role,
    u.raw_user_meta_data->>'full_name' as full_name,
    u.created_at,
    u.last_sign_in_at
FROM auth.users u
WHERE u.email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com',
    'superadmin@pbsmedical.com',
    'client@hospitalnetwork.com',
    'client@cityclinic.com'
)
ORDER BY u.email;

-- 3. Check auth.identities (required for email auth)
SELECT 
    '=== AUTH IDENTITIES ===' as section,
    u.email,
    i.provider,
    i.identity_data->>'email' as identity_email,
    i.identity_data->>'email_verified' as email_verified,
    i.created_at
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE u.email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com',
    'superadmin@pbsmedical.com',
    'client@hospitalnetwork.com',
    'client@cityclinic.com'
)
ORDER BY u.email;

-- 4. Check if users exist in public.users table (application layer)
SELECT 
    '=== PUBLIC USERS TABLE ===' as section,
    COUNT(*) as public_users_count
FROM public.users
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com',
    'superadmin@pbsmedical.com',
    'client@hospitalnetwork.com',
    'client@cityclinic.com'
);

-- 5. Check RLS policies on public.users
SELECT 
    '=== RLS POLICIES ===' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 6. Test password encryption (verify crypt function works)
SELECT 
    '=== PASSWORD ENCRYPTION TEST ===' as section,
    crypt('TempPass123!', gen_salt('bf')) IS NOT NULL as encryption_works;

-- 7. Check auth configuration
SELECT 
    '=== AUTH CONFIGURATION ===' as section,
    key,
    value
FROM auth.config
WHERE key IN ('password_min_length', 'email_domain_whitelist', 'external_email_enabled')
ORDER BY key;

-- 8. Summary and recommendations
SELECT 
    '=== SUMMARY ===' as section,
    CASE 
        WHEN COUNT(*) = 0 THEN 'ERROR: No demo users found!'
        WHEN COUNT(*) < 3 THEN 'WARNING: Some demo users missing'
        ELSE 'SUCCESS: All demo users exist'
    END as status,
    COUNT(*) as users_found,
    STRING_AGG(email, ', ') as emails_found
FROM auth.users
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com'
);

-- ============================================================================
-- EXPECTED RESULTS:
-- 
-- 1. All demo users should exist in auth.users
-- 2. All users should have encrypted_password and email_confirmed_at
-- 3. All users should have corresponding auth.identities records
-- 4. Users might or might not exist in public.users (depends on app logic)
-- 5. RLS policies should be properly configured
-- 
-- IF AUTHENTICATION STILL FAILS:
-- 1. Check Supabase Dashboard > Authentication > Providers > Email is enabled
-- 2. Check if there are any Edge Functions interfering with auth
-- 3. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
-- 4. Check browser console for detailed error messages
-- 5. Try the test_login.html file for isolated testing
-- ============================================================================