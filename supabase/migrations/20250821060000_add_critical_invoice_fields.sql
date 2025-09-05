-- ================================================
-- Migration: Add Critical Fields for Laboratory Billing
-- Date: 2025-08-21
-- Purpose: Transform invoice_items to support laboratory billing requirements
-- ================================================

-- 1. Add patient information fields to invoice_items
-- These are essential for laboratory billing where each line item represents a different patient
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS patient_first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS patient_last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS patient_dob DATE,
ADD COLUMN IF NOT EXISTS patient_mrn VARCHAR(50), -- Medical Record Number
ADD COLUMN IF NOT EXISTS patient_insurance_id VARCHAR(50);

-- 2. Add units field (keep quantity for backward compatibility)
-- Units is critical for mileage and quantity-based billing
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS units DECIMAL(10, 2);

-- 3. Migrate existing quantity data to units
UPDATE public.invoice_items
SET units = quantity::DECIMAL(10, 2)
WHERE units IS NULL;

-- 4. Add invoice type field for separation (SNF, Invalids, Hospice, Regular)
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'Regular';

-- 5. Add dispute tracking fields at line item level
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS dispute_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispute_resolved_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispute_resolution TEXT;

-- 6. Add fields for duplicate prevention
-- Create unique constraint on accession_number + cpt_code per organization
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS is_duplicate_override BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS duplicate_override_reason TEXT,
ADD COLUMN IF NOT EXISTS duplicate_override_by UUID,
ADD COLUMN IF NOT EXISTS duplicate_override_date TIMESTAMPTZ;

-- Create unique index for duplicate prevention (when not overridden)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_items_accession_cpt_unique
ON public.invoice_items (organization_id, accession_number, cpt_code)
WHERE is_duplicate_override = FALSE;

-- 7. Add import tracking fields
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS import_batch_id UUID,
ADD COLUMN IF NOT EXISTS import_row_number INT,
ADD COLUMN IF NOT EXISTS import_status VARCHAR(50) DEFAULT 'success',
ADD COLUMN IF NOT EXISTS import_error_message TEXT;

-- 8. Create index for performance on large datasets (10,000+ lines)
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id_service_date 
ON public.invoice_items (invoice_id, service_date);

CREATE INDEX IF NOT EXISTS idx_invoice_items_accession_number 
ON public.invoice_items (accession_number);

CREATE INDEX IF NOT EXISTS idx_invoice_items_patient_last_name 
ON public.invoice_items (patient_last_name);

CREATE INDEX IF NOT EXISTS idx_invoice_items_import_batch 
ON public.invoice_items (import_batch_id) 
WHERE import_batch_id IS NOT NULL;

-- 9. Create dispute_tickets table for full dispute workflow
CREATE TABLE IF NOT EXISTS public.dispute_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    invoice_item_id UUID NOT NULL REFERENCES public.invoice_items(id),
    ticket_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, in_review, resolved, closed
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, critical
    
    -- Dispute details
    reason_category VARCHAR(100), -- pricing, service_not_rendered, duplicate, other
    reason_details TEXT NOT NULL,
    disputed_amount DECIMAL(12, 2),
    
    -- Communication
    client_visible_notes TEXT,
    internal_notes TEXT,
    
    -- Resolution
    resolution_type VARCHAR(50), -- accepted, rejected, partial
    resolution_amount DECIMAL(12, 2),
    resolution_notes TEXT,
    
    -- Tracking
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_to UUID,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- Prevent duplicate disputes
    UNIQUE(invoice_item_id, status)
);

-- 10. Create parent-child relationship for healthcare providers
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS parent_client_id UUID REFERENCES public.clients(id),
ADD COLUMN IF NOT EXISTS is_parent_account BOOLEAN DEFAULT FALSE;

-- Create index for parent-child queries
CREATE INDEX IF NOT EXISTS idx_clients_parent_id 
ON public.clients (parent_client_id) 
WHERE parent_client_id IS NOT NULL;

-- 11. Add comments for documentation
COMMENT ON COLUMN public.invoice_items.accession_number IS 'Primary laboratory identifier - unique per sample';
COMMENT ON COLUMN public.invoice_items.units IS 'Quantity/mileage units for billing (replaces quantity)';
COMMENT ON COLUMN public.invoice_items.patient_mrn IS 'Medical Record Number for patient identification';
COMMENT ON COLUMN public.invoice_items.invoice_type IS 'SNF, Invalids, Hospice, or Regular for invoice separation';
COMMENT ON COLUMN public.dispute_tickets.ticket_number IS 'Unique ticket ID for tracking disputes';

-- 12. Update RLS policies for new dispute_tickets table
ALTER TABLE public.dispute_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_tickets_tenant_isolation" ON public.dispute_tickets
    FOR ALL
    USING (
        organization_id = current_user_org_id()
        OR is_super_admin()
    );

-- 13. Grant permissions
GRANT ALL ON public.dispute_tickets TO authenticated;
GRANT ALL ON public.dispute_tickets TO service_role;

-- ================================================
-- END OF MIGRATION
-- ================================================