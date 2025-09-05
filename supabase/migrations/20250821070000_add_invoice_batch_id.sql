-- Migration: Add invoice_batch_id to invoices
-- Date: 2025-08-21
-- Purpose: To link related invoices that are split by invoice_type.

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS invoice_batch_id UUID;

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_batch_id
ON public.invoices (invoice_batch_id)
WHERE invoice_batch_id IS NOT NULL;

COMMENT ON COLUMN public.invoices.invoice_batch_id IS 'Identifier to group invoices generated from the same source/batch.';
