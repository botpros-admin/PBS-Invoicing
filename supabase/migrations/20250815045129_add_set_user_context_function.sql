-- Create set_user_context function for RLS context management
CREATE OR REPLACE FUNCTION public.set_user_context(
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_organization_id UUID;
BEGIN
  -- Use provided user_id or get from auth context
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Use provided organization_id or get from user_profiles
  IF p_organization_id IS NOT NULL THEN
    v_organization_id := p_organization_id;
  ELSE
    SELECT organization_id INTO v_organization_id
    FROM user_profiles
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;
  
  -- Set session variables for RLS policies to use
  -- These can be used in RLS policies with current_setting()
  PERFORM set_config('app.current_user_id', v_user_id::TEXT, false);
  PERFORM set_config('app.current_organization_id', COALESCE(v_organization_id::TEXT, ''), false);
  
  -- Log the context setting (optional, can be removed in production)
  RAISE NOTICE 'User context set - User: %, Organization: %', v_user_id, v_organization_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_user_context(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.set_user_context(UUID, UUID) IS 
'Sets the user and organization context for the current database session. Used by RLS policies to filter data appropriately.';