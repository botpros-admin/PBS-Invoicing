-- Fix Invoice Totals Calculation Migration
-- This migration:
-- 1. Updates all NULL invoice totals by calculating from invoice_items
-- 2. Creates a trigger to automatically maintain invoice totals
-- 3. Ensures balance field is calculated correctly

-- First, drop any existing triggers that might conflict
DROP TRIGGER IF EXISTS update_invoice_totals_on_items ON invoice_items;
DROP FUNCTION IF EXISTS calculate_invoice_totals() CASCADE;

-- Update existing NULL totals from invoice_items
-- Note: Using both 'total' and 'total_amount' columns as they both exist
-- line_total is a generated column (quantity * unit_price)
UPDATE invoices 
SET 
  total = COALESCE((
    SELECT SUM(line_total)
    FROM invoice_items 
    WHERE invoice_id = invoices.id
  ), 0),
  total_amount = COALESCE((
    SELECT SUM(line_total)
    FROM invoice_items 
    WHERE invoice_id = invoices.id
  ), 0),
  subtotal = COALESCE((
    SELECT SUM(line_total)
    FROM invoice_items 
    WHERE invoice_id = invoices.id
  ), 0)
WHERE total IS NULL OR total_amount IS NULL OR subtotal IS NULL;

-- Note: balance_due is a generated column, so it will auto-update when total or paid_amount changes
-- No need to manually update balance_due

-- Create the trigger function to maintain invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id uuid;
BEGIN
  -- Determine which invoice_id to use
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;
  
  -- Update invoice totals (both columns for compatibility)
  -- line_total is a generated column (quantity * unit_price)
  UPDATE invoices 
  SET 
    total = COALESCE((
      SELECT SUM(line_total)
      FROM invoice_items 
      WHERE invoice_id = v_invoice_id
    ), 0),
    total_amount = COALESCE((
      SELECT SUM(line_total)
      FROM invoice_items 
      WHERE invoice_id = v_invoice_id
    ), 0),
    subtotal = COALESCE((
      SELECT SUM(line_total)
      FROM invoice_items 
      WHERE invoice_id = v_invoice_id
    ), 0),
    updated_at = NOW()
  WHERE id = v_invoice_id;
  
  -- Note: balance_due is a generated column and will auto-update
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice_items changes
CREATE TRIGGER update_invoice_totals_on_items
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_totals();

-- No need for balance trigger since balance_due is a generated column
-- It will automatically update when total_amount or paid_amount changes

-- Add comments for documentation
COMMENT ON FUNCTION calculate_invoice_totals() IS 'Automatically calculates and updates invoice totals when invoice_items change';