-- Migration: create_quotes_and_items.sql

-- Function to generate a 5-character code (A-Z excluding O, I; 2-9)
-- Ensure this function exists or create it if it doesn't.
-- CREATE OR REPLACE FUNCTION generate_short_code(size INT) RETURNS TEXT AS ... (definition omitted for brevity if exists)

-- Trigger function to update updated_at timestamp
-- Ensure this function exists or create it if it doesn't.
-- CREATE OR REPLACE FUNCTION trigger_set_timestamp() RETURNS TRIGGER AS ... (definition omitted for brevity if exists)

-- Create quotes table
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number TEXT UNIQUE NOT NULL,
    issuing_entity_id UUID NOT NULL REFERENCES issuing_entities(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    currency_code TEXT NOT NULL CHECK (currency_code IN ('USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD', 'CNY', 'JPY', 'CAD', 'AUD', 'NZD')),
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected')),
    subtotal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    converted_invoice_id UUID NULL REFERENCES invoices(id) ON DELETE SET NULL, -- Link to the invoice if converted
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger function to set quote_number before insert
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  generated_code TEXT;
  code_exists BOOLEAN;
  -- Assuming generate_short_code function exists
BEGIN
  LOOP
    generated_code := generate_short_code(5);
    SELECT EXISTS (SELECT 1 FROM quotes WHERE quote_number = generated_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.quote_number := generated_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set quote_number
CREATE TRIGGER trigger_set_quote_number
BEFORE INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION set_quote_number();

-- Trigger to update updated_at on quotes
CREATE TRIGGER set_quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create quote_items table
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    fx_rate NUMERIC(15, 6) NULL, -- Store FX rate used for conversion, if any
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to update updated_at on quote_items
CREATE TRIGGER set_quote_items_updated_at
BEFORE UPDATE ON quote_items
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Add the foreign key constraint from invoices back to quotes
-- This completes the bidirectional link for conversion tracking
ALTER TABLE invoices
ADD CONSTRAINT fk_source_quote
FOREIGN KEY (source_quote_id) REFERENCES quotes(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_quote_items_product_id ON quote_items(product_id);
CREATE INDEX idx_invoices_source_quote_id ON invoices(source_quote_id); -- Index for the new FK
