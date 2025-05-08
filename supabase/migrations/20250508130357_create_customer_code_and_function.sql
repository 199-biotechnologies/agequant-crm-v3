-- Add customer_code column to customers table
ALTER TABLE customers
ADD COLUMN customer_code TEXT;

-- Create unique index on customer_code
-- This will also help with performance of lookups if needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_customer_code ON customers (customer_code);

-- Function to generate a 5-character alphanumeric code
-- 3 random digits and 2 random uppercase letters, shuffled
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT AS $$
DECLARE
    -- Excluding I, L, O for readability
    chars TEXT[] := ARRAY['A','B','C','D','E','F','G','H','J','K','M','N','P','Q','R','S','T','U','V','W','X','Y','Z'];
    -- Excluding 0, 1 for readability
    nums TEXT[] := ARRAY['2','3','4','5','6','7','8','9'];
    result_array TEXT[];
    temp_char TEXT;
    i INTEGER;
    j INTEGER;
    k INTEGER;
    final_code TEXT;
BEGIN
    -- Add 3 random numbers
    FOR i IN 1..3 LOOP
        result_array := array_append(result_array, nums[floor(random() * array_length(nums, 1)) + 1]);
    END LOOP;

    -- Add 2 random letters
    FOR i IN 1..2 LOOP
        result_array := array_append(result_array, chars[floor(random() * array_length(chars, 1)) + 1]);
    END LOOP;

    -- Shuffle the array (Fisher-Yates shuffle)
    FOR i IN REVERSE (array_length(result_array, 1) - 1)..1 LOOP
        j := floor(random() * (i + 1));
        IF j > 0 THEN -- Ensure j is a valid index (1-based for PostgreSQL arrays)
            temp_char := result_array[i+1];
            result_array[i+1] := result_array[j];
            result_array[j] := temp_char;
        END IF;
    END LOOP;
    
    final_code := array_to_string(result_array, '');

    -- Ensure uniqueness (simple retry loop, consider max attempts for production)
    -- For very high collision rates, a more robust generation/checking strategy might be needed.
    WHILE EXISTS(SELECT 1 FROM customers WHERE customer_code = final_code) LOOP
        result_array := '{}'; -- Reset array
        -- Add 3 random numbers
        FOR k IN 1..3 LOOP
            result_array := array_append(result_array, nums[floor(random() * array_length(nums, 1)) + 1]);
        END LOOP;
        -- Add 2 random letters
        FOR k IN 1..2 LOOP
            result_array := array_append(result_array, chars[floor(random() * array_length(chars, 1)) + 1]);
        END LOOP;
        -- Shuffle
        FOR k IN REVERSE (array_length(result_array, 1) - 1)..1 LOOP
            j := floor(random() * (k + 1));
            IF j > 0 THEN
                temp_char := result_array[k+1];
                result_array[k+1] := result_array[j];
                result_array[j] := temp_char;
            END IF;
        END LOOP;
        final_code := array_to_string(result_array, '');
    END LOOP;

    RETURN final_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger function to set customer_code on new customer insert
CREATE OR REPLACE FUNCTION set_customer_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.customer_code := generate_customer_code();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute the function before insert on customers table
CREATE TRIGGER set_customer_code_trigger
BEFORE INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION set_customer_code();

-- Backfill existing customers (optional, but good for consistency)
-- This might take time on large tables.
-- Consider doing this in a separate script or during a maintenance window if necessary.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM customers WHERE customer_code IS NULL LOOP
        UPDATE customers SET customer_code = generate_customer_code() WHERE id = r.id;
    END LOOP;
END $$;

-- Add NOT NULL constraint after backfilling (if desired)
-- Ensure all existing rows have a customer_code before applying this.
-- ALTER TABLE customers ALTER COLUMN customer_code SET NOT NULL;
-- If you add NOT NULL, the unique index `idx_customers_customer_code` might be redundant
-- with a UNIQUE NOT NULL constraint, but having the explicit index is fine.