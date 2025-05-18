-- Create transaction functions for financial documents
-- These functions ensure atomicity when creating or updating invoices and quotes

-- Function to create an invoice with line items atomically
CREATE OR REPLACE FUNCTION create_invoice_with_items(
  p_entity_id UUID,
  p_customer_id UUID,
  p_issue_date TIMESTAMPTZ,
  p_due_date TIMESTAMPTZ,
  p_currency_code TEXT,
  p_payment_source_id UUID,
  p_tax_percentage NUMERIC,
  p_notes TEXT,
  p_status TEXT,
  p_source_quote_id UUID,
  p_subtotal_amount NUMERIC,
  p_tax_amount NUMERIC,
  p_total_amount NUMERIC,
  p_line_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_line_item JSONB;
  v_result JSONB;
BEGIN
  -- Start a transaction
  BEGIN
    -- Create the invoice
    INSERT INTO invoices (
      entity_id,
      customer_id,
      issue_date,
      due_date,
      currency_code,
      payment_source_id,
      tax_percentage,
      notes,
      status,
      source_quote_id,
      subtotal_amount,
      tax_amount,
      total_amount
    ) VALUES (
      p_entity_id,
      p_customer_id,
      p_issue_date,
      p_due_date,
      p_currency_code,
      p_payment_source_id,
      p_tax_percentage,
      p_notes,
      p_status,
      p_source_quote_id,
      p_subtotal_amount,
      p_tax_amount,
      p_total_amount
    )
    RETURNING id, invoice_number INTO v_invoice_id, v_invoice_number;

    -- Create the line items
    FOR v_line_item IN SELECT jsonb_array_elements(p_line_items)
    LOOP
      INSERT INTO invoice_items (
        invoice_id,
        product_id,
        description,
        quantity,
        unit_price,
        fx_rate,
        total_amount
      ) VALUES (
        v_invoice_id,
        (v_line_item->>'product_id')::UUID,
        v_line_item->>'description',
        (v_line_item->>'quantity')::NUMERIC,
        (v_line_item->>'unit_price')::NUMERIC,
        (v_line_item->>'fx_rate')::NUMERIC,
        (v_line_item->>'total_amount')::NUMERIC
      );
    END LOOP;

    -- Commit the transaction
    COMMIT;

    -- Return the created invoice details
    v_result := jsonb_build_object(
      'id', v_invoice_id,
      'invoice_number', v_invoice_number,
      'success', true
    );

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback the transaction on error
      ROLLBACK;
      
      v_result := jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
      
      RETURN v_result;
  END;
END;
$$;

-- Function to update an invoice with line items atomically
CREATE OR REPLACE FUNCTION update_invoice_with_items(
  p_invoice_id UUID,
  p_entity_id UUID,
  p_customer_id UUID,
  p_issue_date TIMESTAMPTZ,
  p_due_date TIMESTAMPTZ,
  p_currency_code TEXT,
  p_payment_source_id UUID,
  p_tax_percentage NUMERIC,
  p_notes TEXT,
  p_status TEXT,
  p_subtotal_amount NUMERIC,
  p_tax_amount NUMERIC,
  p_total_amount NUMERIC,
  p_line_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line_item JSONB;
  v_result JSONB;
BEGIN
  -- Start a transaction
  BEGIN
    -- Update the invoice
    UPDATE invoices
    SET
      entity_id = p_entity_id,
      customer_id = p_customer_id,
      issue_date = p_issue_date,
      due_date = p_due_date,
      currency_code = p_currency_code,
      payment_source_id = p_payment_source_id,
      tax_percentage = p_tax_percentage,
      notes = p_notes,
      status = COALESCE(p_status, status),
      subtotal_amount = p_subtotal_amount,
      tax_amount = p_tax_amount,
      total_amount = p_total_amount,
      updated_at = NOW()
    WHERE id = p_invoice_id;

    -- Delete existing line items
    DELETE FROM invoice_items WHERE invoice_id = p_invoice_id;

    -- Create the updated line items
    FOR v_line_item IN SELECT jsonb_array_elements(p_line_items)
    LOOP
      INSERT INTO invoice_items (
        invoice_id,
        product_id,
        description,
        quantity,
        unit_price,
        fx_rate,
        total_amount
      ) VALUES (
        p_invoice_id,
        (v_line_item->>'product_id')::UUID,
        v_line_item->>'description',
        (v_line_item->>'quantity')::NUMERIC,
        (v_line_item->>'unit_price')::NUMERIC,
        (v_line_item->>'fx_rate')::NUMERIC,
        (v_line_item->>'total_amount')::NUMERIC
      );
    END LOOP;

    -- Commit the transaction
    COMMIT;

    -- Return success
    v_result := jsonb_build_object(
      'id', p_invoice_id,
      'success', true
    );

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback the transaction on error
      ROLLBACK;
      
      v_result := jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
      
      RETURN v_result;
  END;
END;
$$;

-- Function to create a quote with line items atomically
CREATE OR REPLACE FUNCTION create_quote_with_items(
  p_entity_id UUID,
  p_customer_id UUID,
  p_issue_date TIMESTAMPTZ,
  p_expiry_date TIMESTAMPTZ,
  p_currency_code TEXT,
  p_payment_source_id UUID,
  p_discount_percentage NUMERIC,
  p_tax_percentage NUMERIC,
  p_notes TEXT,
  p_status TEXT,
  p_subtotal_amount NUMERIC,
  p_discount_amount NUMERIC,
  p_tax_amount NUMERIC,
  p_total_amount NUMERIC,
  p_line_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_id UUID;
  v_quote_number TEXT;
  v_line_item JSONB;
  v_result JSONB;
BEGIN
  -- Start a transaction
  BEGIN
    -- Create the quote
    INSERT INTO quotes (
      entity_id,
      customer_id,
      issue_date,
      expiry_date,
      currency_code,
      payment_source_id,
      discount_percentage,
      tax_percentage,
      notes,
      status,
      subtotal_amount,
      discount_amount,
      tax_amount,
      total_amount
    ) VALUES (
      p_entity_id,
      p_customer_id,
      p_issue_date,
      p_expiry_date,
      p_currency_code,
      p_payment_source_id,
      p_discount_percentage,
      p_tax_percentage,
      p_notes,
      p_status,
      p_subtotal_amount,
      p_discount_amount,
      p_tax_amount,
      p_total_amount
    )
    RETURNING id, quote_number INTO v_quote_id, v_quote_number;

    -- Create the line items
    FOR v_line_item IN SELECT jsonb_array_elements(p_line_items)
    LOOP
      INSERT INTO quote_items (
        quote_id,
        product_id,
        description,
        quantity,
        unit_price,
        fx_rate,
        total_amount
      ) VALUES (
        v_quote_id,
        (v_line_item->>'product_id')::UUID,
        v_line_item->>'description',
        (v_line_item->>'quantity')::NUMERIC,
        (v_line_item->>'unit_price')::NUMERIC,
        (v_line_item->>'fx_rate')::NUMERIC,
        (v_line_item->>'total_amount')::NUMERIC
      );
    END LOOP;

    -- Commit the transaction
    COMMIT;

    -- Return the created quote details
    v_result := jsonb_build_object(
      'id', v_quote_id,
      'quote_number', v_quote_number,
      'success', true
    );

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback the transaction on error
      ROLLBACK;
      
      v_result := jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
      
      RETURN v_result;
  END;
END;
$$;

-- Function to update a quote with line items atomically
CREATE OR REPLACE FUNCTION update_quote_with_items(
  p_quote_id UUID,
  p_entity_id UUID,
  p_customer_id UUID,
  p_issue_date TIMESTAMPTZ,
  p_expiry_date TIMESTAMPTZ,
  p_currency_code TEXT,
  p_payment_source_id UUID,
  p_discount_percentage NUMERIC,
  p_tax_percentage NUMERIC,
  p_notes TEXT,
  p_status TEXT,
  p_subtotal_amount NUMERIC,
  p_discount_amount NUMERIC,
  p_tax_amount NUMERIC,
  p_total_amount NUMERIC,
  p_line_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line_item JSONB;
  v_result JSONB;
BEGIN
  -- Start a transaction
  BEGIN
    -- Update the quote
    UPDATE quotes
    SET
      entity_id = p_entity_id,
      customer_id = p_customer_id,
      issue_date = p_issue_date,
      expiry_date = p_expiry_date,
      currency_code = p_currency_code,
      payment_source_id = p_payment_source_id,
      discount_percentage = p_discount_percentage,
      tax_percentage = p_tax_percentage,
      notes = p_notes,
      status = COALESCE(p_status, status),
      subtotal_amount = p_subtotal_amount,
      discount_amount = p_discount_amount,
      tax_amount = p_tax_amount,
      total_amount = p_total_amount,
      updated_at = NOW()
    WHERE id = p_quote_id;

    -- Delete existing line items
    DELETE FROM quote_items WHERE quote_id = p_quote_id;

    -- Create the updated line items
    FOR v_line_item IN SELECT jsonb_array_elements(p_line_items)
    LOOP
      INSERT INTO quote_items (
        quote_id,
        product_id,
        description,
        quantity,
        unit_price,
        fx_rate,
        total_amount
      ) VALUES (
        p_quote_id,
        (v_line_item->>'product_id')::UUID,
        v_line_item->>'description',
        (v_line_item->>'quantity')::NUMERIC,
        (v_line_item->>'unit_price')::NUMERIC,
        (v_line_item->>'fx_rate')::NUMERIC,
        (v_line_item->>'total_amount')::NUMERIC
      );
    END LOOP;

    -- Commit the transaction
    COMMIT;

    -- Return success
    v_result := jsonb_build_object(
      'id', p_quote_id,
      'success', true
    );

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback the transaction on error
      ROLLBACK;
      
      v_result := jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
      
      RETURN v_result;
  END;
END;
$$;

-- Function to convert a quote to an invoice atomically
CREATE OR REPLACE FUNCTION convert_quote_to_invoice(
  p_quote_id UUID,
  p_due_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote quotes%ROWTYPE;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_result JSONB;
  v_item quote_items%ROWTYPE;
BEGIN
  -- Start a transaction
  BEGIN
    -- Get the quote
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Quote not found';
    END IF;
    
    -- Create the invoice
    INSERT INTO invoices (
      entity_id,
      customer_id,
      issue_date,
      due_date,
      currency_code,
      payment_source_id,
      tax_percentage,
      notes,
      status,
      source_quote_id,
      subtotal_amount,
      tax_amount,
      total_amount
    ) VALUES (
      v_quote.entity_id,
      v_quote.customer_id,
      CURRENT_TIMESTAMP,
      p_due_date,
      v_quote.currency_code,
      v_quote.payment_source_id,
      v_quote.tax_percentage,
      v_quote.notes,
      'Draft', -- Default status for new invoices
      p_quote_id,
      v_quote.subtotal_amount,
      v_quote.tax_amount,
      v_quote.total_amount
    )
    RETURNING id, invoice_number INTO v_invoice_id, v_invoice_number;
    
    -- Copy line items from quote to invoice
    FOR v_item IN SELECT * FROM quote_items WHERE quote_id = p_quote_id
    LOOP
      INSERT INTO invoice_items (
        invoice_id,
        product_id,
        description,
        quantity,
        unit_price,
        fx_rate,
        total_amount
      ) VALUES (
        v_invoice_id,
        v_item.product_id,
        v_item.description,
        v_item.quantity,
        v_item.unit_price,
        v_item.fx_rate,
        v_item.total_amount
      );
    END LOOP;
    
    -- Update the quote status and link to invoice
    UPDATE quotes
    SET
      status = 'Accepted',
      converted_invoice_id = v_invoice_id,
      updated_at = NOW()
    WHERE id = p_quote_id;
    
    -- Commit the transaction
    COMMIT;
    
    -- Return success with invoice details
    v_result := jsonb_build_object(
      'success', true,
      'invoice_id', v_invoice_id,
      'invoice_number', v_invoice_number
    );
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback the transaction on error
      ROLLBACK;
      
      v_result := jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
      
      RETURN v_result;
  END;
END;
$$;