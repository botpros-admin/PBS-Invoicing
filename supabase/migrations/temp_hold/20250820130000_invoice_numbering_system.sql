-- ================================================
-- INVOICE NUMBERING SYSTEM WITH GAP-FREE SEQUENCES
-- ================================================
-- Implements counter tables with row-level locking for gap-free invoice numbers
-- Each laboratory gets its own sequence with customizable prefix
-- ================================================

-- Create invoice counters table for managing sequences per laboratory
CREATE TABLE IF NOT EXISTS public.invoice_counters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    laboratory_id UUID NOT NULL REFERENCES public.laboratories(id) ON DELETE CASCADE,
    prefix TEXT NOT NULL DEFAULT 'INV',
    year INTEGER NOT NULL,
    last_value INTEGER NOT NULL DEFAULT 0,
    format_pattern TEXT DEFAULT '{prefix}-{year}-{number:06d}', -- e.g., INV-2025-000001
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(laboratory_id, year)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_invoice_counters_lab_year ON public.invoice_counters(laboratory_id, year);

-- Enable RLS for invoice_counters
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoice_counters
CREATE POLICY "Users can view their laboratory's counters"
    ON public.invoice_counters
    FOR SELECT
    USING (
        laboratory_id IN (
            SELECT laboratory_id 
            FROM public.users 
            WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their laboratory's counters"
    ON public.invoice_counters
    FOR UPDATE
    USING (
        laboratory_id IN (
            SELECT laboratory_id 
            FROM public.users 
            WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert counters for their laboratory"
    ON public.invoice_counters
    FOR INSERT
    WITH CHECK (
        laboratory_id IN (
            SELECT laboratory_id 
            FROM public.users 
            WHERE auth_id = auth.uid()
        )
    );

-- ================================================
-- FUNCTION: get_next_invoice_number
-- ================================================
-- Generates the next invoice number for a laboratory
-- Uses ACCESS EXCLUSIVE lock to ensure gap-free sequences
-- Creates counter record if it doesn't exist for the current year
-- ================================================
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(
    p_laboratory_id UUID,
    p_prefix TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year INTEGER;
    v_next_value INTEGER;
    v_prefix TEXT;
    v_format_pattern TEXT;
    v_invoice_number TEXT;
    v_counter_exists BOOLEAN;
BEGIN
    -- Get current year
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Start transaction with appropriate isolation level
    -- This ensures we don't get duplicate numbers
    PERFORM pg_advisory_xact_lock(hashtext(p_laboratory_id::TEXT || v_year::TEXT));
    
    -- Check if counter exists for this laboratory and year
    SELECT EXISTS(
        SELECT 1 
        FROM public.invoice_counters 
        WHERE laboratory_id = p_laboratory_id 
        AND year = v_year
        AND is_active = true
    ) INTO v_counter_exists;
    
    IF NOT v_counter_exists THEN
        -- Get laboratory settings for default prefix if not provided
        IF p_prefix IS NULL THEN
            SELECT 
                COALESCE(
                    l.settings->>'invoice_prefix',
                    UPPER(SUBSTRING(l.name FROM 1 FOR 3))
                ) INTO v_prefix
            FROM public.laboratories l
            WHERE l.id = p_laboratory_id;
            
            -- Default to 'INV' if no prefix found
            IF v_prefix IS NULL THEN
                v_prefix := 'INV';
            END IF;
        ELSE
            v_prefix := p_prefix;
        END IF;
        
        -- Create new counter for this year
        INSERT INTO public.invoice_counters (
            laboratory_id,
            prefix,
            year,
            last_value,
            format_pattern
        ) VALUES (
            p_laboratory_id,
            v_prefix,
            v_year,
            0,
            '{prefix}-{year}-{number:06d}'
        );
        
        v_next_value := 1;
        v_format_pattern := '{prefix}-{year}-{number:06d}';
    ELSE
        -- Get and increment the counter
        UPDATE public.invoice_counters
        SET 
            last_value = last_value + 1,
            updated_at = NOW()
        WHERE 
            laboratory_id = p_laboratory_id
            AND year = v_year
            AND is_active = true
        RETURNING 
            last_value,
            COALESCE(p_prefix, prefix),
            format_pattern
        INTO 
            v_next_value,
            v_prefix,
            v_format_pattern;
    END IF;
    
    -- Format the invoice number according to pattern
    -- Default pattern: {prefix}-{year}-{number:06d} => INV-2025-000001
    v_invoice_number := v_format_pattern;
    v_invoice_number := REPLACE(v_invoice_number, '{prefix}', v_prefix);
    v_invoice_number := REPLACE(v_invoice_number, '{year}', v_year::TEXT);
    v_invoice_number := REPLACE(v_invoice_number, '{number:06d}', LPAD(v_next_value::TEXT, 6, '0'));
    v_invoice_number := REPLACE(v_invoice_number, '{number:05d}', LPAD(v_next_value::TEXT, 5, '0'));
    v_invoice_number := REPLACE(v_invoice_number, '{number:04d}', LPAD(v_next_value::TEXT, 4, '0'));
    v_invoice_number := REPLACE(v_invoice_number, '{number}', v_next_value::TEXT);
    
    RETURN v_invoice_number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(UUID, TEXT) TO authenticated;

-- ================================================
-- FUNCTION: reset_invoice_counter
-- ================================================
-- Allows admin users to reset invoice counter for a laboratory
-- Useful for testing or fixing sequence issues
-- ================================================
CREATE OR REPLACE FUNCTION public.reset_invoice_counter(
    p_laboratory_id UUID,
    p_year INTEGER DEFAULT NULL,
    p_new_value INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year INTEGER;
    v_user_role TEXT;
BEGIN
    -- Check if user is admin for this laboratory
    SELECT role INTO v_user_role
    FROM public.users
    WHERE auth_id = auth.uid()
    AND laboratory_id = p_laboratory_id;
    
    IF v_user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Only admin users can reset invoice counters';
    END IF;
    
    -- Use current year if not specified
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));
    
    -- Update the counter
    UPDATE public.invoice_counters
    SET 
        last_value = p_new_value,
        updated_at = NOW()
    WHERE 
        laboratory_id = p_laboratory_id
        AND year = v_year;
        
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Counter not found for laboratory % and year %', p_laboratory_id, v_year;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users (function checks role internally)
GRANT EXECUTE ON FUNCTION public.reset_invoice_counter(UUID, INTEGER, INTEGER) TO authenticated;

-- ================================================
-- FUNCTION: get_invoice_counter_status
-- ================================================
-- Returns current counter status for a laboratory
-- Useful for displaying current sequence info in UI
-- ================================================
CREATE OR REPLACE FUNCTION public.get_invoice_counter_status(
    p_laboratory_id UUID,
    p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
    prefix TEXT,
    year INTEGER,
    last_value INTEGER,
    next_value INTEGER,
    format_pattern TEXT,
    sample_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year INTEGER;
BEGIN
    -- Use current year if not specified
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));
    
    RETURN QUERY
    SELECT 
        ic.prefix,
        ic.year,
        ic.last_value,
        ic.last_value + 1 as next_value,
        ic.format_pattern,
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(ic.format_pattern, '{prefix}', ic.prefix),
                    '{year}', ic.year::TEXT
                ),
                '{number:06d}', LPAD((ic.last_value + 1)::TEXT, 6, '0')
            ),
            '{number}', (ic.last_value + 1)::TEXT
        ) as sample_number
    FROM public.invoice_counters ic
    WHERE 
        ic.laboratory_id = p_laboratory_id
        AND ic.year = v_year
        AND ic.is_active = true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_invoice_counter_status(UUID, INTEGER) TO authenticated;

