-- Insert mock CPT mappings and fee schedules
-- Run this in your Supabase SQL Editor after the hierarchy tables are created

-- Get the laboratory ID
DO $$
DECLARE
    lab_id UUID;
    pbs_id UUID;
    schedule_id UUID;
    schedule_2025_id UUID;
BEGIN
    -- Get PBS and Laboratory IDs
    SELECT id INTO pbs_id FROM public.billing_companies WHERE code = 'PBS001';
    SELECT id INTO lab_id FROM public.laboratories WHERE code = 'LAB001';
    
    -- Insert CPT Code Mappings
    INSERT INTO public.cpt_mappings (laboratory_id, input_code, output_code, description, display_name, category, is_active) VALUES
    -- Hematology
    (lab_id, '85025', '85025', 'Complete blood count (CBC), automated with manual differential WBC count', 'CBC with Differential', 'Hematology', true),
    (lab_id, '85027', '85027', 'Complete blood count (CBC), automated', 'CBC without Differential', 'Hematology', true),
    (lab_id, '85610', '85610', 'Prothrombin time', 'PT/INR', 'Hematology', true),
    (lab_id, '85730', '85730', 'Partial thromboplastin time (PTT)', 'PTT', 'Hematology', true),
    
    -- Chemistry
    (lab_id, '80053', '80053', 'Comprehensive metabolic panel', 'CMP', 'Chemistry', true),
    (lab_id, '80048', '80048', 'Basic metabolic panel', 'BMP', 'Chemistry', true),
    (lab_id, '80061', '80061', 'Lipid panel', 'Lipid Panel', 'Chemistry', true),
    (lab_id, '84439', '84439', 'Thyroid stimulating hormone (TSH)', 'TSH', 'Chemistry', true),
    (lab_id, '84443', '84443', 'Thyroid stimulating immunoglobulin (TSI)', 'TSI', 'Chemistry', true),
    (lab_id, '82947', '82947', 'Glucose; quantitative, blood', 'Glucose', 'Chemistry', true),
    (lab_id, '83036', '83036', 'Hemoglobin A1C', 'HbA1c', 'Chemistry', true),
    (lab_id, '84484', '84484', 'Troponin, quantitative', 'Troponin I', 'Chemistry', true),
    
    -- Immunology
    (lab_id, '86900', '86900', 'Blood typing, ABO', 'ABO Blood Type', 'Immunology', true),
    (lab_id, '86901', '86901', 'Blood typing, Rh (D)', 'Rh Type', 'Immunology', true),
    (lab_id, '86886', '86886', 'Anti-neutrophil cytoplasmic antibody (ANCA)', 'ANCA', 'Immunology', true),
    (lab_id, '83718', '83718', 'Lipoprotein, blood', 'Lipoprotein(a)', 'Immunology', true),
    
    -- Microbiology
    (lab_id, '87086', '87086', 'Culture, bacterial; quantitative colony count, urine', 'Urine Culture', 'Microbiology', true),
    (lab_id, '87070', '87070', 'Culture, bacterial; any other source except urine, blood or stool', 'Bacterial Culture', 'Microbiology', true),
    (lab_id, '87106', '87106', 'Culture, fungi, definitive identification', 'Fungal Culture', 'Microbiology', true),
    (lab_id, '87340', '87340', 'Hepatitis B surface antigen (HBsAg)', 'HBsAg', 'Microbiology', true),
    
    -- Drug Testing
    (lab_id, '80305', '80305', 'Drug test(s), presumptive, any number of drug classes', 'Drug Screen', 'Toxicology', true),
    (lab_id, '80307', '80307', 'Drug test(s), presumptive, any number of drug classes, any number of devices', 'Comprehensive Drug Screen', 'Toxicology', true),
    
    -- Molecular Diagnostics
    (lab_id, '87798', '87798', 'Infectious agent detection by nucleic acid', 'PCR Test', 'Molecular', true),
    (lab_id, '87635', '87635', 'Respiratory virus panel', 'Respiratory Panel', 'Molecular', true),
    
    -- COVID-19 Tests
    (lab_id, 'U0001', '87635', 'COVID-19 RT-PCR', 'COVID-19 PCR Test', 'Molecular', true),
    (lab_id, 'U0002', '87426', 'COVID-19 Antigen', 'COVID-19 Rapid Test', 'Molecular', true),
    
    -- Custom Lab Codes to Standard CPT
    (lab_id, 'LAB001', '85025', 'Lab internal CBC code', 'CBC with Differential', 'Hematology', true),
    (lab_id, 'LAB002', '80053', 'Lab internal CMP code', 'CMP', 'Chemistry', true),
    (lab_id, 'LAB003', '87086', 'Lab internal urine culture code', 'Urine Culture', 'Microbiology', true)
    
    ON CONFLICT (laboratory_id, input_code) DO NOTHING;
    
    -- Create default fee schedule (2024)
    INSERT INTO public.fee_schedules (name, laboratory_id, start_date, end_date, is_default, is_active, created_by)
    VALUES ('2024 Standard Pricing', lab_id, '2024-01-01', '2024-12-31', true, true, auth.uid())
    RETURNING id INTO schedule_id;
    
    -- Insert fee schedule items for 2024
    INSERT INTO public.fee_schedule_items (fee_schedule_id, cpt_code, description, price, effective_date) VALUES
    -- Hematology
    (schedule_id, '85025', 'CBC with Differential', 45.50, '2024-01-01'),
    (schedule_id, '85027', 'CBC without Differential', 35.75, '2024-01-01'),
    (schedule_id, '85610', 'PT/INR', 28.90, '2024-01-01'),
    (schedule_id, '85730', 'PTT', 32.15, '2024-01-01'),
    
    -- Chemistry
    (schedule_id, '80053', 'CMP', 65.80, '2024-01-01'),
    (schedule_id, '80048', 'BMP', 42.30, '2024-01-01'),
    (schedule_id, '80061', 'Lipid Panel', 55.25, '2024-01-01'),
    (schedule_id, '84439', 'TSH', 78.40, '2024-01-01'),
    (schedule_id, '84443', 'TSI', 125.60, '2024-01-01'),
    (schedule_id, '82947', 'Glucose', 18.75, '2024-01-01'),
    (schedule_id, '83036', 'HbA1c', 68.90, '2024-01-01'),
    (schedule_id, '84484', 'Troponin I', 142.30, '2024-01-01'),
    
    -- Immunology
    (schedule_id, '86900', 'ABO Blood Type', 35.60, '2024-01-01'),
    (schedule_id, '86901', 'Rh Type', 28.40, '2024-01-01'),
    (schedule_id, '86886', 'ANCA', 185.75, '2024-01-01'),
    (schedule_id, '83718', 'Lipoprotein(a)', 95.20, '2024-01-01'),
    
    -- Microbiology
    (schedule_id, '87086', 'Urine Culture', 58.90, '2024-01-01'),
    (schedule_id, '87070', 'Bacterial Culture', 72.45, '2024-01-01'),
    (schedule_id, '87106', 'Fungal Culture', 89.30, '2024-01-01'),
    (schedule_id, '87340', 'HBsAg', 105.60, '2024-01-01'),
    
    -- Toxicology
    (schedule_id, '80305', 'Drug Screen', 95.75, '2024-01-01'),
    (schedule_id, '80307', 'Comprehensive Drug Screen', 168.40, '2024-01-01'),
    
    -- Molecular
    (schedule_id, '87798', 'PCR Test', 245.80, '2024-01-01'),
    (schedule_id, '87635', 'Respiratory Panel', 325.60, '2024-01-01'),
    (schedule_id, '87426', 'COVID-19 Rapid Test', 85.25, '2024-01-01')
    
    ON CONFLICT (fee_schedule_id, cpt_code) DO NOTHING;
    
    -- Create 2025 fee schedule with 5% increase
    INSERT INTO public.fee_schedules (name, laboratory_id, start_date, is_default, is_active, parent_schedule_id, percentage_change, created_by)
    VALUES ('2025 Pricing - 5% Increase', lab_id, '2025-01-01', false, true, schedule_id, 5.0, auth.uid())
    RETURNING id INTO schedule_2025_id;
    
    -- Insert 2025 fee schedule items with 5% increase
    INSERT INTO public.fee_schedule_items (fee_schedule_id, cpt_code, description, price, effective_date)
    SELECT 
        schedule_2025_id,
        cpt_code,
        description,
        ROUND(price * 1.05, 2) as price,
        '2025-01-01'::date
    FROM public.fee_schedule_items 
    WHERE fee_schedule_id = schedule_id;
    
    -- Insert some sample clinics with different fee schedules
    INSERT INTO public.clients (name, laboratory_id, clinic_code, address_line1, city, state, zip, phone, email, sales_rep, is_active)
    VALUES 
    ('Sunrise Senior Care', lab_id, 'SSC001', '123 Care Blvd', 'Austin', 'TX', '78701', '512-555-0101', 'billing@sunrisecare.com', 'John Smith', true),
    ('Golden Years Hospice', lab_id, 'GYH001', '456 Comfort Ave', 'Dallas', 'TX', '75201', '214-555-0202', 'accounts@goldenyears.com', 'Sarah Johnson', true),
    ('Valley Medical SNF', lab_id, 'VMS001', '789 Health Dr', 'Houston', 'TX', '77001', '713-555-0303', 'billing@valleymed.com', 'Mike Davis', true),
    ('Amedysis - Main Campus', lab_id, 'AMED001', '100 Corporate Plaza', 'Baton Rouge', 'LA', '70801', '225-555-0404', 'billing@amedisys.com', 'Lisa Williams', true)
    ON CONFLICT (clinic_code) DO NOTHING;
    
    -- Create a parent account for Amedysis with child clinics
    INSERT INTO public.parent_accounts (name, code, billing_email, billing_address, payment_terms, is_active)
    VALUES ('Amedysis Healthcare', 'AMED-CORP', 'corporate.billing@amedisys.com', '100 Corporate Plaza, Baton Rouge, LA 70801', 30, true)
    ON CONFLICT (code) DO NOTHING;
    
    -- Link Amedysis clinics to parent account
    UPDATE public.clients 
    SET parent_id = (SELECT id FROM public.parent_accounts WHERE code = 'AMED-CORP')
    WHERE clinic_code LIKE 'AMED%';
    
    -- Insert additional Amedysis child clinics
    INSERT INTO public.clients (name, laboratory_id, clinic_code, address_line1, city, state, zip, phone, email, sales_rep, is_active, parent_id)
    VALUES 
    ('Amedysis - North Clinic', lab_id, 'AMED002', '200 North Ave', 'Shreveport', 'LA', '71101', '318-555-0505', 'north@amedisys.com', 'Lisa Williams', true, (SELECT id FROM public.parent_accounts WHERE code = 'AMED-CORP')),
    ('Amedysis - East Branch', lab_id, 'AMED003', '300 East St', 'Monroe', 'LA', '71201', '318-555-0606', 'east@amedisys.com', 'Lisa Williams', true, (SELECT id FROM public.parent_accounts WHERE code = 'AMED-CORP')),
    ('Amedysis - West Division', lab_id, 'AMED004', '400 West Blvd', 'Lake Charles', 'LA', '70601', '337-555-0707', 'west@amedisys.com', 'Lisa Williams', true, (SELECT id FROM public.parent_accounts WHERE code = 'AMED-CORP'))
    ON CONFLICT (clinic_code) DO NOTHING;
    
    -- Create clinic-specific fee schedules for some high-volume clients
    INSERT INTO public.fee_schedules (name, laboratory_id, clinic_id, start_date, is_default, is_active, parent_schedule_id, percentage_change, created_by)
    VALUES 
    ('Amedysis Custom Pricing 2025', lab_id, (SELECT id FROM public.clients WHERE clinic_code = 'AMED001'), '2025-01-01', false, true, schedule_2025_id, -2.0, auth.uid()),
    ('Valley Medical Special Rates 2025', lab_id, (SELECT id FROM public.clients WHERE clinic_code = 'VMS001'), '2025-01-01', false, true, schedule_2025_id, 1.5, auth.uid())
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Mock data inserted successfully!';
    RAISE NOTICE 'Created % CPT mappings', (SELECT COUNT(*) FROM public.cpt_mappings WHERE laboratory_id = lab_id);
    RAISE NOTICE 'Created % fee schedule items for 2024', (SELECT COUNT(*) FROM public.fee_schedule_items WHERE fee_schedule_id = schedule_id);
    RAISE NOTICE 'Created % fee schedule items for 2025', (SELECT COUNT(*) FROM public.fee_schedule_items WHERE fee_schedule_id = schedule_2025_id);
    RAISE NOTICE 'Created % client clinics', (SELECT COUNT(*) FROM public.clients WHERE laboratory_id = lab_id);
    
