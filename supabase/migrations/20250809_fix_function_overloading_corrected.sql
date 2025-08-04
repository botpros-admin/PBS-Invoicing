-- Supabase Migration: Fix Function Overloading (Corrected)
-- This migration redefines functions with ambiguous parameter types
-- by first dropping the old functions and then recreating them.

-- Drop the old functions with incorrect signatures
DROP FUNCTION IF EXISTS public.get_client_performance(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_top_cpt_codes(TIMESTAMPTZ, TIMESTAMPTZ);

-- Redefine get_client_performance with TIMESTAMPTZ
CREATE OR REPLACE FUNCTION public.get_client_performance(from_date TIMESTAMPTZ, to_date TIMESTAMPTZ)
RETURNS JSONB AS $$
BEGIN
    -- Placeholder logic remains, but the signature is now correct.
    RETURN '[]'::JSONB;
END;
$$ LANGUAGE plpgsql;

-- Redefine get_top_cpt_codes with TIMESTAMPTZ to prevent future issues
CREATE OR REPLACE FUNCTION public.get_top_cpt_codes(from_date TIMESTAMPTZ, to_date TIMESTAMPTZ)
RETURNS JSONB AS $$
BEGIN
    -- Placeholder logic remains, but the signature is now correct.
    RETURN '[]'::JSONB;
END;
$$ LANGUAGE plpgsql;