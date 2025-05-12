-- Migration to create the app_settings table
-- This table will store global application defaults.

-- Ensure the trigger function for updated_at exists (it might have been created by a previous migration)
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

CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Using UUID for consistency, though only one row is expected
    base_currency TEXT NOT NULL DEFAULT 'USD' CHECK (base_currency IN ('USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD', 'CNY', 'JPY', 'CAD', 'AUD', 'NZD')),
    default_tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (default_tax_percentage >= 0 AND default_tax_percentage <= 100),
    default_quote_expiry_days INTEGER NOT NULL DEFAULT 30 CHECK (default_quote_expiry_days >= 0),
    default_invoice_payment_terms_days INTEGER NOT NULL DEFAULT 30 CHECK (default_invoice_payment_terms_days >= 0),
    default_quote_notes TEXT,
    default_invoice_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger to automatically update updated_at on row modification
CREATE TRIGGER set_app_settings_timestamp
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

COMMENT ON TABLE public.app_settings IS 'Stores global application settings and defaults. Expected to have only one row.';
COMMENT ON COLUMN public.app_settings.base_currency IS 'The system-wide base currency (ISO 4217 code).';
COMMENT ON COLUMN public.app_settings.default_tax_percentage IS 'The default tax percentage to be applied to new invoices/quotes.';
COMMENT ON COLUMN public.app_settings.default_quote_expiry_days IS 'Default number of days after which a quote expires.';
COMMENT ON COLUMN public.app_settings.default_invoice_payment_terms_days IS 'Default number of days for invoice payment terms.';
COMMENT ON COLUMN public.app_settings.default_quote_notes IS 'Default notes to be pre-filled on new quotes.';
COMMENT ON COLUMN public.app_settings.default_invoice_notes IS 'Default notes to be pre-filled on new invoices.';

-- Insert a single row with default values.
-- Application logic should ensure only this row is updated, not new ones inserted.
INSERT INTO public.app_settings (
    base_currency,
    default_tax_percentage,
    default_quote_expiry_days,
    default_invoice_payment_terms_days,
    default_quote_notes,
    default_invoice_notes
) VALUES (
    'USD', -- Default base currency
    0.00,  -- Default tax percentage
    30,    -- Default quote expiry days
    30,    -- Default invoice payment terms days
    '',    -- Default quote notes (empty string)
    ''     -- Default invoice notes (empty string)
);