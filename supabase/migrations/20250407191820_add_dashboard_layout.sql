-- Migration: Add dashboard layout persistence to users table
-- Timestamp: 20250407191820

-- 1. Add dashboard_layout column to users table
ALTER TABLE public.users
ADD COLUMN dashboard_layout jsonb;

COMMENT ON COLUMN public.users.dashboard_layout IS 'Stores user-specific dashboard widget layout and configuration.';

-- 2. Create RPC function to update dashboard layout
CREATE OR REPLACE FUNCTION public.update_dashboard_layout(new_layout jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Use definer security to ensure the update happens based on auth.uid() reliably
AS $$
BEGIN
  UPDATE public.users
  SET
    dashboard_layout = new_layout,
    updated_at = now() -- Also update the updated_at timestamp
  WHERE auth_id = auth.uid(); -- Use auth_id which links to auth.users(id)
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_dashboard_layout(jsonb) TO authenticated;

COMMENT ON FUNCTION public.update_dashboard_layout(jsonb) IS 'Updates the dashboard layout JSONB for the currently authenticated user.';

-- 3. RLS Policy Note:
-- Assuming the existing UPDATE policy on public.users allows users to update their own record
-- (e.g., USING (auth.uid() = auth_id)), that policy should implicitly allow updating the
-- new 'dashboard_layout' column for matching rows. No explicit RLS change is added here,
-- relying on the existing policy and the RPC function's WHERE clause for security.
-- If issues arise, review the specific UPDATE policy on public.users.
