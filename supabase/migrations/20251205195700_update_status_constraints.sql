-- Migration: update_status_constraints.sql

-- Update the invoices table CHECK constraint to include 'Cancelled' status
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'));

-- Update the quotes table CHECK constraint to include 'Expired' status
ALTER TABLE quotes
  DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes
  ADD CONSTRAINT quotes_status_check 
  CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'));

-- Add comments to document the alignment with frontend constants
COMMENT ON CONSTRAINT invoices_status_check ON invoices IS 
  'Aligns with INVOICE_STATUSES constant in lib/constants.ts';

COMMENT ON CONSTRAINT quotes_status_check ON quotes IS 
  'Aligns with QUOTE_STATUSES constant in lib/constants.ts';