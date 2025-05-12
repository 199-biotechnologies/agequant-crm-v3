-- Ensure the trigger function exists (it might have been created by a previous migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_set_timestamp') THEN
    CREATE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END
$$;

-- Create the product_additional_prices table
CREATE TABLE product_additional_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL, -- e.g., 'USD', 'EUR', 'GBP'
  price NUMERIC NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_product_currency UNIQUE (product_id, currency_code)
);

-- Add an index on product_id for faster lookups of additional prices for a product
CREATE INDEX idx_product_additional_prices_product_id ON product_additional_prices(product_id);

-- Add an index on currency_code if you often query by currency across all products
CREATE INDEX idx_product_additional_prices_currency_code ON product_additional_prices(currency_code);

-- Create a trigger to automatically update updated_at on row modification
CREATE TRIGGER set_product_additional_prices_timestamp
BEFORE UPDATE ON product_additional_prices
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

COMMENT ON TABLE product_additional_prices IS 'Stores additional prices for products in different currencies.';
COMMENT ON COLUMN product_additional_prices.currency_code IS 'ISO 4217 currency code (e.g., USD, EUR). Must be one of the allowed system currencies.';
COMMENT ON COLUMN product_additional_prices.price IS 'Price of the product in the specified currency_code.';
COMMENT ON CONSTRAINT uq_product_currency ON product_additional_prices IS 'Ensures that a product can only have one price entry per currency.';