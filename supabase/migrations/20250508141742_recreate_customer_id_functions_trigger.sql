-- Drop existing functions and trigger first to ensure clean state (if they exist)
DROP TRIGGER IF EXISTS set_public_customer_id_trigger ON customers;
DROP FUNCTION IF EXISTS set_public_customer_id();
DROP FUNCTION IF EXISTS generate_public_customer_id();
-- Also drop potential old named ones just in case
DROP TRIGGER IF EXISTS set_customer_code_trigger ON customers;
DROP FUNCTION IF EXISTS set_customer_code();
DROP FUNCTION IF EXISTS generate_customer_code();


-- Function to generate a 5-character alphanumeric code
-- 3 random digits and 2 random uppercase letters, shuffled
CREATE FUNCTION generate_public_customer_id()
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
    WHILE EXISTS(SELECT 1 FROM customers WHERE public_customer_id = final_code) LOOP
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

-- Trigger function to set public_customer_id on new customer insert
CREATE FUNCTION set_public_customer_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.public_customer_id := generate_public_customer_id();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute the function before insert on customers table
CREATE TRIGGER set_public_customer_id_trigger
BEFORE INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION set_public_customer_id();