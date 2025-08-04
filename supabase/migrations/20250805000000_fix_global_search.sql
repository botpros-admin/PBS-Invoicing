-- Drop the existing function
DROP FUNCTION IF EXISTS global_search;

-- Recreate the function with the corrected logic
CREATE OR REPLACE FUNCTION global_search(search_term TEXT)
RETURNS TABLE(id UUID, title TEXT, subtitle TEXT, type TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
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

    SELECT
        c.id,
        c.name AS title,
        'Client' AS subtitle,
        'client' AS type
    FROM
        clients c
    WHERE
        c.name ILIKE '%' || search_term || '%'

    UNION ALL

    SELECT
        cl.id,
        cl.name AS title,
        'Clinic' AS subtitle,
        'clinic' AS type
    FROM
        clinics cl
    WHERE
        cl.name ILIKE '%' || search_term || '%'

    UNION ALL

    SELECT
        p.id,
        p.first_name || ' ' || p.last_name AS title,
        'Patient' AS subtitle,
        'patient' AS type
    FROM
        patients p
    WHERE
        p.first_name ILIKE '%' || search_term || '%' OR
        p.last_name ILIKE '%' || search_term || '%'

    UNION ALL

    SELECT
        u.id,
        u.email AS title,
        'User' AS subtitle,
        'user' AS type
    FROM
        auth.users u
    WHERE
        u.email ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql;
