-- Customers Table
-- Stores customer information as per the project specification.

CREATE TABLE public.customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    deleted_at TIMESTAMPTZ NULL, -- For soft deletes, as per spec

    company_contact_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE, -- Email should be unique for each customer
    phone TEXT, -- Optional
    preferred_currency TEXT NOT NULL
        CHECK (preferred_currency IN (
            'USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD',
            'CNY', 'JPY', 'CAD', 'AUD', 'NZD'
        )), -- Enforces the fixed list of currencies from the spec
    address TEXT NOT NULL,
    notes TEXT -- Optional internal notes
);

-- Comments for clarity
COMMENT ON TABLE public.customers IS 'Stores customer information, including contact details, preferred currency, and address.';
COMMENT ON COLUMN public.customers.id IS 'Primary key, unique identifier for the customer.';
COMMENT ON COLUMN public.customers.created_at IS 'Timestamp of when the customer record was created.';
COMMENT ON COLUMN public.customers.updated_at IS 'Timestamp of when the customer record was last updated.';
COMMENT ON COLUMN public.customers.deleted_at IS 'Timestamp for soft deletion. If NULL, the record is active.';
COMMENT ON COLUMN public.customers.company_contact_name IS 'The company name or primary contact name for the customer.';
COMMENT ON COLUMN public.customers.email IS 'Unique email address for the customer, used for communications.';
COMMENT ON COLUMN public.customers.phone IS 'Optional phone number for the customer.';
COMMENT ON COLUMN public.customers.preferred_currency IS 'The customer''s preferred currency (from a predefined list).';
COMMENT ON COLUMN public.customers.address IS 'The primary address of the customer, used on documents like invoices.';
COMMENT ON COLUMN public.customers.notes IS 'Internal notes or additional information about the customer.';

-- Trigger function to automatically update the updated_at column on any row modification
-- Ensure the function exists or create it if it doesn't
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to execute the function before any update on the customers table
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Note: RLS policies should be applied separately via the Supabase dashboard or other migrations.