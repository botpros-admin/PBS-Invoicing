-- Create the invoice_items table
CREATE TABLE public.invoice_items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    invoice_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    cpt_code TEXT,
    description TEXT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    date_of_service DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_invoice
        FOREIGN KEY(invoice_id) 
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_patient
        FOREIGN KEY(patient_id) 
        REFERENCES patients(id)
);

-- Add indexes for performance
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_patient_id ON public.invoice_items(patient_id);

-- Add a trigger to automatically update the updated_at timestamp
CREATE TRIGGER set_invoice_items_updated_at
BEFORE UPDATE ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
