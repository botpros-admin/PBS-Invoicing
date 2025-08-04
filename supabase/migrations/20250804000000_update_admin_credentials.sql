-- This is a one-off script to update admin credentials.
-- It's recommended to handle user management through a proper admin interface.

DO $$
DECLARE
    user_id_to_update uuid;
BEGIN
    -- Get the user ID for the email to be updated
    SELECT id INTO user_id_to_update FROM auth.users WHERE email = 'mritchie@botpros.ai';

    -- If the user exists, update the email and password
    IF user_id_to_update IS NOT NULL THEN
        UPDATE auth.users
        SET
            email = 'admin@email.com',
            encrypted_password = crypt('TempPass123!', gen_salt('bf'))
        WHERE id = user_id_to_update;
    END IF;
END $$;
