-- ============================================================================
-- PBS INVOICING SYSTEM - SIMPLE DEMO USER SETUP
-- ============================================================================
-- This script creates demo users matching your login form
-- WITHOUT complex table dependencies
-- 
-- DEFAULT PASSWORD FOR ALL DEMO USERS: TempPass123!
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CREATE DEMO USERS IN AUTH.USERS TABLE
-- ============================================================================

-- PBS Staff 1: Administrator (from login form)
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    'admin@pbsmedical.com',
    crypt('TempPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"PBS Administrator","role":"pbs_admin","department":"Administration"}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('TempPass123!', gen_salt('bf')),
    raw_user_meta_data = '{"full_name":"PBS Administrator","role":"pbs_admin","department":"Administration"}';

-- PBS Staff 2: Billing Specialist (from login form)
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    'billing@pbsmedical.com',
    crypt('TempPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jane Smith","role":"pbs_staff","department":"Billing"}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('TempPass123!', gen_salt('bf')),
    raw_user_meta_data = '{"full_name":"Jane Smith","role":"pbs_staff","department":"Billing"}';

-- PBS Staff 3: Claims Processor (from login form)
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    'claims@pbsmedical.com',
    crypt('TempPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Robert Johnson","role":"pbs_staff","department":"Claims"}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('TempPass123!', gen_salt('bf')),
    raw_user_meta_data = '{"full_name":"Robert Johnson","role":"pbs_staff","department":"Claims"}';

-- Super Admin: System Administrator
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    'superadmin@pbsmedical.com',
    crypt('TempPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"System Administrator","role":"super_admin"}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('TempPass123!', gen_salt('bf')),
    raw_user_meta_data = '{"full_name":"System Administrator","role":"super_admin"}';

-- Client Portal User 1
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    'client@hospitalnetwork.com',
    crypt('TempPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Patricia Anderson","role":"client","organization":"Hospital Network Inc."}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('TempPass123!', gen_salt('bf')),
    raw_user_meta_data = '{"full_name":"Patricia Anderson","role":"client","organization":"Hospital Network Inc."}';

-- Client Portal User 2
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    'client@cityclinic.com',
    crypt('TempPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"David Martinez","role":"client","organization":"City Clinic"}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('TempPass123!', gen_salt('bf')),
    raw_user_meta_data = '{"full_name":"David Martinez","role":"client","organization":"City Clinic"}';

-- Lab Admin User
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    'labadmin@regionalmedlabs.com',
    crypt('TempPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dr. Sarah Johnson","role":"lab_admin","laboratory":"Regional Medical Labs"}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('TempPass123!', gen_salt('bf')),
    raw_user_meta_data = '{"full_name":"Dr. Sarah Johnson","role":"lab_admin","laboratory":"Regional Medical Labs"}';

-- Lab Staff User
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    'labstaff@regionalmedlabs.com',
    crypt('TempPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Mary Williams","role":"lab_staff","laboratory":"Regional Medical Labs"}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('TempPass123!', gen_salt('bf')),
    raw_user_meta_data = '{"full_name":"Mary Williams","role":"lab_staff","laboratory":"Regional Medical Labs"}';

-- Test User
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    'test@pbsmedical.com',
    crypt('TempPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test User","role":"client","test_account":true}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('TempPass123!', gen_salt('bf')),
    raw_user_meta_data = '{"full_name":"Test User","role":"client","test_account":true}';

-- ============================================================================
-- VERIFY USER CREATION
-- ============================================================================

SELECT 
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'department' as department,
    raw_user_meta_data->>'organization' as organization,
    raw_user_meta_data->>'laboratory' as laboratory,
    email_confirmed_at,
    created_at::date as created_date
FROM auth.users
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com',
    'superadmin@pbsmedical.com',
    'client@hospitalnetwork.com',
    'client@cityclinic.com',
    'labadmin@regionalmedlabs.com',
    'labstaff@regionalmedlabs.com',
    'test@pbsmedical.com'
)
ORDER BY 
    CASE raw_user_meta_data->>'role'
        WHEN 'super_admin' THEN 1
        WHEN 'pbs_admin' THEN 2
        WHEN 'pbs_staff' THEN 3
        WHEN 'lab_admin' THEN 4
        WHEN 'lab_staff' THEN 5
        WHEN 'client' THEN 6
        ELSE 7
    END,
    email;

-- ============================================================================
-- SUMMARY OF CREATED DEMO USERS
-- ============================================================================
-- 
-- ALL USERS USE PASSWORD: TempPass123!
-- 
-- PBS STAFF (Matching your login form):
-- ✓ admin@pbsmedical.com (PBS Administrator)
-- ✓ billing@pbsmedical.com (Billing Specialist)
-- ✓ claims@pbsmedical.com (Claims Processor)
-- 
-- SUPER ADMIN:
-- ✓ superadmin@pbsmedical.com (System Administrator)
-- 
-- CLIENT PORTAL USERS:
-- ✓ client@hospitalnetwork.com (Hospital Network)
-- ✓ client@cityclinic.com (City Clinic)
-- 
-- LABORATORY USERS:
-- ✓ labadmin@regionalmedlabs.com (Lab Administrator)
-- ✓ labstaff@regionalmedlabs.com (Lab Staff)
-- 
-- TEST ACCOUNT:
-- ✓ test@pbsmedical.com (Test User)
-- 
-- Note: This script only creates users in auth.users table.
-- It does NOT create entries in billing_companies, laboratories, or other tables.
-- The role information is stored in the user metadata (raw_user_meta_data).
-- 
-- If users already exist, the script will UPDATE their password and metadata.
-- ============================================================================