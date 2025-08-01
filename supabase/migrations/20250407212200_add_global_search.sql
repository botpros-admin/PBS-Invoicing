-- Migration: Add global search function
-- Timestamp: 20250407212200

CREATE OR REPLACE FUNCTION public.global_search(search_term text)
RETURNS TABLE(id text, type text, title text, subtitle text)
LANGUAGE plpgsql
SECURITY DEFINER -- Use definer to potentially bypass RLS for broader search, review security implications
AS $$
DECLARE
    term text := '%' || search_term || '%';
    result_limit int := 10; -- Limit total results
BEGIN
    RETURN QUERY
    SELECT -- Select directly from the subquery result
        q.id::text, 
        q.type::text, 
        q.title::text, 
        q.subtitle::text
    FROM ( -- Start of the subquery with UNION ALL
        (SELECT -- Parentheses around first SELECT
            i.id::text,
            'invoice'::text as type,
            i.invoice_number::text AS title,
            COALESCE(c.name, cl.name, 'Unknown') || ' - ' || COALESCE(p.first_name || ' ' || p.last_name, 'Unknown Patient') AS subtitle -- Ensure this uses first/last name
        FROM public.invoices i
        LEFT JOIN public.clinics cl ON i.clinic_id = cl.id
        LEFT JOIN public.clients c ON i.client_id = c.id -- Assuming direct client_id link exists or join via clinics
        LEFT JOIN public.patients p ON i.patient_id = p.id
        WHERE i.invoice_number ILIKE term
          -- Add other relevant invoice fields to search if needed
        ORDER BY i.date_created DESC
        LIMIT result_limit) -- Close parenthesis for first SELECT

        UNION ALL

        (SELECT -- Parentheses around second SELECT
            c.id::text,
            'client'::text as type,
            c.name::text AS title, -- Cast client name to text
            COALESCE(o.name, 'No Organization') AS subtitle
        FROM public.clients c
        LEFT JOIN public.organizations o ON c.organization_id = o.id
        WHERE c.name ILIKE term
        ORDER BY c.name
        LIMIT result_limit) -- Close parenthesis for second SELECT

        UNION ALL

        (SELECT -- Parentheses around third SELECT
            cl.id::text,
            'clinic'::text as type,
            cl.name::text AS title, -- Cast clinic name to text
            COALESCE(c.name, 'No Client') AS subtitle
        FROM public.clinics cl
        LEFT JOIN public.clients c ON cl.client_id = c.id
        WHERE cl.name ILIKE term
        ORDER BY cl.name
        LIMIT result_limit) -- Close parenthesis for third SELECT

        UNION ALL

        (SELECT -- Parentheses around fourth SELECT
            p.id::text,
            'patient'::text as type,
            (p.first_name || ' ' || p.last_name)::text AS title, -- Cast concatenated name to text
            'MRN: ' || COALESCE(p.mrn, 'N/A') AS subtitle
        FROM public.patients p
        WHERE (p.first_name ILIKE term OR p.last_name ILIKE term OR p.mrn ILIKE term) -- Search first/last name
        ORDER BY p.last_name, p.first_name -- Order by last, then first name
        LIMIT result_limit) -- Close parenthesis for last SELECT

        -- Consider adding user search if appropriate and secure
        -- UNION ALL
        -- SELECT
        --     u.id::text,
        --     'user'::text as type,
        --     u.first_name || ' ' || u.last_name AS title,
        --     u.email AS subtitle
        -- FROM public.users u
        -- WHERE (u.first_name ILIKE term OR u.last_name ILIKE term OR u.email ILIKE term)
        -- ORDER BY u.last_name, u.first_name
        -- LIMIT result_limit

    ) AS q -- Alias the combined UNION subquery
    LIMIT result_limit; -- Apply overall limit after the subquery

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.global_search(text) TO authenticated;

COMMENT ON FUNCTION public.global_search(text) IS 'Performs a global search across key tables (invoices, clients, clinics, patients).';
