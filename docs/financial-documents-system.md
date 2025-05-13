# Financial Documents System Documentation

## Overview

The Financial Documents system in AgeQuant CRM v3 provides comprehensive management of invoices and quotes. Both document types share a common architecture for consistency and code reuse, while maintaining their unique business requirements.

## Shared Architecture

Invoices and quotes use a shared architecture pattern:

### 1. Data Model

Both document types use similar data structures:
- Core document information (dates, customer, currency, etc.)
- Line items with product references
- Subtotal, tax, and total amounts
- Status tracking

### 2. Components

Reusable components across both document types:
- **LineItemEditor**: Shared component for managing document line items
- **StatusUpdater**: Component for managing document status transitions
- **DocumentForm**: Base form structure for both document types

### 3. Server Actions

Server actions for both document types follow the same pattern:
- Database operations use RPC functions for atomic transactions
- Similar validation and error handling approaches

### 4. Utilities

Shared utility functions:
- `calculateDocumentTotals`: Handles subtotal, tax, and total calculations
- `extractLineItemsFromFormData`: Parses form data into structured line items
- `toISODate`: Normalizes date formats for database storage

## Invoice Management

The invoice subsystem provides:

### 1. Core Features

- **Create**: Create new invoices with multiple line items
- **Read**: View invoice details with calculated totals
- **Update**: Modify existing invoices and recalculate totals
- **Delete**: Soft delete with deletion tracking

### 2. Status Management

Invoices support multiple statuses:
- **Draft**: Initial state, editable
- **Sent**: Invoice has been sent to customer
- **Paid**: Payment received
- **Overdue**: Past due date without payment
- **Cancelled**: Invoice voided

### 3. Key Files

- `/app/invoices/actions.ts`: Server actions for CRUD operations
- `/app/invoices/[id]/page.tsx`: Invoice detail page
- `/app/invoices/[id]/edit/page.tsx`: Invoice edit page
- `/app/invoices/new/page.tsx`: New invoice creation page
- `/components/invoices/invoice-form.tsx`: Form component

### 4. Database Integration

- Invoices are stored in the `invoices` table
- Line items are stored in the `invoice_items` table
- Database operations use transactions to ensure data integrity

## Quote Management

The quote subsystem provides:

### 1. Core Features

- **Create**: Create new quotes with multiple line items
- **Read**: View quote details with calculated totals
- **Update**: Modify existing quotes and recalculate totals
- **Delete**: Soft delete with deletion tracking

### 2. Status Management

Quotes support multiple statuses:
- **Draft**: Initial state, editable
- **Sent**: Quote has been sent to customer
- **Accepted**: Customer has accepted the quote
- **Rejected**: Customer has rejected the quote
- **Expired**: Past expiration date without acceptance

### 3. Quote-to-Invoice Conversion

A key feature unique to quotes is the ability to convert them to invoices:
- Preserves all line items, customer information, and financial data
- Stores reference to the source quote in the invoice
- Handles status updates for both the quote and new invoice

### 4. Key Files

- `/app/quotes/actions.ts`: Server actions for CRUD operations
- `/app/quotes/[id]/page.tsx`: Quote detail page
- `/app/quotes/[id]/edit/page.tsx`: Quote edit page
- `/app/quotes/new/page.tsx`: New quote creation page
- `/components/quotes/quote-form.tsx`: Form component

### 5. Database Integration

- Quotes are stored in the `quotes` table
- Line items are stored in the `quote_items` table
- Database operations use transactions to ensure data integrity

## Line Item Management

Line items for both document types include:

1. **Product Association**: Link to a product in the catalog
2. **Description**: Customizable description text
3. **Quantity**: Number of units
4. **Unit Price**: Price per unit in document currency
5. **FX Rate**: Exchange rate used for currency conversion
6. **Total**: Calculated line item total (quantity × unit price)

## Currency Integration

Both document types integrate with the FX/Currency system:
- Each document has a specified currency
- Line items can use products with different base currencies
- Exchange rates are captured at the time of line item creation
- Totals are calculated and stored in the document's currency

## Dashboard Integration

Financial documents feed data to the dashboard:
- Overdue invoices display
- Expiring quotes display
- Monthly revenue charts
- KPI indicators (total sent, outstanding, etc.)

## Testing

The financial documents system is thoroughly tested:
- Unit tests for utility functions
- Component tests for UI elements
- Integration tests for server actions

## Future Enhancements

Planned enhancements:
1. **PDF Generation**: Generate downloadable PDFs for invoices and quotes
2. **Email Integration**: Send documents directly to customers
3. **Payment Tracking**: Enhanced payment tracking and recording
4. **Document Templates**: Customizable templates for different document types