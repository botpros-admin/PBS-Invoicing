-- Drop the existing function to ensure a clean slate
DROP FUNCTION IF EXISTS global_search(search_term TEXT);

-- Recreate the function, casting all ID columns to TEXT to ensure UNION compatibility
CREATE OR REPLACE FUNCTION global_search(search_term TEXT)
RETURNS TABLE(id TEXT, title TEXT, subtitle TEXT, type TEXT) AS $$
BEGIN
    RETURN QUERY
    -- Search Invoices (id is bigint)
    SELECT
        i.id::text,
        'Invoice #' || i.invoice_number AS title,
        'Client: ' || c.name AS subtitle,
        'invoice' AS type
    FROM
        invoices i
    JOIN
        clients c ON i.client_id = c.id
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
        clients c
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
        clinics cl
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
        patients p
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
$$ LANGUAGE plpgsql;