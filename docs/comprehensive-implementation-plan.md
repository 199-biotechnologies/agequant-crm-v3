# Comprehensive Implementation Plan for AgeQuant CRM v3

This document provides a detailed implementation plan that addresses all identified gaps in the current codebase and ensures a complete, production-ready application.

## Phase 1: Critical Backend Foundations

### Step 1.1: Implement Missing SQL Helper Functions

```sql
-- File: 20251206000000_create_helper_functions.sql

-- Function to generate short codes for identifiers (invoice/quote numbers)
CREATE OR REPLACE FUNCTION generate_short_code(table_name text)
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding I, O, 0, 1 to avoid confusion
  result text := '';
  i integer := 0;
  pos integer := 0;
  continue boolean := true;
  max_attempts integer := 10;
  attempts integer := 0;
BEGIN
  -- Loop until we find a unique code or reach max attempts
  WHILE continue AND attempts < max_attempts LOOP
    attempts := attempts + 1;
    -- Generate a 5-character code
    result := '';
    FOR i IN 1..5 LOOP
      pos := 1 + floor(random() * length(chars));
      result := result || substring(chars, pos, 1);
    END LOOP;
    
    -- Check if code already exists in the specified table
    IF table_name = 'invoices' THEN
      SELECT NOT EXISTS(SELECT 1 FROM invoices WHERE invoice_number = result) INTO continue;
    ELSIF table_name = 'quotes' THEN
      SELECT NOT EXISTS(SELECT 1 FROM quotes WHERE quote_number = result) INTO continue;
    ELSE
      RAISE EXCEPTION 'Invalid table_name: %', table_name;
    END IF;
    
    -- Exit loop if we found a unique code
    IF NOT continue THEN
      RETURN result;
    END IF;
  END LOOP;
  
  -- If we reach max attempts, include timestamp to ensure uniqueness
  IF attempts >= max_attempts THEN
    result := substring(result, 1, 2) || to_char(CURRENT_TIMESTAMP, 'HHMMSS');
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment on functions for documentation
COMMENT ON FUNCTION generate_short_code IS 'Generates a unique 5-character alphanumeric code for use as invoice or quote numbers';
COMMENT ON FUNCTION trigger_set_timestamp IS 'Updates the updated_at column with the current timestamp';
```

### Step 1.2: Implement Database Schema Fixes

```sql
-- File: 20251206000100_fix_schema_inconsistencies.sql

-- Fix nullable columns in customers table to match application code
ALTER TABLE customers 
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN preferred_currency DROP NOT NULL;

-- Add deleted_at to invoices table for soft delete
ALTER TABLE invoices
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to quotes table for soft delete
ALTER TABLE quotes
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_public_id ON customers(public_customer_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);

-- Add indexes for soft-deleted records
CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_deleted ON invoices(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_deleted ON quotes(deleted_at) WHERE deleted_at IS NOT NULL;
```

### Step 1.3: Create Stored Procedures for Atomicity

