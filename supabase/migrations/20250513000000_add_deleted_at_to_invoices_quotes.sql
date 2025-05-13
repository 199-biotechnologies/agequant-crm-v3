-- Migration to add missing deleted_at columns to invoices and quotes tables

-- Add deleted_at column to invoices table
ALTER TABLE invoices
ADD COLUMN deleted_at TIMESTAMPTZ;

-- Add index for efficient soft delete filtering
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at);

-- Add deleted_at column to quotes table
ALTER TABLE quotes
ADD COLUMN deleted_at TIMESTAMPTZ;

-- Add index for efficient soft delete filtering
CREATE INDEX idx_quotes_deleted_at ON quotes(deleted_at);

-- Add deleted_at column to invoice_items table
ALTER TABLE invoice_items
ADD COLUMN deleted_at TIMESTAMPTZ;

-- Add index for efficient soft delete filtering
CREATE INDEX idx_invoice_items_deleted_at ON invoice_items(deleted_at);

-- Add deleted_at column to quote_items table
ALTER TABLE quote_items
ADD COLUMN deleted_at TIMESTAMPTZ;

-- Add index for efficient soft delete filtering
CREATE INDEX idx_quote_items_deleted_at ON quote_items(deleted_at);

-- Create RPC function for getting top selling product
CREATE OR REPLACE FUNCTION get_top_selling_product()
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  total_quantity NUMERIC,
  total_revenue NUMERIC,
  average_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH product_sales AS (
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.sku AS product_sku,
      SUM(ii.quantity) AS total_quantity,
      SUM(ii.line_total) AS total_revenue,
      SUM(ii.line_total) / SUM(ii.quantity) AS average_price
    FROM
      invoice_items ii
    JOIN
      products p ON ii.product_id = p.id
    JOIN
      invoices i ON ii.invoice_id = i.id
    WHERE
      i.status = 'Paid'
      AND (i.deleted_at IS NULL)
      AND (p.deleted_at IS NULL)
      AND (ii.deleted_at IS NULL)
    GROUP BY
      p.id, p.name, p.sku
  )
  SELECT
    product_id,
    product_name,
    product_sku,
    total_quantity,
    total_revenue,
    average_price
  FROM
    product_sales
  ORDER BY
    total_revenue DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;