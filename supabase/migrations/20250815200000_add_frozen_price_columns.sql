-- ================================================
-- ADD FROZEN PRICE COLUMNS FOR INVOICE FINALIZATION
-- ================================================
-- These columns store the prices at the time of finalization
-- to prevent changes when pricing rules are updated
-- ================================================

-- Add frozen price columns to invoices table
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS frozen_subtotal DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS frozen_tax_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS frozen_total_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id);

-- Add frozen price columns to invoice_items table
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS frozen_unit_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS frozen_line_total DECIMAL(12,2);

-- Create index for finalized invoices
CREATE INDEX IF NOT EXISTS idx_invoices_finalized_at ON invoices(finalized_at) WHERE finalized_at IS NOT NULL;

-- Add comment explaining the frozen columns
COMMENT ON COLUMN invoices.frozen_subtotal IS 'Subtotal at time of finalization - immutable after invoice is sent';
COMMENT ON COLUMN invoices.frozen_tax_amount IS 'Tax amount at time of finalization - immutable after invoice is sent';
COMMENT ON COLUMN invoices.frozen_total_amount IS 'Total amount at time of finalization - immutable after invoice is sent';
COMMENT ON COLUMN invoices.finalized_at IS 'Timestamp when invoice was finalized (moved from draft to sent status)';
COMMENT ON COLUMN invoices.finalized_by IS 'User who finalized the invoice';

COMMENT ON COLUMN invoice_items.frozen_unit_price IS 'Unit price at time of invoice finalization - immutable after invoice is sent';
COMMENT ON COLUMN invoice_items.frozen_line_total IS 'Line total at time of invoice finalization - immutable after invoice is sent';

-- Create function to freeze prices when invoice is finalized
CREATE OR REPLACE FUNCTION freeze_invoice_prices()
RETURNS TRIGGER AS $$
BEGIN
  -- Only freeze prices when transitioning from draft to sent
  IF OLD.status = 'draft' AND NEW.status = 'sent' AND OLD.frozen_total_amount IS NULL THEN
    -- Freeze the invoice totals
    NEW.frozen_subtotal = NEW.subtotal;
    NEW.frozen_tax_amount = NEW.tax_amount;
    NEW.frozen_total_amount = NEW.total_amount;
    NEW.finalized_at = NOW();
    
    -- Update invoice items with frozen prices
    UPDATE invoice_items
    SET 
      frozen_unit_price = unit_price,
      frozen_line_total = line_total
    WHERE invoice_id = NEW.id
      AND frozen_unit_price IS NULL;
  END IF;
  
  -- Use frozen prices for calculations if they exist
  IF NEW.frozen_total_amount IS NOT NULL THEN
    NEW.balance_due = NEW.frozen_total_amount - NEW.paid_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically freeze prices on status change
DROP TRIGGER IF EXISTS freeze_invoice_prices_trigger ON invoices;
CREATE TRIGGER freeze_invoice_prices_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION freeze_invoice_prices();

-- Update existing sent/paid invoices to have frozen prices
-- This ensures backward compatibility
UPDATE invoices
SET 
  frozen_subtotal = subtotal,
  frozen_tax_amount = tax_amount,
  frozen_total_amount = total_amount,
  finalized_at = COALESCE(sent_at, updated_at)
WHERE status IN ('sent', 'viewed', 'partial', 'paid', 'overdue', 'disputed')
  AND frozen_total_amount IS NULL;

UPDATE invoice_items
SET 
  frozen_unit_price = unit_price,
  frozen_line_total = line_total
WHERE invoice_id IN (
  SELECT id FROM invoices 
  WHERE status IN ('sent', 'viewed', 'partial', 'paid', 'overdue', 'disputed')
)
  AND frozen_unit_price IS NULL;