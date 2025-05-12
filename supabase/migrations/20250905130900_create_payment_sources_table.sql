-- Migration to create the payment_sources table
-- This table stores bank account and payment details, linked to issuing entities.

-- Ensure the trigger function for updated_at exists
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

CREATE TABLE public.payment_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    currency_code TEXT NOT NULL CHECK (currency_code IN ('USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD', 'CNY', 'JPY', 'CAD', 'AUD', 'NZD')),
    issuing_entity_id UUID NOT NULL REFERENCES public.issuing_entities(id) ON DELETE CASCADE,
    bank_name TEXT,
    account_holder_name TEXT,
    account_number TEXT, -- Primary account identifier
    iban TEXT, -- International Bank Account Number
    swift_bic TEXT, -- SWIFT/BIC code
    routing_number_us TEXT, -- For US-specific ABA routing numbers
    sort_code_uk TEXT, -- For UK-specific sort codes
    additional_details TEXT, -- For other relevant bank/payment details
    is_primary_for_entity BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger to automatically update updated_at on row modification
CREATE TRIGGER set_payment_sources_timestamp
BEFORE UPDATE ON public.payment_sources
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Index for faster lookups by issuing_entity_id
CREATE INDEX idx_payment_sources_issuing_entity_id ON public.payment_sources(issuing_entity_id);

-- Constraint to ensure only one payment source per issuing_entity_id can be marked as primary.
-- A unique index on (issuing_entity_id, is_primary_for_entity) filtered for TRUE values.
CREATE UNIQUE INDEX one_primary_payment_source_per_entity_idx
ON public.payment_sources (issuing_entity_id, is_primary_for_entity)
WHERE is_primary_for_entity = TRUE;

COMMENT ON TABLE public.payment_sources IS 'Stores bank account and other payment source details, linked to issuing entities.';
COMMENT ON COLUMN public.payment_sources.name IS 'User-friendly name for this payment source (e.g., "HSBC Business UK").';
COMMENT ON COLUMN public.payment_sources.currency_code IS 'ISO 4217 currency code for this payment source.';
COMMENT ON COLUMN public.payment_sources.issuing_entity_id IS 'The issuing entity this payment source belongs to.';
COMMENT ON COLUMN public.payment_sources.bank_name IS 'Name of the bank.';
COMMENT ON COLUMN public.payment_sources.account_holder_name IS 'The name on the bank account.';
COMMENT ON COLUMN public.payment_sources.account_number IS 'Primary bank account number or identifier.';
COMMENT ON COLUMN public.payment_sources.iban IS 'International Bank Account Number.';
COMMENT ON COLUMN public.payment_sources.swift_bic IS 'SWIFT or BIC code for international transfers.';
COMMENT ON COLUMN public.payment_sources.routing_number_us IS 'ABA routing transit number (primarily for US banks).';
COMMENT ON COLUMN public.payment_sources.sort_code_uk IS 'Sort code (primarily for UK banks).';
COMMENT ON COLUMN public.payment_sources.additional_details IS 'Field for any other relevant payment information not covered by specific columns.';
COMMENT ON COLUMN public.payment_sources.is_primary_for_entity IS 'Indicates if this is the primary payment source for the linked issuing entity.';