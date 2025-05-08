-- Add public_customer_id column to customers table
ALTER TABLE customers
ADD COLUMN public_customer_id TEXT;

-- Create unique index on public_customer_id
-- This will also help with performance of lookups if needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_public_customer_id ON customers (public_customer_id);

-- Removed function/trigger definitions, moved to 20250508141742_recreate_customer_id_functions_trigger.sql
-- Removed backfill logic, should be handled carefully if needed after schema stabilizes.