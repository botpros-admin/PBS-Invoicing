-- Generate 50 Mock Invoices for PBS Invoicing Application (Simplified Version)
-- This script adds 50 diverse invoices with related items to the database

-- Variables for invoice generation
DO $$
DECLARE
    invoice_id INTEGER;
    client_id INTEGER;
    clinic_id INTEGER;
    patient_id INTEGER;
    cpt_id INTEGER;
    cpt_ids INTEGER[];
    invoice_number TEXT;
    reference_number TEXT;
    invoice_date DATE;
    due_date DATE;
    service_date DATE;
    item_id INTEGER;
    status_options TEXT[] := ARRAY['draft', 'sent', 'partial', 'paid', 'dispute', 'write_off', 'exhausted', 'cancelled'];
    status_val invoice_status;
    rand_value DECIMAL;
    reason_options TEXT[] := ARRAY['routine', 'followup', 'emergency', 'consultation', 'screening', 'hospice', 'preventive', null];
    reason TEXT;
    priority_options TEXT[] := ARRAY['low', 'normal', 'high', 'urgent'];
    priority_val priority;
    dispute_bool BOOLEAN;
    subtotal_val DECIMAL := 0;
    total_val DECIMAL := 0;
    amount_paid_val DECIMAL := 0;
    balance_val DECIMAL := 0;
    payment_id INTEGER;
    payment_method_val payment_method;
    client_count INTEGER;
    clinic_count INTEGER;
    patient_count INTEGER;
    cpt_count INTEGER;
