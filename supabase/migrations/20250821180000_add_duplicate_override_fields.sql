-- Add fields to track duplicate overrides in invoice_items table
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS is_duplicate_override BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS override_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS override_at TIMESTAMPTZ;

-- Add index for finding overrides
CREATE INDEX IF NOT EXISTS idx_invoice_items_duplicate_overrides 
ON public.invoice_items(organization_id, is_duplicate_override) 
WHERE is_duplicate_override = true;

-- Add comment for documentation
COMMENT ON COLUMN public.invoice_items.is_duplicate_override IS 'True if this item was manually approved despite being a duplicate';
COMMENT ON COLUMN public.invoice_items.override_reason IS 'Business justification for approving the duplicate';
COMMENT ON COLUMN public.invoice_items.override_by IS 'User who approved the duplicate override';
COMMENT ON COLUMN public.invoice_items.override_at IS 'Timestamp when the duplicate was overridden';