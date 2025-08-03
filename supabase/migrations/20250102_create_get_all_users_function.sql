-- Create the get_all_users_in_organization RPC function
CREATE OR REPLACE FUNCTION public.get_all_users_in_organization()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  status text,
  last_login_at timestamp with time zone,
  lab_id uuid,
  clinic_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', u.email) as name,
    COALESCE(u.raw_user_meta_data->>'role', 'user') as role,
    CASE 
      WHEN u.confirmed_at IS NULL THEN 'invited'
      WHEN u.last_sign_in_at > NOW() - INTERVAL '30 days' THEN 'active'
      ELSE 'inactive'
    END as status,
    u.last_sign_in_at as last_login_at,
    (u.raw_user_meta_data->>'lab_id')::uuid as lab_id,
    (u.raw_user_meta_data->>'clinic_id')::uuid as clinic_id,
    u.created_at,
    u.updated_at
  FROM auth.users u
  WHERE u.deleted_at IS NULL
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_in_organization() TO authenticated;
