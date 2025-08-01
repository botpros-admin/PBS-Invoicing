-- Generate additional patients for PBS Invoicing Application
-- This script adds 20 more patients to provide a more diverse dataset for invoices

DO $$
DECLARE
    patient_id INTEGER;
    client_ids INTEGER[];
    selected_client_id INTEGER;
    first_names TEXT[] := ARRAY['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah', 'Thomas', 'Karen', 'Charles', 'Nancy', 'Christopher', 'Lisa', 'Daniel', 'Margaret', 'Matthew', 'Betty', 'Anthony', 'Sandra', 'Mark', 'Ashley', 'Donald', 'Kimberly', 'Steven', 'Emily', 'Paul', 'Donna', 'Andrew', 'Michelle', 'Joshua', 'Dorothy'];
    last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'];
    first_name TEXT;
    last_name TEXT;
    dob DATE;
    mrn TEXT;
BEGIN
    -- Get the current max patient ID
    SELECT COALESCE(MAX(id), 0) + 1 INTO patient_id FROM public.patients;
    
    -- Get all client IDs
    SELECT array_agg(id) INTO client_ids FROM public.clients;
    
    -- Create 20 patients
    FOR i IN 1..20 LOOP
        -- Select random name
        first_name := first_names[1 + floor(random() * array_length(first_names, 1))::INTEGER];
        last_name := last_names[1 + floor(random() * array_length(last_names, 1))::INTEGER];
        
        -- Create a random DOB (between 18 and 90 years old)
        dob := CURRENT_DATE - ((18 + floor(random() * 72)::INTEGER) * 365 || ' days')::INTERVAL;
        
        -- Select random client
        selected_client_id := client_ids[1 + floor(random() * array_length(client_ids, 1))::INTEGER];
        
        -- Create unique MRN
        mrn := 'MRN' || LPAD(patient_id::TEXT, 6, '0');
        
        -- Insert patient
        INSERT INTO public.patients (
            id,
            uuid,
            client_id,
            first_name,
            last_name,
            dob,
            mrn,
            is_active
        ) VALUES (
            patient_id,
            gen_random_uuid(),
            selected_client_id,
            first_name,
            last_name,
            dob,
            mrn,
            TRUE
        );
        
        -- Increment patient ID
        patient_id := patient_id + 1;
    END LOOP;
    
    RAISE NOTICE 'Successfully added 20 patients.';
END $$;
