-- ============================================================================
-- FINAL AUTH FIX - Complete User Recreation
-- ============================================================================
-- This completely removes and recreates the users to ensure clean setup
-- ============================================================================

-- Step 1: Remove ALL test users completely
DELETE FROM auth.identities WHERE user_id IN (
    SELECT id FROM auth.users WHERE email IN (
        'admin@pbsmedical.com',
        'billing@pbsmedical.com', 
        'claims@pbsmedical.com',
        'superadmin@pbsmedical.com',
        'client@hospitalnetwork.com',
        'client@cityclinic.com',
        'test@pbsmedical.com'
    )
);

DELETE FROM auth.users WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com',
    'superadmin@pbsmedical.com',
    'client@hospitalnetwork.com',
    'client@cityclinic.com',
    'test@pbsmedical.com'
);

-- Step 2: Create clean users with proper structure
DO $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Create admin@pbsmedical.com
    new_user_id := gen_random_uuid();
    
    -- Insert user
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        aud,
        role,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        last_sign_in_at,
        is_super_admin,
        phone,
        phone_confirmed_at
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'admin@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        'authenticated',
        'authenticated',
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('role', 'pbs_admin', 'full_name', 'PBS Administrator'),
        NOW(),
        NOW(),
        '',
        '',
        '',
        '',
        NULL,
        false,
        NULL,
        NULL
    );
    
    -- Create identity for admin
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        new_user_id::text,
        new_user_id,
        jsonb_build_object(
            'sub', new_user_id::text,
            'email', 'admin@pbsmedical.com',
            'email_verified', true,
            'provider', 'email'
        ),
        'email',
        NULL,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Created admin@pbsmedical.com';
    
    -- Create billing@pbsmedical.com
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        aud,
        role,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        last_sign_in_at,
        is_super_admin,
        phone,
        phone_confirmed_at
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'billing@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        'authenticated',
        'authenticated',
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('role', 'pbs_staff', 'full_name', 'Jane Smith', 'department', 'Billing'),
        NOW(),
        NOW(),
        '',
        '',
        '',
        '',
        NULL,
        false,
        NULL,
        NULL
    );
    
    -- Create identity for billing
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        new_user_id::text,
        new_user_id,
        jsonb_build_object(
            'sub', new_user_id::text,
            'email', 'billing@pbsmedical.com',
            'email_verified', true,
            'provider', 'email'
        ),
        'email',
        NULL,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Created billing@pbsmedical.com';
    
    -- Create claims@pbsmedical.com
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        aud,
        role,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        last_sign_in_at,
        is_super_admin,
        phone,
        phone_confirmed_at
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'claims@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        'authenticated',
        'authenticated',
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('role', 'pbs_staff', 'full_name', 'Robert Johnson', 'department', 'Claims'),
        NOW(),
        NOW(),
        '',
        '',
        '',
        '',
        NULL,
        false,
        NULL,
        NULL
    );
    
    -- Create identity for claims
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        new_user_id::text,
        new_user_id,
        jsonb_build_object(
            'sub', new_user_id::text,
            'email', 'claims@pbsmedical.com',
            'email_verified', true,
            'provider', 'email'
        ),
        'email',
        NULL,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Created claims@pbsmedical.com';
    
END $$;

-- Step 3: Verify the users were created properly
SELECT 
    u.id,
    u.email,
    u.encrypted_password IS NOT NULL as has_password,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    u.raw_user_meta_data->>'role' as role,
    u.raw_user_meta_data->>'full_name' as full_name,
    i.provider as identity_provider,
    i.identity_data->>'email_verified' as email_verified
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE u.email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com'
)
ORDER BY u.email;

-- ============================================================================
-- IMPORTANT NOTES:
-- 
-- 1. This script completely removes and recreates the users
-- 2. All users have password: TempPass123!
-- 3. Users have proper identities for email provider
-- 4. If login still fails, check:
--    - Supabase Dashboard > Authentication > Settings
--    - Make sure "Enable Email provider" is ON
--    - Check if there are any custom hooks or triggers interfering
-- ============================================================================