```sql
-- File: 20251206000200_create_invoice_quote_procedures.sql

-- Create function for atomic invoice creation with line items
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
  p_line_items JSONB
) RETURNS JSONB AS $$
DECLARE
  new_invoice_id UUID;
  new_invoice_number TEXT;
  item JSONB;
  line_item_id UUID;
  result JSONB;
BEGIN
  -- Begin transaction
  BEGIN
    -- Generate invoice number
    SELECT generate_short_code('invoices') INTO new_invoice_number;
    
    -- Create invoice header
    INSERT INTO invoices (
      entity_id, 
      customer_id, 
      invoice_number, 
      issue_date, 
      due_date, 
      currency_code, 
      payment_source_id, 
      tax_percentage, 
      notes, 
      status
    ) VALUES (
      p_entity_id,
      p_customer_id,
      new_invoice_number,
      p_issue_date,
      p_due_date,
      p_currency_code,
      p_payment_source_id,
      p_tax_percentage,
      p_notes,
      p_status
    ) RETURNING id INTO new_invoice_id;
    
    -- Create line items
    FOR item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      INSERT INTO invoice_items (
        invoice_id,
        product_id,
        description,
        quantity,
        unit_price,
        fx_rate
      ) VALUES (
        new_invoice_id,
        (item->>'product_id')::UUID,
        item->>'description',
        (item->>'quantity')::INTEGER,
        (item->>'unit_price')::NUMERIC,
        CASE 
          WHEN item->>'fx_rate' IS NOT NULL 
          THEN (item->>'fx_rate')::NUMERIC 
          ELSE NULL 
        END
      ) RETURNING id INTO line_item_id;
    END LOOP;
    
    -- Prepare result
    SELECT jsonb_build_object(
      'id', new_invoice_id,
      'invoice_number', new_invoice_number,
      'status', 'success'
    ) INTO result;
    
    -- Return success
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Handle errors
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM,
      'code', SQLSTATE
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- Create function for atomic quote creation with line items
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
  p_line_items JSONB
) RETURNS JSONB AS $$
DECLARE
  new_quote_id UUID;
  new_quote_number TEXT;
  item JSONB;
  line_item_id UUID;
  result JSONB;
BEGIN
  -- Begin transaction
  BEGIN
    -- Generate quote number
    SELECT generate_short_code('quotes') INTO new_quote_number;
    
    -- Create quote header
    INSERT INTO quotes (
      entity_id, 
      customer_id, 
      quote_number, 
      issue_date, 
      expiry_date, 
      currency_code, 
      payment_source_id, 
      discount_percentage,
      tax_percentage, 
      notes, 
      status
    ) VALUES (
      p_entity_id,
      p_customer_id,
      new_quote_number,
      p_issue_date,
      p_expiry_date,
      p_currency_code,
      p_payment_source_id,
      p_discount_percentage,
      p_tax_percentage,
      p_notes,
      p_status
    ) RETURNING id INTO new_quote_id;
    
    -- Create line items
    FOR item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      INSERT INTO quote_items (
        quote_id,
        product_id,
        description,
        quantity,
        unit_price,
        fx_rate
      ) VALUES (
        new_quote_id,
        (item->>'product_id')::UUID,
        item->>'description',
        (item->>'quantity')::INTEGER,
        (item->>'unit_price')::NUMERIC,
        CASE 
          WHEN item->>'fx_rate' IS NOT NULL 
          THEN (item->>'fx_rate')::NUMERIC 
          ELSE NULL 
        END
      ) RETURNING id INTO line_item_id;
    END LOOP;
    
    -- Prepare result
    SELECT jsonb_build_object(
      'id', new_quote_id,
      'quote_number', new_quote_number,
      'status', 'success'
    ) INTO result;
    
    -- Return success
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Handle errors
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM,
      'code', SQLSTATE
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- Create function for quote to invoice conversion
CREATE OR REPLACE FUNCTION convert_quote_to_invoice(
  p_quote_id UUID,
  p_due_date TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  quote_record RECORD;
  new_invoice_id UUID;
  new_invoice_number TEXT;
  result JSONB;
BEGIN
  -- Begin transaction
  BEGIN
    -- Fetch quote details
    SELECT * INTO quote_record FROM quotes WHERE id = p_quote_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'error', 'message', 'Quote not found');
    END IF;
    
    -- Generate invoice number
    SELECT generate_short_code('invoices') INTO new_invoice_number;
    
    -- Create new invoice from quote
    INSERT INTO invoices (
      entity_id,
      customer_id,
      invoice_number,
      issue_date,
      due_date,
      currency_code,
      payment_source_id,
      tax_percentage,
      notes,
      status,
      source_quote_id
    ) VALUES (
      quote_record.entity_id,
      quote_record.customer_id,
      new_invoice_number,
      CURRENT_TIMESTAMP,
      p_due_date,
      quote_record.currency_code,
      quote_record.payment_source_id,
      quote_record.tax_percentage,
      quote_record.notes,
      'Draft',
      p_quote_id
    ) RETURNING id INTO new_invoice_id;
    
    -- Copy line items from quote to invoice
    INSERT INTO invoice_items (
      invoice_id,
      product_id,
      description,
      quantity,
      unit_price,
      fx_rate
    )
    SELECT 
      new_invoice_id,
      product_id,
      description,
      quantity,
      unit_price,
      fx_rate
    FROM quote_items
    WHERE quote_id = p_quote_id;
    
    -- Update quote status to Accepted and link to the new invoice
    UPDATE quotes
    SET 
      status = 'Accepted',
      converted_invoice_id = new_invoice_id
    WHERE id = p_quote_id;
    
    -- Prepare result
    SELECT jsonb_build_object(
      'invoice_id', new_invoice_id,
      'invoice_number', new_invoice_number,
      'quote_id', p_quote_id,
      'status', 'success'
    ) INTO result;
    
    -- Return success
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Handle errors
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM,
      'code', SQLSTATE
    );
  END;
END;
$$ LANGUAGE plpgsql;
```

