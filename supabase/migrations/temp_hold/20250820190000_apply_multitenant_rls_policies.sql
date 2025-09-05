-- ================================================
-- APPLY MULTI-TENANT RLS POLICIES
-- ================================================
-- This migration enables RLS on all tenant-specific tables and applies
-- policies to ensure that users can only access data for their own
-- billing company.
-- ================================================

-- Helper function to check if the current user is a member of the organization
CREATE OR REPLACE FUNCTION auth.is_billing_company_member(company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_id = auth.uid() AND billing_company_id = company_id
  );
$$;
GRANT EXECUTE ON FUNCTION auth.is_billing_company_member(UUID) TO authenticated;

-- ================================================
-- RLS POLICIES
-- ================================================

-- Function to apply policies to a table
CREATE OR REPLACE PROCEDURE apply_rls_policies(
    table_name TEXT,
    tenant_column_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);
    
    -- Drop existing policies to avoid conflicts
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access for own billing company" ON public.%I;', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow insert for own billing company" ON public.%I;', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow update for own billing company" ON public.%I;', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow delete for own billing company" ON public.%I;', table_name);

    -- SELECT policy
    EXECUTE format('
        CREATE POLICY "Allow full access for own billing company"
        ON public.%I
        FOR ALL
        USING (
            %I = app.current_organization_id()
        );
    ', table_name, table_name, tenant_column_name);
END;
$$;

-- Apply policies to all relevant tables
CALL apply_rls_policies('billing_companies', 'id');
CALL apply_rls_policies('healthcare_providers', 'billing_company_id');
CALL apply_rls_policies('users', 'billing_company_id');
CALL apply_rls_policies('patients', 'billing_company_id');
CALL apply_rls_policies('invoices', 'billing_company_id');
CALL apply_rls_policies('invoice_line_items', 'billing_company_id');
CALL apply_rls_policies('payments', 'billing_company_id');
CALL apply_rls_policies('company_settings', 'billing_company_id');
CALL apply_rls_policies('provider_settings', 'billing_company_id');
CALL apply_rls_policies('pricing_rules', 'billing_company_id');
CALL apply_rls_policies('audit_logs', 'billing_company_id');

-- Special handling for client_users (assuming they exist as you mentioned)
-- This policy allows client users to see their own data based on their client's billing company.
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow client users to see their own data" ON public.client_users;
CREATE POLICY "Allow client users to see their own data"
ON public.client_users
FOR SELECT
USING (
  auth_id = auth.uid()
);

-- Since client_users don't have a direct billing_company_id, we need to handle
-- tables they might access (like invoices) with a more complex policy.
-- This example is for the 'invoices' table. You would need similar policies
-- for other tables client users can access.

DROP POLICY IF EXISTS "Allow client users to view their invoices" ON public.invoices;
CREATE POLICY "Allow client users to view their invoices"
ON public.invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.client_users cu
    JOIN public.clients c ON cu.client_id = c.id
    WHERE cu.auth_id = auth.uid()
    AND c.organization_id = invoices.billing_company_id
  )
);

-- Drop the procedure as it's no longer needed
DROP PROCEDURE apply_rls_policies(TEXT, TEXT);
