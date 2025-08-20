-- Critical Transaction Management Functions for Payment Safety
-- These functions ensure atomic payment operations with proper isolation

-- Function to begin a payment transaction with serializable isolation
CREATE OR REPLACE FUNCTION begin_payment_transaction(
  transaction_id TEXT,
  isolation_level TEXT DEFAULT 'serializable'
)
RETURNS VOID AS $$
BEGIN
  -- Set transaction isolation level
  IF isolation_level = 'serializable' THEN
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  ELSIF isolation_level = 'repeatable_read' THEN
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
  ELSE
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  END IF;
  
  -- Log transaction start
  INSERT INTO audit_logs (
    table_name,
    action,
    record_id,
    changes,
    created_at
  ) VALUES (
    'transactions',
    'transaction_started',
    transaction_id,
    jsonb_build_object('isolation_level', isolation_level),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to commit a payment transaction
CREATE OR REPLACE FUNCTION commit_payment_transaction(transaction_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Log transaction commit
  INSERT INTO audit_logs (
    table_name,
    action,
    record_id,
    changes,
    created_at
  ) VALUES (
    'transactions',
    'transaction_committed',
    transaction_id,
    jsonb_build_object('committed_at', NOW()),
    NOW()
  );
  
  -- Commit is implicit in PostgreSQL when function completes successfully
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rollback a payment transaction
CREATE OR REPLACE FUNCTION rollback_payment_transaction(transaction_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Log transaction rollback
  INSERT INTO audit_logs (
    table_name,
    action,
    record_id,
    changes,
    created_at
  ) VALUES (
    'transactions',
    'transaction_rolled_back',
    transaction_id,
    jsonb_build_object('rolled_back_at', NOW()),
    NOW()
  );
  
  -- Perform rollback
  ROLLBACK;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add idempotency key column to payments table if not exists
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Add transaction_id column to payments table if not exists
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Create index on idempotency key for fast duplicate detection
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key 
ON payments(idempotency_key);

-- Create index on transaction_id for transaction tracking
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id 
ON payments(transaction_id);

-- Function to lock an invoice row for update (prevents race conditions)
CREATE OR REPLACE FUNCTION lock_invoice_for_payment(invoice_id UUID)
RETURNS TABLE (
  id UUID,
  total_amount DECIMAL,
  paid_amount DECIMAL,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.total_amount,
    i.paid_amount,
    i.status
  FROM invoices i
  WHERE i.id = invoice_id
  FOR UPDATE; -- Lock the row
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate payment allocation
CREATE OR REPLACE FUNCTION validate_payment_allocation(
  p_invoice_id UUID,
  p_amount DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invoice_total DECIMAL;
  v_paid_amount DECIMAL;
  v_remaining DECIMAL;
BEGIN
  -- Get invoice details with lock
  SELECT total_amount, COALESCE(paid_amount, 0)
  INTO v_invoice_total, v_paid_amount
  FROM invoices
  WHERE id = p_invoice_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
  END IF;
  
  -- Calculate remaining balance
  v_remaining := v_invoice_total - v_paid_amount;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive: %', p_amount;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle payment allocation with overflow (credits)
CREATE OR REPLACE FUNCTION allocate_payment_with_credits(
  p_payment_id UUID,
  p_invoice_id UUID,
  p_amount DECIMAL
)
RETURNS TABLE (
  allocated_amount DECIMAL,
  credit_amount DECIMAL
) AS $$
DECLARE
  v_invoice_total DECIMAL;
  v_paid_amount DECIMAL;
  v_remaining DECIMAL;
  v_allocated DECIMAL;
  v_credit DECIMAL;
BEGIN
  -- Get invoice details
  SELECT total_amount, COALESCE(paid_amount, 0)
  INTO v_invoice_total, v_paid_amount
  FROM invoices
  WHERE id = p_invoice_id;
  
  -- Calculate remaining balance
  v_remaining := v_invoice_total - v_paid_amount;
  
  -- Determine allocation and credit amounts
  IF p_amount > v_remaining THEN
    v_allocated := v_remaining;
    v_credit := p_amount - v_remaining;
  ELSE
    v_allocated := p_amount;
    v_credit := 0;
  END IF;
  
  -- Create allocation record
  IF v_allocated > 0 THEN
    INSERT INTO payment_allocations (
      payment_id,
      invoice_id,
      allocated_amount,
      created_at
    ) VALUES (
      p_payment_id,
      p_invoice_id,
      v_allocated,
      NOW()
    );
    
    -- Update invoice paid amount
    UPDATE invoices
    SET 
      paid_amount = paid_amount + v_allocated,
      status = CASE 
        WHEN (paid_amount + v_allocated) >= total_amount THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = NOW()
    WHERE id = p_invoice_id;
  END IF;
  
  -- Create credit record if applicable
  IF v_credit > 0 THEN
    INSERT INTO payment_credits (
      payment_id,
      credit_amount,
      remaining_credit,
      status,
      created_at
    ) VALUES (
      p_payment_id,
      v_credit,
      v_credit,
      'available',
      NOW()
    );
  END IF;
  
  RETURN QUERY SELECT v_allocated, v_credit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit_logs table if not exists
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on audit_logs for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record 
ON audit_logs(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- No one can modify audit logs (append-only)
CREATE POLICY "No one can update audit logs"
ON audit_logs FOR UPDATE
USING (false);

CREATE POLICY "No one can delete audit logs"
ON audit_logs FOR DELETE
USING (false);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);