### Step 1.4: Refactor Code Structure

1. Create shared schema files:
   - Create `/lib/schemas/invoice-schema.ts` and `/lib/schemas/quote-schema.ts`
   - Move duplicate Zod schemas from actions files to these central files
   - Update imports in all affected files

2. Update validation logic to align with database schema:
   - Modify customer form schema to make email and preferred_currency optional
   - Ensure all form validations match database requirements

## Phase 2: Settings Module Implementation

### Step 2.1: Implement Core Settings

1. Ensure the UI for `/settings/defaults` allows configuring:
   - System Base Currency
   - Default Tax Percentage
   - Default Quote Expiry Days
   - Default Invoice Payment Terms Days

2. Implement server actions in `app/settings/app-settings.actions.ts`:
   - `getSystemBaseCurrency()`
   - `getDefaultTaxPercentage()`
   - `getDefaultPaymentTerms()`
   - `getDefaultQuoteExpiryDays()`

### Step 2.2: Implement Issuing Entities Management

1. Complete the UI for `/settings/entities`:
   - List view of entities
   - Create/edit dialog
   - Delete confirmation
   - Set primary entity toggle

2. Implement server actions in `app/settings/issuing-entities.actions.ts`:
   - `createIssuingEntity()`
   - `updateIssuingEntity()`
   - `deleteIssuingEntity()`
   - `getIssuingEntities()`
   - `getPrimaryIssuingEntity()`

### Step 2.3: Implement Payment Sources Management

1. Complete the UI for `/settings/payment-sources`:
   - List view of payment sources
   - Create/edit dialog
   - Delete confirmation
   - Link to issuing entities

2. Implement server actions in `app/settings/payment-sources.actions.ts`:
   - `createPaymentSource()`
   - `updatePaymentSource()`
   - `deletePaymentSource()`
   - `getPaymentSources()`
   - `getPaymentSourcesForEntity()`

## Phase 3: Invoice & Quote Forms Enhancement

### Step 3.1: Replace Mock Data with Real Data

1. Update `app/invoices/new/page.tsx` and `app/quotes/new/page.tsx`:
   - Fetch customers list from database
   - Fetch products list from database
   - Fetch issuing entities list
   - Fetch payment sources list (filtered by entity)

2. Pass this data to the form components:
   ```typescript
   // Example
   export default async function NewInvoicePage() {
     const customers = await getCustomers();
     const products = await getProducts();
     const entities = await getIssuingEntities();
     const settings = await getAppSettings();
     
     return (
       <div className="space-y-6">
         <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
         <InvoiceForm 
           customers={customers} 
           products={products}
           entities={entities}
           defaultCurrency={settings.base_currency}
           defaultTaxPercentage={settings.default_tax_percentage}
         />
       </div>
     );
   }
   ```

### Step 3.2: Implement Form Defaults & Auto-calculation

