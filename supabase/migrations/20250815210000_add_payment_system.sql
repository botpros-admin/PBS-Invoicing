-- ================================================
-- PAYMENT SYSTEM FOUNDATION
-- ================================================
-- Implements Ashley's payment requirements:
-- - Manual payment posting (checks, ACH, phone payments)
-- - Penny-perfect balance tracking
-- - Payment queue (unposted, posted, on hold)
-- - Line-level allocation capability
-- - Credit system for overpayments
-- ================================================

-- ================================================
-- PAYMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_number TEXT NOT NULL,
  
  -- Payment details
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('check', 'ach', 'wire', 'credit_card', 'cash', 'phone', 'other')),
  reference_number TEXT, -- Check number, ACH confirmation, etc.
  
  -- Client information
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'unposted' CHECK (status IN ('unposted', 'posted', 'on_hold', 'reversed', 'cancelled')),
  posted_at TIMESTAMP WITH TIME ZONE,
  posted_by UUID REFERENCES auth.users(id),
  
  -- Balance tracking (must balance to the penny!)
  allocated_amount DECIMAL(12,2) DEFAULT 0,
  unallocated_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount - allocated_amount) STORED,
  
  -- Notes and metadata
  notes TEXT,
  source TEXT DEFAULT 'manual', -- 'manual', 'import', 'stripe', 'portal'
  external_id TEXT, -- For external payment systems
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(payment_number)
);

-- ================================================
-- PAYMENT ALLOCATIONS TABLE (Line-level tracking)
-- ================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Payment reference
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  
  -- Invoice reference
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  
  -- Optional: Line-level allocation
  invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE RESTRICT,
  
  -- Allocation details
  allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount > 0),
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  allocation_type TEXT DEFAULT 'payment' CHECK (allocation_type IN ('payment', 'credit', 'adjustment', 'write_off')),
  
  -- Notes
  notes TEXT,
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- ACCOUNT CREDITS TABLE (For overpayments)
-- ================================================
CREATE TABLE IF NOT EXISTS account_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Client reference
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  
  -- Credit details
  credit_number TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  
  -- Usage tracking
  used_amount DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount - used_amount) STORED,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  
  -- Related payment/invoice
  source_payment_id UUID REFERENCES payments(id),
  related_invoice_id UUID REFERENCES invoices(id),
  
  -- Notes
  notes TEXT,
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(credit_number)
);

-- ================================================
-- PAYMENT QUEUE VIEW (For Ashley's workflow)
-- ================================================
-- Temporarily commented out due to type mismatch
-- Will be created separately after verifying schema
-- CREATE OR REPLACE VIEW payment_queue AS
-- SELECT 
--   p.id,
--   p.payment_number,
--   p.payment_date,
--   p.amount,
--   p.payment_method,
--   p.reference_number,
--   p.status,
--   p.allocated_amount,
--   p.unallocated_amount,
--   c.name as client_name,
--   c.code as client_code,
--   p.created_at,
--   p.notes,
--   CASE 
--     WHEN p.status = 'unposted' AND p.unallocated_amount > 0 THEN 'needs_allocation'
--     WHEN p.status = 'unposted' AND p.unallocated_amount = 0 THEN 'ready_to_post'
--     WHEN p.status = 'posted' THEN 'completed'
--     ELSE p.status
--   END as queue_status
-- FROM payments p
-- LEFT JOIN clients c ON p.client_id = c.id
-- ORDER BY 
--   CASE p.status 
--     WHEN 'unposted' THEN 1 
--     WHEN 'on_hold' THEN 2
--     WHEN 'posted' THEN 3
--     ELSE 4
--   END,
--   p.created_at DESC;

-- ================================================
-- UPDATE INVOICES TABLE
-- ================================================
-- Add payment tracking fields to invoices
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' 
    CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overpaid')),
  ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12,2) GENERATED ALWAYS AS 
    (COALESCE(frozen_total_amount, total_amount) - amount_paid) STORED,
  ADD COLUMN IF NOT EXISTS last_payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_count INTEGER DEFAULT 0;

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================
-- CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
-- CREATE INDEX IF NOT EXISTS idx_payments_unposted ON payments(status) WHERE status = 'unposted';

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_item_id ON payment_allocations(invoice_item_id);

