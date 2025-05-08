-- Allow NULL values for email, preferred_currency, and address in the customers table

ALTER TABLE customers
ALTER COLUMN email DROP NOT NULL;

ALTER TABLE customers
ALTER COLUMN preferred_currency DROP NOT NULL;

ALTER TABLE customers
ALTER COLUMN address DROP NOT NULL;

-- Note: phone and notes were likely already nullable based on previous schema/actions