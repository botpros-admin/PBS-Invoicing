-- ============================================================================
-- TEST AUTHENTICATION USERS - VERIFY AND FIX
-- ============================================================================

-- 1. First, check if the users exist
SELECT 
    id,
    email,
    encrypted_password IS NOT NULL as has_password,
    email_confirmed_at IS NOT NULL as email_confirmed,
    raw_user_meta_data->>'role' as role,
    created_at
FROM auth.users
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com'
);

-- 2. Delete existing users (if you need to recreate them)
-- UNCOMMENT THESE LINES IF YOU WANT TO DELETE AND RECREATE
/*
DELETE FROM auth.users 
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com', 
    'claims@pbsmedical.com'
);
*/

-- 3. Create fresh test users using Supabase's auth.users structure
DO $$
DECLARE
    user_id UUID;
BEGIN
    -- Create PBS Admin user
    user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at
    )
    SELECT
        '00000000-0000-0000-0000-000000000000',
        user_id,
        'authenticated',
        'authenticated',
        'admin@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        NULL,
        '',
        NULL,
        '',
        NULL,
        '',
        '',
        NULL,
        NULL,
        '{"provider": "email", "providers": ["email"]}',
        '{"role": "pbs_admin", "full_name": "PBS Administrator"}',
        FALSE,
        NOW(),
        NOW(),
        NULL,
        NULL,
        '',
        0,
        NULL,
        '',
        NULL
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'admin@pbsmedical.com'
    );

    -- Create Billing user
    user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at
    )
    SELECT
        '00000000-0000-0000-0000-000000000000',
        user_id,
        'authenticated',
        'authenticated',
        'billing@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        NULL,
        '',
        NULL,
        '',
        NULL,
        '',
        '',
        NULL,
        NULL,
        '{"provider": "email", "providers": ["email"]}',
        '{"role": "pbs_staff", "full_name": "Jane Smith"}',
        FALSE,
        NOW(),
        NOW(),
        NULL,
        NULL,
        '',
        0,
        NULL,
        '',
        NULL
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'billing@pbsmedical.com'
    );

    -- Create Claims user
    user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at
    )
    SELECT
        '00000000-0000-0000-0000-000000000000',
        user_id,
        'authenticated',
        'authenticated',
        'claims@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        NULL,
        '',
        NULL,
        '',
        NULL,
        '',
        '',
        NULL,
        NULL,
        '{"provider": "email", "providers": ["email"]}',
        '{"role": "pbs_staff", "full_name": "Robert Johnson"}',
        FALSE,
        NOW(),
        NOW(),
        NULL,
        NULL,
        '',
        0,
        NULL,
        '',
        NULL
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'claims@pbsmedical.com'
    );

    RAISE NOTICE 'Users created/verified successfully';
END $$;

-- 4. Verify the users were created with proper structure
SELECT 
    id,
    email,
    encrypted_password IS NOT NULL as has_password,
    email_confirmed_at IS NOT NULL as confirmed,
    raw_user_meta_data->>'role' as user_role,
    raw_user_meta_data->>'full_name' as full_name,
    aud,
    role as auth_role
FROM auth.users
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com'
)
ORDER BY email;

-- 5. Check if set_user_context function exists
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'set_user_context';

-- If no results above, the RPC function might be missing.
-- This could cause issues after login.