-- Migration to create the issuing_entities table
-- This table stores details of legal entities that can issue documents.

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

CREATE TABLE public.issuing_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_name TEXT NOT NULL,
    registration_number TEXT,
    address TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    logo_url TEXT, -- URL to the uploaded logo
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger to automatically update updated_at on row modification
CREATE TRIGGER set_issuing_entities_timestamp
BEFORE UPDATE ON public.issuing_entities
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Constraint to ensure only one entity can be marked as primary.
-- A unique index on (is_primary) filtered for TRUE values.
CREATE UNIQUE INDEX one_primary_entity_idx
ON public.issuing_entities (is_primary)
WHERE is_primary = TRUE;

COMMENT ON TABLE public.issuing_entities IS 'Stores details of legal entities that can issue documents like invoices and quotes.';
COMMENT ON COLUMN public.issuing_entities.entity_name IS 'The legal name of the issuing entity.';
COMMENT ON COLUMN public.issuing_entities.registration_number IS 'Company registration number or similar identifier.';
COMMENT ON COLUMN public.issuing_entities.address IS 'Physical address of the entity.';
COMMENT ON COLUMN public.issuing_entities.website IS 'Official website of the entity.';
COMMENT ON COLUMN public.issuing_entities.email IS 'Contact email address for the entity.';
COMMENT ON COLUMN public.issuing_entities.phone IS 'Contact phone number for the entity.';
COMMENT ON COLUMN public.issuing_entities.logo_url IS 'URL path to the entity''s logo image.';
COMMENT ON COLUMN public.issuing_entities.is_primary IS 'Indicates if this is the primary/default issuing entity for the system.';