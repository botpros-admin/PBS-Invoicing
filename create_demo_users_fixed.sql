-- ============================================================================
-- PBS INVOICING SYSTEM - COMPREHENSIVE DEMO USER SETUP (FIXED)
-- ============================================================================
-- This script creates demo users for all system roles with proper multi-tenant
-- associations, passwords, and metadata.
-- 
-- DEFAULT PASSWORD FOR ALL DEMO USERS: TempPass123!
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 1: CREATE BILLING COMPANIES AND LABORATORIES FOR MULTI-TENANCY
-- ============================================================================

DO $$
DECLARE
    billing_company_id UUID;
    lab1_id UUID;
    lab2_id UUID;
    lab3_id UUID;
BEGIN
    -- Create a Demo Billing Company first (required for laboratories)
    INSERT INTO public.billing_companies (
        id,
        name,
        address,
        phone,
        email,
        active,
        created_at,
        updated_at
    ) VALUES (
        'f1e2d3c4-b5a6-9780-1234-567890abcdef',
        'PBS Medical Billing Services',
        '100 Medical Plaza, Suite 500',
        '555-0001',
        'info@pbsmedical.com',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- Create Demo Laboratory 1: Regional Medical Labs
    INSERT INTO public.laboratories (
        id,
        billing_company_id,
        name,
        code,
        address,
        city,
        state,
        zip,
        phone,
        email,
        tax_id,
        clia_number,
        active,
        created_at,
        updated_at
    ) VALUES (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'f1e2d3c4-b5a6-9780-1234-567890abcdef',
        'Regional Medical Labs',
        'RML001',
        '123 Medical Center Dr',
        'Houston',
        'TX',
        '77001',
        '555-0100',
        'contact@regionalmedlabs.com',
        '12-3456789',
        '45D0123456',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- Create Demo Laboratory 2: Advanced Diagnostics Center
    INSERT INTO public.laboratories (
        id,
        billing_company_id,
        name,
        code,
        address,
        city,
        state,
        zip,
        phone,
        email,
        tax_id,
        clia_number,
        active,
        created_at,
        updated_at
    ) VALUES (
        'b2c3d4e5-f6a7-8901-bcde-f23456789012',
        'f1e2d3c4-b5a6-9780-1234-567890abcdef',
        'Advanced Diagnostics Center',
        'ADC002',
        '456 Research Blvd',
        'Austin',
        'TX',
        '78701',
        '555-0200',
        'contact@advanceddiagnostics.com',
        '98-7654321',
        '45D0987654',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- Create Demo Laboratory 3: City Clinical Labs (Inactive for testing)
    INSERT INTO public.laboratories (
        id,
        billing_company_id,
        name,
        code,
        address,
        city,
        state,
        zip,
        phone,
        email,
        tax_id,
        clia_number,
        active,
        created_at,
        updated_at
    ) VALUES (
        'c3d4e5f6-a7b8-9012-cdef-345678901234',
        'f1e2d3c4-b5a6-9780-1234-567890abcdef',
        'City Clinical Labs',
        'CCL003',
        '789 Downtown Plaza',
        'Dallas',
        'TX',
        '75201',
        '555-0300',
        'contact@cityclinicallabs.com',
        '55-1234567',
        '45D0555555',
        false,  -- Inactive for testing
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;
END $$;

-- ============================================================================
-- STEP 2: CREATE DEMO USERS WITH ROLES
-- ============================================================================

DO $$
DECLARE
    user_id UUID;
BEGIN
    -- ========================================================================
    -- PBS STAFF USERS (PBS Medical internal staff - from login form)
    -- ========================================================================
    
    -- PBS Staff 1: Administrator
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'admin@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"PBS Administrator","role":"pbs_admin","department":"Administration"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (email) DO NOTHING
    RETURNING id INTO user_id;

    IF user_id IS NOT NULL THEN
        -- Check if user_roles table exists and insert role
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (user_id, 'pbs_admin', NOW())
        ON CONFLICT (user_id) DO UPDATE SET role = 'pbs_admin';
        
        -- Check if profiles table exists and insert profile
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            role,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            'admin@pbsmedical.com',
            'PBS Administrator',
            'pbs_admin',
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- PBS Staff 2: Billing Specialist
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'billing@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Jane Smith","role":"pbs_staff","department":"Billing"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (email) DO NOTHING
    RETURNING id INTO user_id;

    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (user_id, 'pbs_staff', NOW())
        ON CONFLICT (user_id) DO UPDATE SET role = 'pbs_staff';
        
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            role,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            'billing@pbsmedical.com',
            'Jane Smith',
            'pbs_staff',
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- PBS Staff 3: Claims Processor
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'claims@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Robert Johnson","role":"pbs_staff","department":"Claims"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (email) DO NOTHING
    RETURNING id INTO user_id;

    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (user_id, 'pbs_staff', NOW())
        ON CONFLICT (user_id) DO UPDATE SET role = 'pbs_staff';
        
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            role,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            'claims@pbsmedical.com',
            'Robert Johnson',
            'pbs_staff',
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- ========================================================================
    -- SUPER ADMIN USERS (Full system access)
    -- ========================================================================
    
    -- Super Admin: System Administrator
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'superadmin@pbsmedical.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"System Administrator","role":"super_admin"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (email) DO NOTHING
    RETURNING id INTO user_id;

    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (user_id, 'super_admin', NOW())
        ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
        
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            role,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            'superadmin@pbsmedical.com',
            'System Administrator',
            'super_admin',
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- ========================================================================
    -- CLIENT PORTAL USERS (External clients)
    -- ========================================================================
    
    -- Client 1: Hospital Network Representative
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'client@hospitalnetwork.com',
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Patricia Anderson","role":"client","organization":"Hospital Network Inc."}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (email) DO NOTHING
    RETURNING id INTO user_id;

    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (user_id, 'client', NOW())
        ON CONFLICT (user_id) DO UPDATE SET role = 'client';
        
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            role,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            'client@hospitalnetwork.com',
            'Patricia Anderson',
            'client',
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO NOTHING;
    END IF;

END $$;

-- ============================================================================
-- STEP 3: CREATE SIMPLER TEST USERS WITHOUT COMPLEX RELATIONSHIPS
-- ============================================================================

-- Simple approach: Just create the auth users with basic metadata
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
VALUES 
    ('test1@pbsmedical.com', crypt('TempPass123!', gen_salt('bf')), NOW(), '{"provider":"email"}', '{"role":"pbs_staff"}'),
    ('test2@pbsmedical.com', crypt('TempPass123!', gen_salt('bf')), NOW(), '{"provider":"email"}', '{"role":"client"}'),
    ('test3@pbsmedical.com', crypt('TempPass123!', gen_salt('bf')), NOW(), '{"provider":"email"}', '{"role":"lab_admin"}')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- STEP 4: VERIFY USER CREATION
-- ============================================================================

-- Display created users
SELECT 
    au.email,
    au.raw_user_meta_data->>'full_name' as full_name,
    au.raw_user_meta_data->>'role' as role,
    au.created_at::date as created_date
FROM auth.users au
WHERE au.email LIKE '%@%'
ORDER BY au.email;

-- ============================================================================
-- SUMMARY OF CREATED DEMO USERS
-- ============================================================================
-- 
-- ALL USERS USE PASSWORD: TempPass123!
-- 
-- PBS STAFF (From Login Form):
-- - admin@pbsmedical.com (PBS Administrator)
-- - billing@pbsmedical.com (Billing Specialist)
-- - claims@pbsmedical.com (Claims Processor)
-- 
-- SUPER ADMIN:
-- - superadmin@pbsmedical.com (System Administrator)
-- 
-- CLIENT PORTAL:
-- - client@hospitalnetwork.com (Hospital Network)
-- 
-- TEST ACCOUNTS:
-- - test1@pbsmedical.com (PBS Staff test)
-- - test2@pbsmedical.com (Client test)
-- - test3@pbsmedical.com (Lab Admin test)
-- 
-- ============================================================================