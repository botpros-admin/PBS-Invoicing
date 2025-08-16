-- Create payment_credits table for overpayment tracking
CREATE TABLE IF NOT EXISTS payment_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  remaining_amount DECIMAL(10, 2) NOT NULL CHECK (remaining_amount >= 0),
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'applied', 'expired', 'refunded')),
  applied_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  applied_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_payment_credits_client_id ON payment_credits(client_id);
CREATE INDEX idx_payment_credits_payment_id ON payment_credits(payment_id);
CREATE INDEX idx_payment_credits_status ON payment_credits(status);
CREATE INDEX idx_payment_credits_remaining_amount ON payment_credits(remaining_amount) WHERE remaining_amount > 0;

-- Create credit_applications table to track how credits are applied
CREATE TABLE IF NOT EXISTS credit_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_id UUID REFERENCES payment_credits(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount_applied DECIMAL(10, 2) NOT NULL CHECK (amount_applied > 0),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Create indexes
CREATE INDEX idx_credit_applications_credit_id ON credit_applications(credit_id);
CREATE INDEX idx_credit_applications_invoice_id ON credit_applications(invoice_id);

-- Add RLS policies for payment_credits
ALTER TABLE payment_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view credits for their organization"
  ON payment_credits FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE organization_id = auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  );

CREATE POLICY "Users can create credits for their organization"
  ON payment_credits FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients 
      WHERE organization_id = auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  );

CREATE POLICY "Users can update credits for their organization"
  ON payment_credits FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE organization_id = auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  );

-- Add RLS policies for credit_applications
ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view credit applications for their organization"
  ON credit_applications FOR SELECT
  TO authenticated
  USING (
    credit_id IN (
      SELECT id FROM payment_credits 
      WHERE client_id IN (
        SELECT id FROM clients 
        WHERE organization_id = auth.jwt() -> 'app_metadata' ->> 'organization_id'
      )
    )
  );

CREATE POLICY "Users can create credit applications for their organization"
  ON credit_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    credit_id IN (
      SELECT id FROM payment_credits 
      WHERE client_id IN (
        SELECT id FROM clients 
        WHERE organization_id = auth.jwt() -> 'app_metadata' ->> 'organization_id'
      )
    )
  );

-- Function to automatically apply credits to new invoices
CREATE OR REPLACE FUNCTION apply_available_credits_to_invoice()
RETURNS TRIGGER AS $$
DECLARE
  available_credit RECORD;
  remaining_balance DECIMAL(10, 2);
  amount_to_apply DECIMAL(10, 2);
BEGIN
  -- Only apply credits if invoice is not fully paid
  IF NEW.balance_due > 0 THEN
    remaining_balance := NEW.balance_due;
    
    -- Find available credits for this client
    FOR available_credit IN 
      SELECT * FROM payment_credits 
      WHERE client_id = NEW.client_id 
        AND status = 'available' 
        AND remaining_amount > 0
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at ASC
    LOOP
      -- Calculate amount to apply
      amount_to_apply := LEAST(available_credit.remaining_amount, remaining_balance);
      
      -- Update credit remaining amount
      UPDATE payment_credits 
      SET 
        remaining_amount = remaining_amount - amount_to_apply,
        status = CASE 
          WHEN remaining_amount - amount_to_apply = 0 THEN 'applied'
          ELSE 'available'
        END,
        updated_at = NOW()
      WHERE id = available_credit.id;
      
      -- Record the application
      INSERT INTO credit_applications (credit_id, invoice_id, amount_applied, applied_by)
      VALUES (available_credit.id, NEW.id, amount_to_apply, auth.uid());
      
      -- Update invoice balance
      remaining_balance := remaining_balance - amount_to_apply;
      
      -- Exit if invoice is fully paid
      EXIT WHEN remaining_balance = 0;
    END LOOP;
    
    -- Update invoice with new balance
    IF remaining_balance < NEW.balance_due THEN
      NEW.balance_due := remaining_balance;
      NEW.paid_amount := COALESCE(NEW.paid_amount, 0) + (NEW.balance_due - remaining_balance);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-apply credits (optional - can be disabled if manual control preferred)
-- CREATE TRIGGER auto_apply_credits_to_invoice
--   BEFORE INSERT OR UPDATE ON invoices
--   FOR EACH ROW
--   EXECUTE FUNCTION apply_available_credits_to_invoice();

-- Function to create credit from overpayment
CREATE OR REPLACE FUNCTION create_credit_from_overpayment(
  p_payment_id UUID,
  p_client_id UUID,
  p_overpayment_amount DECIMAL(10, 2),
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  credit_id UUID;
BEGIN
  INSERT INTO payment_credits (
    payment_id,
    client_id,
    amount,
    remaining_amount,
    status,
    notes,
    created_by
  ) VALUES (
    p_payment_id,
    p_client_id,
    p_overpayment_amount,
    p_overpayment_amount,
    'available',
    p_notes,
    auth.uid()
  ) RETURNING id INTO credit_id;
  
  RETURN credit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to manually apply credit to invoice
CREATE OR REPLACE FUNCTION apply_credit_to_invoice(
  p_credit_id UUID,
  p_invoice_id UUID,
  p_amount DECIMAL(10, 2) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  credit_record RECORD;
  invoice_record RECORD;
  amount_to_apply DECIMAL(10, 2);
BEGIN
  -- Get credit details
  SELECT * INTO credit_record FROM payment_credits 
  WHERE id = p_credit_id AND status = 'available' AND remaining_amount > 0;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit not found or not available';
  END IF;
  
  -- Get invoice details
  SELECT * INTO invoice_record FROM invoices 
  WHERE id = p_invoice_id AND balance_due > 0;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found or already paid';
  END IF;
  
  -- Verify same client
  IF credit_record.client_id != invoice_record.client_id THEN
    RAISE EXCEPTION 'Credit and invoice belong to different clients';
  END IF;
  
  -- Calculate amount to apply
  amount_to_apply := COALESCE(
    p_amount,
    LEAST(credit_record.remaining_amount, invoice_record.balance_due)
  );
  
  -- Validate amount
  IF amount_to_apply > credit_record.remaining_amount THEN
    RAISE EXCEPTION 'Amount exceeds available credit';
  END IF;
  
  IF amount_to_apply > invoice_record.balance_due THEN
    RAISE EXCEPTION 'Amount exceeds invoice balance';
  END IF;
  
  -- Update credit
  UPDATE payment_credits 
  SET 
    remaining_amount = remaining_amount - amount_to_apply,
    status = CASE 
      WHEN remaining_amount - amount_to_apply = 0 THEN 'applied'
      ELSE 'available'
    END,
    applied_to_invoice_id = p_invoice_id,
    applied_at = NOW(),
    updated_at = NOW()
  WHERE id = p_credit_id;
  
  -- Record application
  INSERT INTO credit_applications (credit_id, invoice_id, amount_applied, applied_by)
  VALUES (p_credit_id, p_invoice_id, amount_to_apply, auth.uid());
  
  -- Update invoice
  UPDATE invoices 
  SET 
    paid_amount = COALESCE(paid_amount, 0) + amount_to_apply,
    balance_due = balance_due - amount_to_apply,
    status = CASE 
      WHEN balance_due - amount_to_apply = 0 THEN 'paid'
      WHEN balance_due - amount_to_apply < total_amount THEN 'partial'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_invoice_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;