-- ================================================
-- TRIGGER: Update invoice number on insert
-- ================================================
-- Automatically generates invoice number if not provided
-- ================================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only generate if invoice_number is NULL or empty
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        -- Get laboratory_id from organization
        NEW.invoice_number := public.get_next_invoice_number(
            (SELECT laboratory_id FROM public.organizations WHERE id = NEW.organization_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for automatic invoice number generation
DROP TRIGGER IF EXISTS generate_invoice_number_on_insert ON public.invoices;
CREATE TRIGGER generate_invoice_number_on_insert
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_invoice_number_trigger();

-- ================================================
-- MIGRATION: Initialize counters for existing laboratories
-- ================================================
-- Creates initial counter records for laboratories that have existing invoices
-- ================================================
DO $$
DECLARE
    lab_record RECORD;
    max_invoice_num INTEGER;
BEGIN
    -- For each laboratory with existing invoices
    FOR lab_record IN 
        SELECT DISTINCT 
            o.laboratory_id,
            EXTRACT(YEAR FROM i.invoice_date) as invoice_year,
            COALESCE(l.settings->>'invoice_prefix', UPPER(SUBSTRING(l.name FROM 1 FOR 3)), 'INV') as prefix
        FROM public.invoices i
        JOIN public.organizations o ON i.organization_id = o.id
        JOIN public.laboratories l ON o.laboratory_id = l.id
        WHERE o.laboratory_id IS NOT NULL
    LOOP
        -- Try to extract the last number from existing invoice numbers
        -- This assumes format like 'INV-2025-000123' or similar
        BEGIN
            SELECT 
                COALESCE(
                    MAX(
                        CASE 
                            WHEN invoice_number ~ '\d+$' THEN 
                                (regexp_match(invoice_number, '(\d+)$'))[1]::INTEGER
                            WHEN invoice_number ~ '-(\d+)-' THEN
                                (regexp_match(invoice_number, '-(\d+)-'))[1]::INTEGER
                            ELSE 0
                        END
                    ), 
                    0
                ) INTO max_invoice_num
            FROM public.invoices i
            JOIN public.organizations o ON i.organization_id = o.id
            WHERE o.laboratory_id = lab_record.laboratory_id
            AND EXTRACT(YEAR FROM i.invoice_date) = lab_record.invoice_year;
            
            -- Insert counter if it doesn't exist
            INSERT INTO public.invoice_counters (
                laboratory_id,
                prefix,
                year,
                last_value
            ) VALUES (
                lab_record.laboratory_id,
                lab_record.prefix,
                lab_record.invoice_year,
                max_invoice_num
            )
            ON CONFLICT (laboratory_id, year) DO NOTHING;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- If extraction fails, start from 0
                INSERT INTO public.invoice_counters (
                    laboratory_id,
                    prefix,
                    year,
                    last_value
                ) VALUES (
                    lab_record.laboratory_id,
                    lab_record.prefix,
                    lab_record.invoice_year,
                    0
                )
                ON CONFLICT (laboratory_id, year) DO NOTHING;
        END;
    END LOOP;
END $$;

-- ================================================
-- Add index to invoices table for faster lookups
-- ================================================
CREATE INDEX IF NOT EXISTS idx_invoices_org_number ON public.invoices(organization_id, invoice_number);

-- ================================================
-- COMMENTS
-- ================================================
COMMENT ON TABLE public.invoice_counters IS 'Manages gap-free invoice number sequences per laboratory and year';
COMMENT ON FUNCTION public.get_next_invoice_number IS 'Generates next gap-free invoice number for a laboratory';
COMMENT ON FUNCTION public.reset_invoice_counter IS 'Admin function to reset invoice counter (for testing/fixes)';
COMMENT ON FUNCTION public.get_invoice_counter_status IS 'Returns current counter status and next number preview';