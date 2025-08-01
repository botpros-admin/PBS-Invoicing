-- Create a stored procedure to get user by auth_id
-- This helps avoid schema reference issues in the API

-- First, check if the function already exists and drop it if it does
DROP FUNCTION IF EXISTS get_user_by_auth_id(auth_id_param UUID);

-- Create the stored procedure
CREATE OR REPLACE FUNCTION get_user_by_auth_id(auth_id_param UUID)
RETURNS TABLE (
  id BIGINT,
  auth_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  status TEXT,
  organization_id BIGINT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.auth_id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.status,
    u.organization_id,
    u.avatar_url,
    u.created_at,
    u.updated_at
  FROM users u
  WHERE u.auth_id = auth_id_param;
END;
$$;

-- Grant execute permission to the anon role
GRANT EXECUTE ON FUNCTION get_user_by_auth_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_by_auth_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_auth_id(UUID) TO service_role;
