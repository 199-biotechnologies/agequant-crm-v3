-- Create a trigger function to set the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  unit TEXT NOT NULL, -- e.g., 'pc', 'box', 'kit', 'kg', 'hr'
  base_price NUMERIC NOT NULL CHECK (base_price >= 0), -- Assuming base currency of the system
  status TEXT NOT NULL DEFAULT 'Active', -- e.g., 'Active', 'Inactive'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Add an index on SKU for faster lookups, as it will be used in routes
CREATE INDEX idx_products_sku ON products(sku);

-- Add an index on deleted_at for soft delete filtering
CREATE INDEX idx_products_deleted_at ON products(deleted_at);

-- Create a trigger to automatically update updated_at on row modification
CREATE TRIGGER set_products_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

COMMENT ON COLUMN products.sku IS 'Application-generated unique product SKU, e.g., PR-XXXXX';
COMMENT ON COLUMN products.unit IS 'Unit of measure for the product (e.g., pc, box, kit, kg, hr)';
COMMENT ON COLUMN products.base_price IS 'Price of the product in the system''s base currency';
COMMENT ON COLUMN products.status IS 'Status of the product (e.g., Active, Inactive)';