-- Migration: create_invoices_and_items.sql

-- Function to generate a 5-character code (A-Z excluding O, I; 2-9)
-- Ensure this function exists or create it if it doesn't.
-- CREATE OR REPLACE FUNCTION generate_short_code(size INT) RETURNS TEXT AS ... (definition omitted for brevity if exists)

-- Create invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    issuing_entity_id UUID NOT NULL REFERENCES issuing_entities(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    payment_source_id UUID NOT NULL REFERENCES payment_sources(id),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    currency_code TEXT NOT NULL CHECK (currency_code IN ('USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD', 'CNY', 'JPY', 'CAD', 'AUD', 'NZD')),
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue')),
    subtotal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    source_quote_id UUID NULL, -- FK constraint added in quotes migration or separately
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger function to set invoice_number before insert
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  generated_code TEXT;
  code_exists BOOLEAN;
  -- Assuming generate_short_code function exists
BEGIN
  LOOP
    generated_code := generate_short_code(5);
    SELECT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = generated_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.invoice_number := generated_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set invoice_number
CREATE TRIGGER trigger_set_invoice_number
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION set_invoice_number();

-- Trigger function to update updated_at timestamp
-- Ensure this function exists or create it if it doesn't.
-- CREATE OR REPLACE FUNCTION trigger_set_timestamp() RETURNS TRIGGER AS ... (definition omitted for brevity if exists)

-- Trigger to update updated_at on invoices
CREATE TRIGGER set_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create invoice_items table
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    fx_rate NUMERIC(15, 6) NULL, -- Store FX rate used for conversion, if any
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to update updated_at on invoice_items
CREATE TRIGGER set_invoice_items_updated_at
BEFORE UPDATE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Add indexes for performance
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product_id ON invoice_items(product_id);