1. Update `components/invoices/invoice-form.tsx` and `components/quotes/quote-form.tsx`:
   - Use real data for dropdowns
   - Implement auto-calculation of totals
   - Add proper currency formatting
   - Implement due date calculation based on terms

2. Example calculation logic:
   ```typescript
   // Calculate line item total
   const calculateLineTotal = (quantity, unitPrice) => {
     return quantity * unitPrice;
   };
   
   // Calculate invoice subtotal
   const calculateSubtotal = (lineItems) => {
     return lineItems.reduce((sum, item) => 
       sum + calculateLineTotal(item.quantity, item.unitPrice), 0);
   };
   
   // Calculate tax amount
   const calculateTaxAmount = (subtotal, taxPercentage) => {
     return subtotal * (taxPercentage / 100);
   };
   
   // Calculate grand total
   const calculateTotal = (subtotal, taxAmount) => {
     return subtotal + taxAmount;
   };
   ```

### Step 3.3: Implement FX Rate Integration

1. Add FX rate handling in line items:
   - When product and invoice/quote currency differ, fetch rate from FX API
   - Record the rate with the line item
   - Use the rate for conversion

2. Example FX integration:
   ```typescript
   // Fetch FX rate when currencies don't match
   const fetchFxRate = async (fromCurrency, toCurrency) => {
     const response = await fetch(`/api/fx?from=${fromCurrency}&to=${toCurrency}`);
     const data = await response.json();
     return data.rate;
   };
   
   // Handle product selection with FX consideration
   const handleProductSelect = async (productId, lineIndex) => {
     const product = products.find(p => p.id === productId);
     const formCurrency = getValues('currency_code');
     
     // Update line item with product details
     setValue(`line_items.${lineIndex}.description`, product.description);
     
     // If currencies match, use product price directly
     if (product.currency_code === formCurrency) {
       setValue(`line_items.${lineIndex}.unit_price`, product.base_price);
       setValue(`line_items.${lineIndex}.fx_rate`, null);
     } 
     // If currencies differ, convert using FX rate
     else {
       const rate = await fetchFxRate(product.currency_code, formCurrency);
       const convertedPrice = product.base_price * rate;
       setValue(`line_items.${lineIndex}.unit_price`, convertedPrice);
       setValue(`line_items.${lineIndex}.fx_rate`, rate);
     }
   };
   ```

## Phase 4: Server Actions Enhancement

### Step 4.1: Update Server Actions for Atomicity

1. Modify `app/invoices/actions.ts`:
   - Replace direct database operations with RPC calls:
   ```typescript
   export async function createInvoice(formData: FormData) {
     // Validate form data...
     
     // Prepare line items as JSON array
     const lineItemsJson = JSON.stringify(validatedFields.data.line_items);
     
     // Call RPC function for atomic operation
     const { data: result, error } = await supabase.rpc(
       'create_invoice_with_items',
       {
         p_entity_id: validatedFields.data.entity_id,
         p_customer_id: validatedFields.data.customer_id,
         // ... other parameters
         p_line_items: lineItemsJson
       }
     );
     
     if (error) {
       console.error('Error creating invoice:', error);
       return { error: error.message };
     }
     
     // Revalidate paths and redirect
     revalidatePath('/invoices');
     redirect(`/invoices/${result.id}`);
   }
   ```

2. Apply similar changes to quote actions and update/delete operations.

### Step 4.2: Implement Soft Delete Logic

1. Update delete operations to use soft delete pattern:
   ```typescript
   export async function deleteInvoice(formData: FormData) {
     // Validate ID...
     
     // Perform soft delete
     const { error } = await supabase
       .from('invoices')
       .update({ deleted_at: new Date().toISOString() })
       .eq('id', id);
     
     // Error handling and path revalidation...
   }
   ```

2. Update list queries to filter out soft-deleted records:
   ```typescript
   // Fetch non-deleted invoices
   const { data: invoices, error } = await supabase
     .from('invoices')
     .select('*')
     .is('deleted_at', null)
     .order('issue_date', { ascending: false });
   ```

