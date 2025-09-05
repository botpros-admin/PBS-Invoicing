-- Create user_permissions table for granular permission management
-- This replaces hardcoded client permissions with database-driven permissions

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_user_permissions();

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  actions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource)
);

-- Create index for faster lookups
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);

-- Enable RLS on user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "System admins can manage all permissions" ON public.user_permissions;

-- RLS Policy: Users can only view their own permissions
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Only service role can insert/update/delete permissions
-- This ensures permissions can only be managed through admin interfaces
CREATE POLICY "Service role manages permissions"
  ON public.user_permissions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to get current user's permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS TABLE (
  resource TEXT,
  actions TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.resource,
    up.actions
  FROM public.user_permissions up
  WHERE up.user_id = auth.uid();
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_user_permissions() TO authenticated;

-- Insert default permissions for existing client users
-- This ensures existing users don't lose access
DO $$
DECLARE
  client_user RECORD;
BEGIN
  -- Loop through all client users and add default permissions
  FOR client_user IN 
    SELECT DISTINCT cu.auth_id 
    FROM public.client_users cu
    WHERE cu.auth_id IS NOT NULL
  LOOP
    -- Add default client permissions
    INSERT INTO public.user_permissions (user_id, resource, actions)
    VALUES 
      (client_user.auth_id, 'invoices', ARRAY['read']),
      (client_user.auth_id, 'payments', ARRAY['read', 'create']),
      (client_user.auth_id, 'reports', ARRAY['read']),
      (client_user.auth_id, 'disputes', ARRAY['read', 'create'])
    ON CONFLICT (user_id, resource) DO NOTHING;
  END LOOP;
END;
$$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON public.user_permissions;

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper function to add/update user permissions (for admin use)
CREATE OR REPLACE FUNCTION public.upsert_user_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_actions TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_permissions (user_id, resource, actions)
  VALUES (p_user_id, p_resource, p_actions)
  ON CONFLICT (user_id, resource)
  DO UPDATE SET 
    actions = EXCLUDED.actions,
    updated_at = NOW();
END;
$$;

-- Grant execute to service role only
REVOKE EXECUTE ON FUNCTION public.upsert_user_permission(UUID, TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_user_permission(UUID, TEXT, TEXT[]) TO service_role;

-- Add comment explaining the table's purpose
COMMENT ON TABLE public.user_permissions IS 'Stores granular permissions for each user. Replaces hardcoded client permissions.';
COMMENT ON COLUMN public.user_permissions.user_id IS 'References auth.users.id - the authenticated user';
COMMENT ON COLUMN public.user_permissions.resource IS 'The resource name (e.g., invoices, payments, reports)';
COMMENT ON COLUMN public.user_permissions.actions IS 'Array of allowed actions (e.g., read, create, update, delete)';