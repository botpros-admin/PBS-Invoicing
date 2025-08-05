ALTER TABLE public.patients
ADD CONSTRAINT unique_patient_per_client UNIQUE (client_id, first_name, last_name, dob);
