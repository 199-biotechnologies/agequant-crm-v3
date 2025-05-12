# Outstanding Work & Considerations: Pricing, FX, and Product Module

This document outlines outstanding development tasks and considerations related to the multi-currency pricing system, FX (Foreign Exchange) rate integration, and product page enhancements. It is intended to inform future development and provide context for the team responsible for the application settings.

## 1. System Base Currency Configuration and Accessibility

The application's multi-currency logic fundamentally relies on a **System Base Currency**. For current development and testing, **USD** has been assumed and, in some places, hardcoded (e.g., in the product form for FX suggestions).

**Outstanding Work:**
*   The System Base Currency needs to be formally configurable within the application's settings (as per `docs/front-end-ui.md`, this is planned for "Settings -> Defaults -> Base Currency").
*   A robust mechanism is required for server-side logic (especially in `app/products/actions.ts`, and future invoice/quote actions) to reliably fetch this configured System Base Currency.

**Considerations for Settings Team:**
*   **Storage:** How will this setting be stored? A dedicated `app_settings` table (e.g., with a single row or a key-value structure) is a common approach. The schema should allow for storing the currency code (e.g., "USD", "EUR").
*   **Accessibility:** Provide a clear and efficient way for server-side Node.js code (Next.js server actions/API routes) to retrieve the currently configured System Base Currency. This could be a utility function that queries the database.
*   **Default Value:** Ensure a sensible default (e.g., "USD") is set if no configuration has been explicitly saved by the user.
*   **Impact:** The successful implementation of FX conversions and validation of additional product prices against the base currency depends on this setting being accessible.

## 2. FX API Integration into Invoice & Quote Line Item Logic

The FX API at `/api/fx` is now implemented and provides exchange rates between supported currencies using the ECB as a source.

**Outstanding Work:**
*   Integrate this FX API into the server actions responsible for creating and updating invoices and quotes.
*   The logic for determining a product's price on a line item should be:
    1.  Check if the product has a manual `additional_price` defined for the invoice/quote's currency. If yes, use this price.
    2.  If not, use the product's `base_price` (which is in the System Base Currency, e.g., USD).
    3.  If the product's `base_price` is used AND the invoice/quote currency is *different* from the System Base Currency:
        *   Call the `/api/fx?base={SystemBaseCurrency}&target={DocumentCurrency}` endpoint.
        *   Convert the `base_price` using the fetched FX rate.
    4.  The FX rate used for any conversion **must be stored on the line item itself** for historical accuracy and auditing (as per `docs/front-end-ui.md`).

**Considerations for Settings Team:**
*   The invoice/quote modules will critically depend on the System Base Currency (see point 1) being available to correctly call the `/api/fx` endpoint (i.e., to know what `base` currency to pass when converting from the product's `base_price`).

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