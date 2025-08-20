-- ============================================================================
-- PBS INVOICING SYSTEM - DEMO USER SETUP (WORKING VERSION)
-- ============================================================================
-- This script creates demo users matching your login form
-- Works with Supabase auth.users table structure
-- 
-- DEFAULT PASSWORD FOR ALL DEMO USERS: TempPass123!
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CREATE OR UPDATE DEMO USERS
-- ============================================================================

DO $$
DECLARE
    user_exists BOOLEAN;
    user_id UUID;
BEGIN
    -- PBS Staff 1: Administrator (from login form)
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@pbsmedical.com') INTO user_exists;
    
    IF NOT user_exists THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            instance_id,
            aud,
            role
        ) VALUES (
            gen_random_uuid(),
            'admin@pbsmedical.com',
            crypt('TempPass123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"PBS Administrator","role":"pbs_admin","department":"Administration"}',
            NOW(),
            NOW(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated'
        );
        RAISE NOTICE 'Created user: admin@pbsmedical.com';
    ELSE
        UPDATE auth.users 
        SET encrypted_password = crypt('TempPass123!', gen_salt('bf')),
            raw_user_meta_data = '{"full_name":"PBS Administrator","role":"pbs_admin","department":"Administration"}'
        WHERE email = 'admin@pbsmedical.com';
        RAISE NOTICE 'Updated user: admin@pbsmedical.com';
    END IF;

    -- PBS Staff 2: Billing Specialist (from login form)
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'billing@pbsmedical.com') INTO user_exists;
    
    IF NOT user_exists THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            instance_id,
            aud,
            role
        ) VALUES (
            gen_random_uuid(),
            'billing@pbsmedical.com',
            crypt('TempPass123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Jane Smith","role":"pbs_staff","department":"Billing"}',
            NOW(),
            NOW(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated'
        );
        RAISE NOTICE 'Created user: billing@pbsmedical.com';
    ELSE
        UPDATE auth.users 
        SET encrypted_password = crypt('TempPass123!', gen_salt('bf')),
            raw_user_meta_data = '{"full_name":"Jane Smith","role":"pbs_staff","department":"Billing"}'
        WHERE email = 'billing@pbsmedical.com';
        RAISE NOTICE 'Updated user: billing@pbsmedical.com';
    END IF;

    -- PBS Staff 3: Claims Processor (from login form)
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'claims@pbsmedical.com') INTO user_exists;
    
    IF NOT user_exists THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            instance_id,
            aud,
            role
        ) VALUES (
            gen_random_uuid(),
            'claims@pbsmedical.com',
            crypt('TempPass123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Robert Johnson","role":"pbs_staff","department":"Claims"}',
            NOW(),
            NOW(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated'
        );
        RAISE NOTICE 'Created user: claims@pbsmedical.com';
    ELSE
        UPDATE auth.users 
        SET encrypted_password = crypt('TempPass123!', gen_salt('bf')),
            raw_user_meta_data = '{"full_name":"Robert Johnson","role":"pbs_staff","department":"Claims"}'
        WHERE email = 'claims@pbsmedical.com';
        RAISE NOTICE 'Updated user: claims@pbsmedical.com';
    END IF;

    -- Super Admin: System Administrator
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'superadmin@pbsmedical.com') INTO user_exists;
    
    IF NOT user_exists THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            instance_id,
            aud,
            role
        ) VALUES (
            gen_random_uuid(),
            'superadmin@pbsmedical.com',
            crypt('TempPass123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"System Administrator","role":"super_admin"}',
            NOW(),
            NOW(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated'
        );
        RAISE NOTICE 'Created user: superadmin@pbsmedical.com';
    ELSE
        UPDATE auth.users 
        SET encrypted_password = crypt('TempPass123!', gen_salt('bf')),
            raw_user_meta_data = '{"full_name":"System Administrator","role":"super_admin"}'
        WHERE email = 'superadmin@pbsmedical.com';
        RAISE NOTICE 'Updated user: superadmin@pbsmedical.com';
    END IF;

    -- Client Portal User 1
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'client@hospitalnetwork.com') INTO user_exists;
    
    IF NOT user_exists THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            instance_id,
            aud,
            role
        ) VALUES (
            gen_random_uuid(),
            'client@hospitalnetwork.com',
            crypt('TempPass123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Patricia Anderson","role":"client","organization":"Hospital Network Inc."}',
            NOW(),
            NOW(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated'
        );
        RAISE NOTICE 'Created user: client@hospitalnetwork.com';
    ELSE
        UPDATE auth.users 
        SET encrypted_password = crypt('TempPass123!', gen_salt('bf')),
            raw_user_meta_data = '{"full_name":"Patricia Anderson","role":"client","organization":"Hospital Network Inc."}'
        WHERE email = 'client@hospitalnetwork.com';
        RAISE NOTICE 'Updated user: client@hospitalnetwork.com';
    END IF;

    -- Client Portal User 2
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'client@cityclinic.com') INTO user_exists;
    
    IF NOT user_exists THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            instance_id,
            aud,
            role
        ) VALUES (
            gen_random_uuid(),
            'client@cityclinic.com',
            crypt('TempPass123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"David Martinez","role":"client","organization":"City Clinic"}',
            NOW(),
            NOW(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated'
        );
        RAISE NOTICE 'Created user: client@cityclinic.com';
    ELSE
        UPDATE auth.users 
        SET encrypted_password = crypt('TempPass123!', gen_salt('bf')),
            raw_user_meta_data = '{"full_name":"David Martinez","role":"client","organization":"City Clinic"}'
        WHERE email = 'client@cityclinic.com';
        RAISE NOTICE 'Updated user: client@cityclinic.com';
    END IF;

    -- Test User
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'test@pbsmedical.com') INTO user_exists;
    
    IF NOT user_exists THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            instance_id,
            aud,
            role
        ) VALUES (
            gen_random_uuid(),
            'test@pbsmedical.com',
            crypt('TempPass123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Test User","role":"client","test_account":true}',
            NOW(),
            NOW(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated'
        );
        RAISE NOTICE 'Created user: test@pbsmedical.com';
    ELSE
        UPDATE auth.users 
        SET encrypted_password = crypt('TempPass123!', gen_salt('bf')),
            raw_user_meta_data = '{"full_name":"Test User","role":"client","test_account":true}'
        WHERE email = 'test@pbsmedical.com';
        RAISE NOTICE 'Updated user: test@pbsmedical.com';
    END IF;

END $$;

-- ============================================================================
-- VERIFY USER CREATION
-- ============================================================================

SELECT 
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'department' as department,
    raw_user_meta_data->>'organization' as organization,
    email_confirmed_at IS NOT NULL as email_confirmed,
    created_at::date as created_date
FROM auth.users
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com',
    'superadmin@pbsmedical.com',
    'client@hospitalnetwork.com',
    'client@cityclinic.com',
    'test@pbsmedical.com'
)
ORDER BY 
    CASE raw_user_meta_data->>'role'
        WHEN 'super_admin' THEN 1
        WHEN 'pbs_admin' THEN 2
        WHEN 'pbs_staff' THEN 3
        WHEN 'client' THEN 4
        ELSE 5
    END,
    email;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script creates/updates the following demo users:
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
-- TEST ACCOUNT:
-- ✓ test@pbsmedical.com (Test User)
-- 
-- The script will show NOTICE messages for each user created or updated.
-- ============================================================================