-- Fix authentication issues by ensuring proper user setup

-- First, check if we have test organizations
DO $$
BEGIN
    -- Create a test organization if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = 'PBS Medical') THEN
        INSERT INTO public.organizations (id, name, type, status)
        VALUES ('11111111-1111-1111-1111-111111111111', 'PBS Medical', 'billing_company', 'active');
    END IF;
END $$;

-- Create user profiles for existing auth users
DO $$
DECLARE
    auth_user RECORD;
    org_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Loop through all auth users
    FOR auth_user IN 
        SELECT id, email FROM auth.users 
        WHERE email IN ('test@test.com', 'testuser@testcompany.com', 'admin@pbsmedical.com', 'billing@pbsmedical.com', 'claims@pbsmedical.com')
    LOOP
        -- Check if profile exists
        IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth_user.id) THEN
            -- Create user profile
            INSERT INTO public.user_profiles (user_id, organization_id, role, permissions, is_primary)
            VALUES (
                auth_user.id, 
                org_id,
                CASE 
                    WHEN auth_user.email LIKE '%admin%' THEN 'admin'
                    WHEN auth_user.email LIKE '%billing%' THEN 'billing'
                    WHEN auth_user.email LIKE '%claims%' THEN 'claims'
                    ELSE 'user'
                END,
                '[]'::jsonb,
                true
            );
            RAISE NOTICE 'Created profile for user: %', auth_user.email;
        ELSE
            RAISE NOTICE 'Profile already exists for user: %', auth_user.email;
        END IF;
    END LOOP;
END $$;

-- Add a simple RLS policy for user_profiles if it doesn't exist
DO $$
BEGIN
    -- Drop any existing conflicting policies
    DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users can view profiles in their hierarchy" ON public.user_profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
    
    -- Create a simple policy that allows users to see their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" 
        ON public.user_profiles 
        FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
    
    -- Allow users to update their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" 
        ON public.user_profiles 
        FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Enable RLS on user_profiles if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Verify the setup
SELECT 
    u.email,
    u.id as auth_id,
    up.id as profile_id,
    up.role,
    up.organization_id,
    o.name as org_name
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
LEFT JOIN public.organizations o ON up.organization_id = o.id
WHERE u.email IN ('test@test.com', 'testuser@testcompany.com', 'admin@pbsmedical.com', 'billing@pbsmedical.com', 'claims@pbsmedical.com');