END $$;

-- Create some missing tables that the new services will need
CREATE TABLE IF NOT EXISTS public.clinic_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    encrypted_url TEXT,
    contract_type VARCHAR(50) CHECK (contract_type IN ('service', 'pricing', 'nda', 'baa', 'other')),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending', 'terminated')),
    notes TEXT,
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ip_whitelist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    clinic_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    ip_address INET,
    ip_range_start INET,
    ip_range_end INET,
    cidr CIDR,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.security_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    clinic_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    ip_whitelist_enabled BOOLEAN DEFAULT false,
    mfa_required BOOLEAN DEFAULT false,
    session_timeout_minutes INTEGER DEFAULT 30,
    max_failed_logins INTEGER DEFAULT 5,
    password_expiry_days INTEGER DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    ip_address INET,
    tenant_id UUID,
    clinic_id UUID,
    user_id UUID,
    success BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    log_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinic_contracts_clinic ON public.clinic_contracts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_lookup ON public.ip_whitelist(tenant_id, clinic_id, is_active);
CREATE INDEX IF NOT EXISTS idx_security_logs_type ON public.security_logs(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON public.system_logs(log_type, severity, created_at);

-- Enable RLS
ALTER TABLE public.clinic_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can manage clinic contracts" ON public.clinic_contracts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage ip whitelist" ON public.ip_whitelist
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view security settings" ON public.security_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Functions for auto-deletion service
CREATE OR REPLACE FUNCTION delete_old_records(
    p_table TEXT,
    p_field TEXT,
    p_cutoff_date TIMESTAMPTZ,
    p_condition TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    sql_query TEXT;
    deleted_count INTEGER;
BEGIN
    sql_query := 'DELETE FROM ' || p_table || ' WHERE ' || p_field;
    
    IF p_cutoff_date IS NOT NULL THEN
        sql_query := sql_query || ' < ''' || p_cutoff_date || '''';
    ELSE
        sql_query := sql_query || ' < NOW()';
    END IF;
    
    IF p_condition IS NOT NULL THEN
        sql_query := sql_query || ' AND ' || p_condition;
    END IF;
    
    EXECUTE sql_query;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION soft_delete_old_records(
    p_table TEXT,
    p_field TEXT,
    p_cutoff_date TIMESTAMPTZ,
    p_condition TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    sql_query TEXT;
    updated_count INTEGER;
BEGIN
    sql_query := 'UPDATE ' || p_table || ' SET is_active = false WHERE ' || p_field;
    
    IF p_cutoff_date IS NOT NULL THEN
        sql_query := sql_query || ' < ''' || p_cutoff_date || '''';
    ELSE
        sql_query := sql_query || ' < NOW()';
    END IF;
    
    IF p_condition IS NOT NULL THEN
        sql_query := sql_query || ' AND ' || p_condition;
    END IF;
    
    EXECUTE sql_query;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default security settings
INSERT INTO public.security_settings (tenant_id, ip_whitelist_enabled, mfa_required, session_timeout_minutes)
VALUES (NULL, false, false, 30)
ON CONFLICT DO NOTHING;

SELECT 'Mock data and supporting tables created successfully!' as result;