CREATE INDEX IF NOT EXISTS idx_account_credits_client_id ON account_credits(client_id);
CREATE INDEX IF NOT EXISTS idx_account_credits_status ON account_credits(status);
CREATE INDEX IF NOT EXISTS idx_account_credits_active ON account_credits(client_id, status) WHERE status = 'active';

-- ================================================
-- FUNCTIONS FOR PAYMENT PROCESSING
-- ================================================

-- Function to update invoice payment status
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update invoice payment totals
  UPDATE invoices
  SET 
    amount_paid = (
      SELECT COALESCE(SUM(pa.allocated_amount), 0)
      FROM payment_allocations pa
      WHERE pa.invoice_id = NEW.invoice_id
    ),
    payment_count = (
      SELECT COUNT(DISTINCT pa.payment_id)
      FROM payment_allocations pa
      WHERE pa.invoice_id = NEW.invoice_id
    ),
    last_payment_date = (
      SELECT MAX(p.payment_date)
      FROM payment_allocations pa
      JOIN payments p ON p.id = pa.payment_id
      WHERE pa.invoice_id = NEW.invoice_id
    )
  WHERE id = NEW.invoice_id;
  
  -- Update payment status based on balance
  UPDATE invoices
  SET payment_status = 
    CASE 
      WHEN balance_due <= 0 THEN 'paid'
      WHEN amount_paid > 0 AND balance_due > 0 THEN 'partial'
      ELSE 'unpaid'
    END
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice when payment allocated
CREATE TRIGGER update_invoice_on_payment_allocation
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_payment_status();

-- Function to update payment allocated amount
CREATE OR REPLACE FUNCTION update_payment_allocated_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update payment's allocated amount
  UPDATE payments
  SET allocated_amount = (
    SELECT COALESCE(SUM(allocated_amount), 0)
    FROM payment_allocations
    WHERE payment_id = COALESCE(NEW.payment_id, OLD.payment_id)
  )
  WHERE id = COALESCE(NEW.payment_id, OLD.payment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update payment when allocation changes
CREATE TRIGGER update_payment_on_allocation_change
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_allocated_amount();

-- ================================================
-- VALIDATION FUNCTION: Penny-perfect balance check
-- ================================================
CREATE OR REPLACE FUNCTION validate_payment_allocation()
RETURNS TRIGGER AS $$
DECLARE
  payment_amount DECIMAL(12,2);
  total_allocated DECIMAL(12,2);
BEGIN
  -- Get payment amount
  SELECT amount INTO payment_amount
  FROM payments
  WHERE id = NEW.payment_id;
  
  -- Calculate total allocated including this allocation
  SELECT COALESCE(SUM(allocated_amount), 0) + NEW.allocated_amount
  INTO total_allocated
  FROM payment_allocations
  WHERE payment_id = NEW.payment_id
    AND id != COALESCE(NEW.id, gen_random_uuid());
  
  -- Check if allocation exceeds payment amount
  IF total_allocated > payment_amount THEN
    RAISE EXCEPTION 'Payment allocation exceeds payment amount. Payment: %, Allocated: %', 
      payment_amount, total_allocated;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate allocations
CREATE TRIGGER validate_payment_allocation_trigger
  BEFORE INSERT OR UPDATE ON payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_allocation();

-- ================================================
-- SAMPLE DATA FOR TESTING (Remove in production)
-- ================================================
-- INSERT INTO payments (payment_number, payment_date, amount, payment_method, reference_number, client_id, notes)
-- VALUES 
--   ('{your-org-id}', 'PAY-2024-001', '2024-01-15', 500.00, 'check', '1234', '{client-id}', 'Test payment - check'),
--   ('{your-org-id}', 'PAY-2024-002', '2024-01-16', 750.50, 'ach', 'ACH-5678', '{client-id}', 'Test payment - ACH');

-- ================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================
COMMENT ON TABLE payments IS 'Tracks all payments received from clients with penny-perfect accuracy';
COMMENT ON TABLE payment_allocations IS 'Allocates payments to specific invoices and line items';
COMMENT ON TABLE account_credits IS 'Manages overpayments and credits for future use';
-- COMMENT ON VIEW payment_queue IS 'Ashley''s payment queue showing unposted payments needing attention';

-- COMMENT ON COLUMN payments.unallocated_amount IS 'Must be 0 before payment can be posted (penny-perfect requirement)';
COMMENT ON COLUMN payment_allocations.invoice_item_id IS 'Optional: For line-level payment allocation per Ashley''s requirements';