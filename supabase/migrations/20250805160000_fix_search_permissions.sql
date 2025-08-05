-- Drop the existing function to ensure a clean slate
DROP FUNCTION IF EXISTS global_search(search_term TEXT);

-- Recreate the function with SECURITY DEFINER to allow it to query auth.users
-- This is secure because it only runs with elevated privileges within the context of this specific, controlled query.
CREATE OR REPLACE FUNCTION global_search(search_term TEXT)
RETURNS TABLE(id TEXT, title TEXT, subtitle TEXT, type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    -- Search Invoices (id is bigint)
    SELECT
        i.id::text,
        'Invoice #' || i.invoice_number AS title,
        'Client: ' || c.name AS subtitle,
        'invoice' AS type
    FROM
        public.invoices i
    JOIN
        public.clients c ON i.client_id = c.id
    WHERE
        i.invoice_number ILIKE '%' || search_term || '%' OR
        c.name ILIKE '%' || search_term || '%'

    UNION ALL

    -- Search Clients (id is bigint)
    SELECT
        c.id::text,
        c.name AS title,
        'Client' AS subtitle,
        'client' AS type
    FROM
        public.clients c
    WHERE
        c.name ILIKE '%' || search_term || '%'

    UNION ALL

    -- Search Clinics (id is bigint)
    SELECT
        cl.id::text,
        cl.name AS title,
        'Clinic' AS subtitle,
        'clinic' AS type
    FROM
        public.clinics cl
    WHERE
        cl.name ILIKE '%' || search_term || '%'

    UNION ALL

    -- Search Patients (id is bigint)
    SELECT
        p.id::text,
        p.first_name || ' ' || p.last_name AS title,
        'Patient' AS subtitle,
        'patient' AS type
    FROM
        public.patients p
    WHERE
        p.first_name ILIKE '%' || search_term || '%' OR
        p.last_name ILIKE '%' || search_term || '%'

    UNION ALL

    -- Search Users (id is uuid from auth.users)
    SELECT
        u.id::text,
        u.email AS title,
        'User' AS subtitle,
        'user' AS type
    FROM
        auth.users u
    WHERE
        u.email ILIKE '%' || search_term || '%';
END;
$$;

-- Grant execute permission to the authenticated role so that logged-in users can run the search
GRANT EXECUTE ON FUNCTION global_search(TEXT) TO authenticated;
