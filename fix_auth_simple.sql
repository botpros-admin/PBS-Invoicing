-- ============================================================================
-- SIMPLE AUTH FIX - Create Demo Users Correctly
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the authentication issue
-- ============================================================================

-- First, clean up any broken users
DELETE FROM auth.users 
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com'
);

-- Now create them properly with minimal required fields
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES 
    -- PBS Administrator
    (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'admin@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"role": "pbs_admin", "full_name": "PBS Administrator"}',
        NOW(),
        NOW()
    ),
    -- Billing Specialist
    (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'billing@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"role": "pbs_staff", "full_name": "Jane Smith", "department": "Billing"}',
        NOW(),
        NOW()
    ),
    -- Claims Processor
    (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'claims@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"role": "pbs_staff", "full_name": "Robert Johnson", "department": "Claims"}',
        NOW(),
        NOW()
    );

-- Verify they were created
SELECT 
    email,
    raw_user_meta_data->>'full_name' as name,
    raw_user_meta_data->>'role' as role,
    email_confirmed_at IS NOT NULL as confirmed
FROM auth.users
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com'
)
ORDER BY email;

-- ============================================================================
-- RESULT: You should see 3 users created
-- 
-- Login credentials:
-- admin@pbsmedical.com / TempPass123!
-- billing@pbsmedical.com / TempPass123!
-- claims@pbsmedical.com / TempPass123!
-- ============================================================================