## Phase 5: List Pages & CRUD Operations

### Step 5.1: Update Invoice List Page

1. Modify `app/invoices/page.tsx`:
   - Replace mock data with real database fetch
   - Implement pagination and sorting
   - Add filtering by status, date range, customer
   - Example implementation:
   ```typescript
   export default async function InvoicesPage() {
     // Get query parameters
     const { searchParams } = new URL(request.url);
     const page = parseInt(searchParams.get('page') || '1');
     const pageSize = 10;
     const status = searchParams.get('status');
     
     // Create Supabase client
     const supabase = createServerClient(/* auth params */);
     
     // Build query
     let query = supabase
       .from('invoices')
       .select(`
         *,
         customer:customers(id, public_customer_id, company_contact_name),
         entity:issuing_entities(id, name)
       `)
       .is('deleted_at', null);
     
     // Apply filters
     if (status) {
       query = query.eq('status', status);
     }
     
     // Apply pagination
     const { data: invoices, error, count } = await query
       .order('issue_date', { ascending: false })
       .range((page - 1) * pageSize, page * pageSize)
       .returns<InvoiceWithRelations[]>();
     
     // Render component with data
     return (
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
           <Link href="/invoices/new">
             <Button>New Invoice</Button>
           </Link>
         </div>
         
         <InvoiceFilters />
         
         <InvoiceDataTable 
           columns={InvoiceColumns} 
           data={invoices || []} 
         />
         
         <Pagination 
           totalItems={count || 0} 
           pageSize={pageSize} 
           currentPage={page} 
         />
       </div>
     );
   }
   ```

2. Apply similar updates to the Quote list page.

### Step 5.2: Implement Status Management

1. Create server actions for status updates:
   ```typescript
   export async function updateInvoiceStatus(formData: FormData) {
     const id = formData.get('id') as string;
     const status = formData.get('status') as InvoiceStatus;
     
     // Validate the status transition
     const currentStatus = await getInvoiceStatus(id);
     if (!isValidStatusTransition(currentStatus, status)) {
       return { error: 'Invalid status transition' };
     }
     
     // Update the status
     const { error } = await supabase
       .from('invoices')
       .update({ status })
       .eq('id', id);
     
     // Error handling and path revalidation...
   }
   ```

2. Add status update buttons to invoice/quote detail pages.

## Phase 6: Advanced Features

### Step 6.1: Implement Quote to Invoice Conversion

1. Add "Convert to Invoice" button on quote detail page.

2. Create server action to handle conversion:
   ```typescript
   export async function convertQuoteToInvoice(formData: FormData) {
     const quoteId = formData.get('quote_id') as string;
     
     // Calculate due date (e.g., 30 days from now)
     const dueDate = new Date();
     dueDate.setDate(dueDate.getDate() + 30);
     
     // Call RPC function
     const { data: result, error } = await supabase.rpc(
       'convert_quote_to_invoice',
       {
         p_quote_id: quoteId,
         p_due_date: dueDate.toISOString()
       }
     );
     
     if (error) {
       console.error('Error converting quote to invoice:', error);
       return { error: error.message };
     }
     
     // Revalidate paths
     revalidatePath('/quotes');
     revalidatePath('/invoices');
     revalidatePath(`/quotes/${quoteId}`);
     
     // Redirect to the new invoice
     redirect(`/invoices/${result.invoice_id}`);
   }
   ```

### Step 6.2: Implement Form State Persistence

1. Add local storage state persistence to invoice and quote forms:
   ```typescript
   // Save form state to local storage
   useEffect(() => {
     if (formState.isDirty) {
       localStorage.setItem(
         `invoice-form-draft-${id || 'new'}`, 
         JSON.stringify(getValues())
       );
     }
   }, [watch(), formState.isDirty]);
   
   // Load form state from local storage
   useEffect(() => {
     const saved = localStorage.getItem(`invoice-form-draft-${id || 'new'}`);
     if (saved) {
       const values = JSON.parse(saved);
       // Ask user if they want to restore
       if (confirm('Restore unsaved changes?')) {
         reset(values);
       } else {
         localStorage.removeItem(`invoice-form-draft-${id || 'new'}`);
       }
     }
   }, []);
   ```

