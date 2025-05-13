# Outstanding Work & Considerations: Multi-Currency and Document Processing

This document outlines outstanding development tasks and considerations related to PDF generation, email integration, and payment status tracking.

## ~~1. System Base Currency Configuration and Accessibility~~ (COMPLETED)

~~The application's multi-currency logic fundamentally relies on a **System Base Currency**. For current development and testing, **USD** has been assumed and, in some places, hardcoded (e.g., in the product form for FX suggestions).~~

**✅ Implementation Status:**
* The System Base Currency is now configurable in the application's settings (Settings -> Defaults -> Base Currency)
* A robust mechanism has been implemented for server-side logic to fetch the configured System Base Currency
* The app_settings table has been created to store global application settings including the base currency
* Default values are properly set if no configuration has been explicitly saved
* FX conversions and product pricing validation have been implemented based on the base currency setting

## ~~2. FX API Integration into Invoice & Quote Line Item Logic~~ (COMPLETED)

The FX API at `/api/fx` is now implemented and provides exchange rates between supported currencies using the ECB as a source.

**✅ Implementation Status:**
* FX API is fully integrated into the server actions for creating and updating invoices and quotes
* The product pricing logic has been implemented as specified:
  1. Uses product's additional price if available for the document currency
  2. Falls back to base price when needed
  3. Performs currency conversion when necessary
  4. Stores the FX rate on each line item for historical accuracy
* The System Base Currency is properly used for all FX conversions
* Caching has been implemented to reduce API calls and improve performance
* Fallback mechanisms have been added in case the external rate source is unavailable

## 3. Product Module Enhancements

While the product form now shows FX-suggested prices, some server-side and error handling aspects remain.

**Outstanding Work:**

*   **3a. Server-Side Validation: Additional Prices vs. Base Currency**
    *   **Requirement:** Prevent an `additional_price` from being saved if its currency matches the System Base Currency (as per `docs/front-end-ui.md`).
    *   **Task:** Update `app/products/actions.ts` (and potentially the Zod schema in `components/products/product-form-schema.ts`) to include this validation.
    *   **Dependency:** This requires access to the System Base Currency (see point 1).

*   **3b. Improved Error Feedback for Product Creation**
    *   **Requirement:** Address the `TODO` in `app/products/actions.ts` (line 81) regarding improving how server-side validation errors are presented on the product creation form.
    *   **Task:** Refine the error handling to provide more specific feedback to the user, potentially mapping errors to form fields.

*   **3c. Transactional Integrity for Product Creation (Lower Priority)**
    *   **Consideration:** The comment in `app/products/actions.ts` (lines 121-122) notes the possibility of using database transactions for creating a product and its additional prices to ensure atomicity (all or nothing).
    *   **Task:** Evaluate if the current "partial success/failure" error handling is sufficient or if full transactional integrity is required.

**Considerations for Settings Team:**
*   Point 3a directly depends on the System Base Currency setting.

## 4. Minor Discrepancy in Price Validation Rules

A minor inconsistency exists in the minimum value for `additional_prices`.

*   **`components/products/product-form-schema.ts`:** Allows `price >= 0`.
*   **`supabase/migrations/20250805161800_create_product_additional_prices_table.sql`:** Database constraint is `CHECK (price >= 0)`.
*   **`docs/front-end-ui.md` (line 178):** Specifies `price >= 0.01` for additional prices.

**Outstanding Work:**
*   Decide on the definitive minimum value for additional prices.
*   Ensure consistency across the Zod schema, database constraints, and documentation.

**Considerations for Settings Team (and Product Team):**
*   This is a small policy decision that affects validation. If the minimum is to be `0.01`, the schema and database constraint should be updated.

This document should provide a clear overview of the remaining tasks and their dependencies, especially concerning the settings module.