BEGIN
    -- Check if we have sufficient base data
    SELECT COUNT(*) INTO client_count FROM public.clients;
    SELECT COUNT(*) INTO clinic_count FROM public.clinics;
    SELECT COUNT(*) INTO patient_count FROM public.patients;
    SELECT COUNT(*) INTO cpt_count FROM public.cpt_codes;
    
    IF client_count < 1 OR clinic_count < 1 OR patient_count < 1 OR cpt_count < 5 THEN
        RAISE EXCEPTION 'Insufficient base data. Please ensure you have clients, clinics, patients, and CPT codes.';
    END IF;
    
    -- Get the next invoice ID
    SELECT COALESCE(MAX(id), 0) + 1 INTO invoice_id FROM public.invoices;
    
    -- Get available cpt_code IDs
    SELECT array_agg(id) INTO cpt_ids FROM public.cpt_codes;
    
    -- Create 50 invoices
    FOR i IN 1..50 LOOP
        -- Select random client, clinic, and patient
        DECLARE
            temp_id INTEGER;
        BEGIN
            -- First get random client
            SELECT id INTO temp_id FROM public.clients ORDER BY random() LIMIT 1;
            client_id := temp_id;
            
            -- Then try to find a clinic for this client
            SELECT c.id INTO clinic_id 
            FROM public.clinics c 
            WHERE c.client_id = temp_id
            ORDER BY random() LIMIT 1;
        END;
        
        IF clinic_id IS NULL THEN
            -- If no matching clinic exists, just select any clinic
            SELECT id INTO clinic_id FROM public.clinics ORDER BY random() LIMIT 1;
        END IF;
        
        SELECT id INTO patient_id FROM public.patients ORDER BY random() LIMIT 1;
        
        -- Reset financial values for this invoice
        subtotal_val := 0;
        total_val := 0;
        amount_paid_val := 0;
        balance_val := 0;
        
        -- Generate invoice data
        invoice_number := 'INV-2025-' || LPAD(invoice_id::TEXT, 4, '0');
        reference_number := CASE WHEN random() > 0.7 THEN 'REF-' || LPAD((1000 + floor(random() * 9000))::TEXT, 4, '0') ELSE NULL END;
        invoice_date := CURRENT_DATE - (floor(random() * 180)::INTEGER || ' days')::INTERVAL;
        due_date := invoice_date + (30 || ' days')::INTERVAL;
        
        -- Set status and priority with proper casting
        status_val := status_options[1 + floor(random() * array_length(status_options, 1))::INTEGER]::invoice_status;
        reason := reason_options[1 + floor(random() * array_length(reason_options, 1))::INTEGER];
        priority_val := priority_options[1 + floor(random() * array_length(priority_options, 1))::INTEGER]::priority;
        
        -- Insert invoice with minimal data first
        INSERT INTO public.invoices (
            id, uuid, client_id, clinic_id, patient_id, 
            invoice_number, reference_number, date_created, date_due,
            status, reason_type, priority, notes
        ) VALUES (
            invoice_id, gen_random_uuid(), client_id, clinic_id, patient_id,
            invoice_number, reference_number, invoice_date, due_date,
            status_val, reason, priority_val,
            CASE WHEN random() > 0.7 THEN 'Invoice notes for ' || invoice_number || '. Generated for testing purposes.' ELSE NULL END
        );
        
        -- Create 1-5 invoice items
        FOR j IN 1..(1 + floor(random() * 4)::INTEGER) LOOP
            -- Get next item ID
            SELECT COALESCE(MAX(id), 0) + 1 INTO item_id FROM public.invoice_items;
            
            -- Select random CPT code
            SELECT id INTO cpt_id FROM public.cpt_codes ORDER BY random() LIMIT 1;
            
            -- Generate item data
            service_date := invoice_date - (floor(random() * 14)::INTEGER || ' days')::INTERVAL;
            rand_value := (50 + floor(random() * 150)) + random();
            rand_value := round(rand_value::numeric, 2);
            dispute_bool := CASE WHEN random() > 0.9 THEN TRUE ELSE FALSE END;
            
            -- Insert invoice item
            INSERT INTO public.invoice_items (
                id, invoice_id, cpt_code_id, description, date_of_service,
                quantity, unit_price, total, is_disputed, medical_necessity_provided
            ) 
            SELECT 
                item_id, invoice_id, cpt_id, description, service_date,
                1, rand_value, rand_value, dispute_bool,
                CASE WHEN random() > 0.5 THEN TRUE ELSE FALSE END
            FROM public.cpt_codes
            WHERE id = cpt_id;
            
            -- Add to subtotal
            subtotal_val := subtotal_val + rand_value;
        END LOOP;
        
        -- Set financial values
        total_val := subtotal_val;
        
        -- Set amount paid based on status
        IF status_val = 'paid' THEN
            amount_paid_val := total_val;
            balance_val := 0;
        ELSIF status_val = 'partial' THEN
            amount_paid_val := round((random() * total_val)::numeric, 2);
            balance_val := total_val - amount_paid_val;
        ELSE
            amount_paid_val := 0;
            balance_val := total_val;
        END IF;
        
        -- Update invoice with financial data
        UPDATE public.invoices
        SET 
            subtotal = subtotal_val,
            total = total_val,
            amount_paid = amount_paid_val,
            balance = balance_val,
            updated_at = now()
        WHERE id = invoice_id;
        
        -- Add payment record if amount_paid > 0
        IF amount_paid_val > 0 THEN
            -- Get next payment ID
            SELECT COALESCE(MAX(id), 0) + 1 INTO payment_id FROM public.payments;
            
            -- Select random payment method with proper casting
            SELECT (CASE floor(random() * 4)::INTEGER
                WHEN 0 THEN 'credit_card'::payment_method
                WHEN 1 THEN 'check'::payment_method
                WHEN 2 THEN 'ach'::payment_method
                ELSE 'other'::payment_method
            END) INTO payment_method_val;
            
            -- Insert payment
            INSERT INTO public.payments (
                id, client_id, payment_number, payment_date, amount, method,
                reference_number, status, reconciliation_status, created_by_user_id
            ) VALUES (
                payment_id,
                client_id,
                'PMT-' || LPAD(invoice_id::TEXT, 4, '0'),
                CASE WHEN status_val = 'paid' THEN invoice_date + (floor(random() * 20)::INTEGER || ' days')::INTERVAL
                     ELSE invoice_date + (floor(random() * 10)::INTEGER || ' days')::INTERVAL END,
                amount_paid_val,
                payment_method_val,
                'REF-' || LPAD((1000 + floor(random() * 9000))::TEXT, 4, '0'),
                'received',
                'fully_reconciled',
                1 -- Using the existing user ID we found in the public.users table
            );
        END IF;
        
        -- Increment invoice ID for next iteration
        invoice_id := invoice_id + 1;
    END LOOP;
    
    RAISE NOTICE 'Successfully generated 50 mock invoices with related items and payments.';
END $$;