### Step 6.3: Implement Dashboard with Real Data

1. Update `app/page.tsx` to fetch real metrics:
   - Outstanding invoices
   - Recently updated records
   - Expiring quotes
   - Revenue chart data

2. Example dashboard data fetch:
   ```typescript
   // Get KPI metrics
   const getKPIMetrics = async () => {
     const supabase = createServerClient(/* auth params */);
     
     // Get total outstanding invoices
     const { data: outstanding, error: err1 } = await supabase
       .from('invoices')
       .select('id, total_amount')
       .eq('status', 'Sent')
       .is('deleted_at', null);
     
     // Get expiring quotes
     const { data: expiringQuotes, error: err2 } = await supabase
       .from('quotes')
       .select('id, total_amount')
       .eq('status', 'Sent')
       .lt('expiry_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
       .gt('expiry_date', new Date().toISOString())
       .is('deleted_at', null);
     
     // Calculate totals
     const outstandingTotal = outstanding?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
     const expiringTotal = expiringQuotes?.reduce((sum, q) => sum + q.total_amount, 0) || 0;
     
     return {
       outstandingInvoices: outstanding?.length || 0,
       outstandingAmount: outstandingTotal,
       expiringQuotes: expiringQuotes?.length || 0,
       expiringAmount: expiringTotal
     };
   };
   ```

## Phase 7: Testing & Refinement

### Step 7.1: End-to-End Testing

1. Test invoice creation flow:
   - Create new customer
   - Create new product
   - Create new invoice with the customer and product
   - Verify calculations
   - Change status to Sent
   - Change status to Paid

2. Test quote to invoice conversion:
   - Create new quote
   - Convert to invoice
   - Verify data is carried over correctly

3. Test multi-currency handling:
   - Create products with different currencies
   - Create invoice with mixed currency products
   - Verify FX calculations

### Step 7.2: Performance Optimization

1. Add caching for commonly accessed data:
   ```typescript
   // Example: Cached customer list with revalidation
   export async function getCustomers() {
     // Check if we have fresh cache
     const cacheKey = 'customer-list';
     const cachedData = await redis.get(cacheKey);
     
     if (cachedData) {
       return JSON.parse(cachedData);
     }
     
     // Fetch from database if no cache
     const { data, error } = await supabase
       .from('customers')
       .select('*')
       .is('deleted_at', null);
     
     if (error) throw error;
     
     // Cache for 5 minutes
     await redis.set(cacheKey, JSON.stringify(data), 'EX', 300);
     
     return data;
   }
   ```

2. Implement pagination and lazy loading for large lists.

## Implementation Timeline

Based on the complexity of the tasks:

- **Phase 1 (Backend Foundations)**: 1-2 weeks
- **Phase 2 (Settings Implementation)**: 1 week
- **Phase 3 (Form Enhancements)**: 1-2 weeks
- **Phase 4 (Server Actions)**: 1 week
- **Phase 5 (List Pages & CRUD)**: 1 week
- **Phase 6 (Advanced Features)**: 2 weeks
- **Phase 7 (Testing & Refinement)**: 1-2 weeks

Total estimated time: 8-11 weeks

## Monitoring & Metrics

To ensure successful implementation, track the following metrics:

1. **Functional Coverage**: Percentage of user stories implemented
2. **Data Quality**: Rate of validation errors in form submissions
3. **Performance**: Average response time for key operations
4. **User Satisfaction**: Collect feedback on usability

## Conclusion

This implementation plan addresses all identified gaps in the current codebase. By following this plan, the AgeQuant CRM will achieve a fully functional state with proper data handling, real-time calculations, and a smooth user experience. The most critical components (database functions, atomicity, and real data integration) are prioritized early to provide a solid foundation for the more advanced features.