-- ============================================================================
-- RESET PASSWORDS FOR DEMO USERS - ADMIN APPROACH
-- ============================================================================
-- This uses Supabase's admin approach to reset passwords
-- ============================================================================

-- Method 1: Update passwords directly (preferred for demo users)
UPDATE auth.users 
SET 
    encrypted_password = crypt('TempPass123!', gen_salt('bf')),
    updated_at = NOW()
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com'
);

-- Verify the update
SELECT 
    email,
    encrypted_password IS NOT NULL as has_password,
    updated_at
FROM auth.users
WHERE email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com'
);

-- ============================================================================
-- Alternative: If the above doesn't work, try creating identities
-- ============================================================================

-- First check if identities exist
SELECT 
    u.email,
    i.provider,
    i.identity_data->>'email' as identity_email
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE u.email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com'
);

-- If no identities exist, create them
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id, email 
        FROM auth.users 
        WHERE email IN (
            'admin@pbsmedical.com',
            'billing@pbsmedical.com',
            'claims@pbsmedical.com'
        )
    LOOP
        -- Check if identity already exists
        IF NOT EXISTS (
            SELECT 1 FROM auth.identities 
            WHERE user_id = user_record.id AND provider = 'email'
        ) THEN
            -- Create email identity
            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid()::text,
                user_record.id,
                jsonb_build_object(
                    'sub', user_record.id::text,
                    'email', user_record.email,
                    'email_verified', true,
                    'provider', 'email'
                ),
                'email',
                NOW(),
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Created identity for %', user_record.email;
        END IF;
    END LOOP;
END $$;

-- Final verification
SELECT 
    u.email,
    u.encrypted_password IS NOT NULL as has_password,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    i.provider as identity_provider,
    u.raw_user_meta_data->>'role' as role
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE u.email IN (
    'admin@pbsmedical.com',
    'billing@pbsmedical.com',
    'claims@pbsmedical.com'
)
ORDER BY u.email;

-- ============================================================================
-- IMPORTANT: After running this script, try logging in with:
-- 
-- admin@pbsmedical.com / TempPass123!
-- billing@pbsmedical.com / TempPass123!
-- claims@pbsmedical.com / TempPass123!
-- ============================================================================