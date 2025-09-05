-- =====================================================
-- FIX ORGANIZATION SELECTOR - MANY-TO-MANY RELATIONSHIP
-- =====================================================
-- Based on client requirements from transcripts:
-- "I can grant specific employees access to specific labs"
-- Users need to switch between multiple laboratories
-- =====================================================

-- Step 1: Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.user_laboratory_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    laboratory_id UUID NOT NULL,
    granted_by UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure unique combinations
    UNIQUE(user_id, laboratory_id),
    
    -- Foreign keys (adjust based on your actual table names)
    CONSTRAINT fk_user 
        FOREIGN KEY (user_id) 
        REFERENCES public.users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_laboratory
        FOREIGN KEY (laboratory_id)
        REFERENCES public.laboratories(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_granted_by
        FOREIGN KEY (granted_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_user_lab_access_user ON public.user_laboratory_access(user_id);
CREATE INDEX idx_user_lab_access_lab ON public.user_laboratory_access(laboratory_id);
CREATE INDEX idx_user_lab_access_active ON public.user_laboratory_access(is_active);

-- Step 2: Add current laboratory selection to user preferences
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS current_laboratory_id UUID,
ADD COLUMN IF NOT EXISTS last_laboratory_switch TIMESTAMP WITH TIME ZONE;

-- Step 3: Create function to get user's accessible laboratories
CREATE OR REPLACE FUNCTION public.get_user_laboratories(p_user_id UUID)
RETURNS TABLE (
    laboratory_id UUID,
    laboratory_name TEXT,
    laboratory_code TEXT,
    is_current BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as laboratory_id,
        l.name as laboratory_name,
        l.code as laboratory_code,
        (u.current_laboratory_id = l.id) as is_current
    FROM public.user_laboratory_access ula
    JOIN public.laboratories l ON l.id = ula.laboratory_id
    LEFT JOIN public.users u ON u.id = p_user_id
    WHERE ula.user_id = p_user_id
    AND ula.is_active = true
    AND l.active = true
    ORDER BY l.name;
END;
$$;

-- Step 4: Create function to switch laboratory context
CREATE OR REPLACE FUNCTION public.switch_laboratory_context(
    p_user_id UUID,
    p_laboratory_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_access BOOLEAN;
    v_result jsonb;
BEGIN
    -- Check if user has access to this laboratory
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_laboratory_access 
        WHERE user_id = p_user_id 
        AND laboratory_id = p_laboratory_id
        AND is_active = true
    ) INTO v_has_access;
    
    IF NOT v_has_access THEN
        RAISE EXCEPTION 'User does not have access to this laboratory';
    END IF;
    
    -- Update user's current laboratory
    UPDATE public.users
    SET 
        current_laboratory_id = p_laboratory_id,
        last_laboratory_switch = NOW()
    WHERE id = p_user_id;
    
    -- Get laboratory details
    SELECT jsonb_build_object(
        'success', true,
        'laboratory_id', l.id,
        'laboratory_name', l.name,
        'laboratory_code', l.code,
        'organization_id', l.billing_company_id
    ) INTO v_result
    FROM public.laboratories l
    WHERE l.id = p_laboratory_id;
    
    RETURN v_result;
END;
$$;

-- Step 5: Grant permissions
GRANT SELECT ON public.user_laboratory_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_laboratories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.switch_laboratory_context(UUID, UUID) TO authenticated;

-- Step 6: Enable RLS on the new table
ALTER TABLE public.user_laboratory_access ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for user_laboratory_access
CREATE POLICY "Users can view their own laboratory access"
    ON public.user_laboratory_access
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage laboratory access"
    ON public.user_laboratory_access
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role::text IN ('super_admin', 'admin')
        )
    );

-- Step 8: Migrate existing data
-- Copy existing provider assignments to the new junction table
INSERT INTO public.user_laboratory_access (user_id, laboratory_id, granted_at)
SELECT DISTINCT
    u.id as user_id,
    u.organization_id as laboratory_id,  -- Assuming organization_id maps to laboratory
    u.created_at as granted_at
FROM public.users u
WHERE u.organization_id IS NOT NULL
ON CONFLICT (user_id, laboratory_id) DO NOTHING;

-- Step 9: Create view for easy access
CREATE OR REPLACE VIEW public.v_user_laboratory_access AS
SELECT 
    ula.user_id,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name,
    ula.laboratory_id,
    l.name as laboratory_name,
    l.code as laboratory_code,
    ula.is_active,
    ula.granted_at,
    ula.granted_by,
    gu.email as granted_by_email
FROM public.user_laboratory_access ula
JOIN public.users u ON u.id = ula.user_id
JOIN public.laboratories l ON l.id = ula.laboratory_id
LEFT JOIN public.users gu ON gu.id = ula.granted_by;

-- Grant access to the view
GRANT SELECT ON public.v_user_laboratory_access TO authenticated;

-- Step 10: Success message
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'ORGANIZATION SELECTOR FIX DEPLOYED';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Created many-to-many relationship table';
    RAISE NOTICE '2. Added laboratory switching functions';
    RAISE NOTICE '3. Migrated existing assignments';
    RAISE NOTICE '4. Ready for UI implementation';
    RAISE NOTICE '====================================';
END $$;