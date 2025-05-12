## AgeQuantCRM 2.0 – Front‑End UI Specification (MVP)

*Revision 3 – 7 May 2025*

This document enumerates every screen, widget and user‑editable field required for the first production release.  Styling and responsive behaviour remain out of scope; a single user role is assumed.

---

### 1 Global Layout

| Area                     | Contents / Behaviour                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sidebar (persistent)** | Dashboard · Invoices · Quotes · Customers · Products · Settings (active link highlighted).                                                                                         |
| **Top Action Bar**       | Left‑aligned *Back* link.  Right‑aligned context buttons: **New [Item]** (e.g., New Quote, New Invoice) ** / Save / Mark Paid / Convert to Invoice** plus **Print PDF · Download PDF · Send Email** when a document is saved. |
| **Validation**           | Inline beside each field; first error scrolled into view on submit.                                                                                                                |

---

### 2 Dashboard

| Zone         | Widget                                                                          | Key Data                                                     |
| ------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| KPI strip    | Total Sent (MTD) · Outstanding · Accepted Quotes (30 d) · Top Product (revenue) | Deep‑link to filtered lists.                                 |
| Left column  | Overdue Invoices table · Expiring Quotes table                                  | Row actions: *Send Reminder*, *Convert to Invoice*.          |
| Right column | Revenue trend (6‑month sparkline) · Quick Add buttons                           | Quick Add opens modal for Product, Customer, Quote, Invoice. |
| Footer       | Recently Updated feed (10 latest changes)                                       | Each entry links to its record.                              |

---

### 3 Invoices

#### 3.1 List Columns

`Invoice #` · **`Entity`** · `Customer` · `Issue Date` · `Due Date / Past Due` · `Status` (Draft | Sent | Paid | Overdue) · `Total`

#### 3.2 Create / Edit Form

| Group  | Field                                                        | Type                                                                                                   | Rules                                                                                                           |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Header | **Issuing Entity**                                           | Dropdown                                                                                               | **Required**. Default = Primary Entity from Settings.                                                           |
|        | Customer                                                     | Select                                                                                                 | **Required**                                                                                                    |
|        | Issue Date                                                   | Date                                                                                                   | **Required** (default = today)                                                                                  |
|        | Due Date                                                     | Date                                                                                                   | **Required** (default = Issue + Payment Terms from Settings)                                                    |
|        | Currency                                                     | Dropdown                                                                                               | **Required** (default = customer currency)<br>Fixed list: USD, GBP, EUR, CHF, SGD, HKD, CNY, JPY, CAD, AUD, NZD |
|        | **Payment Source**                                           | Dropdown                                                                                               | **Required** (default = Primary).  Determines payment instructions.                                             |
| Items  | Line grid                                                    | Product (select) · Description (auto, editable) · Qty · Unit Price (multi‑currency logic) · Line Total | ≥ 1 line                                                                                                        |
| Totals | Sub‑total · Tax % (default, editable up to 50 %) · **Total** | Auto                                                                                                   |                                                                                                                 |
| Extras | Notes                                                        | Multiline, optional                                                                                    |                                                                                                                 |
| Footer | Payment Instructions                                         | Read‑only, pulled from selected Payment Source.  Link: “Manage in Settings → Payment Sources”.         |                                                                                                                 |

*Automatic behaviour*

* **Invoice #** generated on first save as a unique 5‑character code using the character set **A‑Z (excluding O & I) + digits 2‑9** (e.g. `H5K3N`).
* Status pipeline: Draft → Sent → Paid / Overdue.
* Convert‑to‑Invoice on **Sent** Quote creates linked Invoice (stores `quote_id`; Quote stores `converted_invoice_id`).

---

### 4 Quotes

#### 4.1 List Columns

`Quote #` · **`Entity`** · `Customer` · `Issue Date` · `Expiry Date` · `Status` (Draft | Sent | Accepted | Rejected) · `Total`

#### 4.2 Create / Edit Form

| Group  | Field                                               | Type                | Rules                                                       |
| ------ | --------------------------------------------------- | ------------------- | ----------------------------------------------------------- |
| Header | **Issuing Entity**                                  | Dropdown            | **Required** (default = Primary).                           |
|        | Customer                                            | Select              | **Required**                                                |
|        | Issue Date                                          | Date                | **Required** (default = today)                              |
|        | Expiry Date                                         | Date                | **Required** (default = Issue + Expiry Terms from Settings) |
|        | Currency                                            | Dropdown            | **Required** (same fixed list as Invoice)                   |
| Items  | Line grid (same columns as Invoice)                 | ≥ 1 line required   |                                                             |
| Totals | Discount % (optional) · Tax % (default) · **Total** | Auto                |                                                             |
| Extras | Notes / Terms                                       | Multiline, optional |                                                             |

*Automatic behaviour* — **Quote #** generated on first save using the same 5‑char code scheme.

\--- Quotes

#### 4.1 List Columns

`Quote #` · `Customer` · `Issue Date` · `Expiry Date` · `Status` (Draft | Sent | Accepted | Rejected) · `Total`

#### 4.2 Create / Edit Form

| Group  | Field                                               | Type                | Rules                                                       |
| ------ | --------------------------------------------------- | ------------------- | ----------------------------------------------------------- |
| Header | Customer                                            | Select              | **Required**                                                |
|        | Issue Date                                          | Date                | **Required** (default = today)                              |
|        | Expiry Date                                         | Date                | **Required** (default = Issue + Expiry Terms from Settings) |
|        | Currency                                            | Dropdown            | **Required** (same fixed list as Invoice)                   |
| Items  | Line grid (same columns as Invoice)                 | ≥ 1 line required   |                                                             |
| Totals | Discount % (optional) · Tax % (default) · **Total** | Auto                |                                                             |
| Extras | Notes / Terms                                       | Multiline, optional |                                                             |

*Automatic behaviour* — **Quote #** generated on first save using the same 5‑char code scheme.

---

### 5 Customers

#### 5.1 List Columns

`Name` · `Email` · `Phone` · `Currency`

#### 5.2 Create / Edit Form

| Field                  | Required? | Notes                      |
| ---------------------- | --------- | -------------------------- |
| Company / Contact Name | ✔         | Single text field          |
| Email                  | —         | Used for sending PDFs      |
| Phone                  | —         | Optional                   |
| Preferred Currency     | —         | Dropdown (same fixed list) |
| Address                | —         | Appears on PDFs            |
| Notes                  | —         | Internal                   |

---

### 6 Products

#### 6.1 List Columns

`Name` · `SKU` · `Unit` · `Base Price` · `Status`

#### 6.2 Create / Edit Form

| Field                 | Required? | Behaviour                                                                                                                                   |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                  | ✔         | Unique per account                                                                                                                          |
| SKU                   | (auto)    | Generated after first save (`PR‑XXXXX`, 5‑char code from same set)                                                                          |
| Unit                  | ✔         | pc · box · kit · kg · hr                                                                                                                    |
| Base Price            | ✔         | Numeric ≥ 0 in the system's configured **Base Currency** (e.g., USD). Label should reflect the base currency.                               |
| **Additional Prices** | —         | Optional Table. Allows setting specific fixed prices in currencies *other than* the Base Currency. Currency dropdown excludes Base Currency. |
| Status                | ✔         | Active / Inactive                                                                                                                           |
| Description           | —         | Markdown supported                                                                                                                          |

---

### 7 Settings

| Panel                | Fields                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Issuing Entities** | **List of legal entities that can issue documents.** Each entry fields: *Entity Name*, *Registration #*, *Address*, *Website*, *Email*, *Phone*, *Logo upload*.  One entity marked **Primary**. |
| **Defaults**         | Base Currency (fixed list), Tax % (0–50 %), Quote Expiry (days), Invoice Payment Terms (days)                                                                                                   |
| **Payment Sources**  | List. Fields: *Name*, *Currency* (fixed list), **Entity** (dropdown), Bank Name, Account Name, Account #, SWIFT/IBAN, Routing #.  One source marked **Primary** per entity.                     |
| **Default Notes**    | Default Quote Notes, Default Invoice Notes                                                                                                                                                      |

*Settings behaviour*

* Primary Entity pre‑selects on new documents; user may choose another if multiple exist.
* Primary Payment Source per entity auto‑selected on new invoices; user may pick another source linked to the same entity.
* Changes to Settings affect only new documents.

\--- Cross‑Cutting Logic

* **Random ID generation** – 5‑char codes from characters `A‑Z` (excluding O, I) and digits `2‑9`. Front‑end requests server to ensure uniqueness.
* **SKU generation** – Prefix `PR‑` + 5‑char code (same alphabet). Application requests unique SKU from server (e.g., `/api/ids/product_sku`).
* **Multi-currency pricing (Product Setup):**
    * Products have a required `base_price` stored in the system's **Base Currency** (defined in Settings, e.g., USD).
    * Optionally, specific fixed prices can be stored in `product_additional_prices` for currencies *other than* the Base Currency.
* **Multi-currency pricing (Invoice/Quote Line Item Usage):**
    1. Check if an `additional_price` exists for the product in the document's currency.
    2. **If YES:** Use the explicitly defined additional price.
    3. **If NO (or if document currency IS the Base Currency):** Use the product's `base_price`. If the document currency is *not* the Base Currency, convert the `base_price` using an FX rate (e.g., from ECB daily feed). The FX rate used should be stored on the line item.
* **Tax %** – Single rate per document, 0–50 % inclusive.
* **Payment Instructions** – Pulled from selected Payment Source; read‑only.

### 9 Implementation Notes — No‑Assumption Checklist (dev‑facing)

1. **ID generation endpoint** – `/ids/invoice` and `/ids/quote` return a 5‑char code. Character set excludes `O`, `I`, `0`, `1`. DB columns: `CHAR(5)` with `UNIQUE` index.
2. **Entity foreign keys** – `invoices.entity_id`, `quotes.entity_id`, `payment_sources.entity_id` (nullable for legacy).  Front‑end enforces that selected Payment Source belongs to chosen Entity.
3. **Currency dropdown** – Hard‑coded list: USD, GBP, EUR, CHF, SGD, HKD, CNY, JPY, CAD, AUD, NZD.
4. **FX rate provider** – European Central Bank JSON feed. Endpoint `/fx?base={BASE}&target={TARGET}`. Rate captured on document save; stored per line.
5. **Status transitions** – Quote: Draft→Sent→(Accepted | Rejected) • Invoice: Draft→Sent→(Paid | Overdue). Reverse only Sent→Draft before sending.
6. **Soft delete** – `deleted_at` on Products & Customers; Quotes/Invoices never deleted.
7. **Additional Prices validation** – Currency unique per product (and not the Base Currency), price ≥ 0.01.
8. **Tax % field** – Accepts 0–50 %, `DECIMAL(5,2)`.
9. **Max string lengths** – Names 120 chars; Notes 2 000 chars; Description 10 000 chars.


**Suggested React routes (covering full CRUD + lists):**

| Module        | List                                                                                                                   | Create           | View             | Edit                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------- | --------------------- |
| **Dashboard** | `/dashboard`                                                                                                           | —                | —                | —                     |
| **Invoices**  | `/invoices`                                                                                                            | `/invoices/new`  | `/invoices/:id`  | `/invoices/:id/edit`  |
| **Quotes**    | `/quotes`                                                                                                              | `/quotes/new`    | `/quotes/:id`    | `/quotes/:id/edit`    |
| **Customers** | `/customers`                                                                                                           | `/customers/new` | `/customers/:id` | `/customers/:id/edit` |
| **Products**  | `/products`                                                                                                            | `/products/new`  | `/products/:sku` | `/products/:sku/edit` |
| **Settings**  | `/settings` (routes as tabs) → <br>• `/settings/entities` <br>• `/settings/payment-sources` <br>• `/settings/defaults` |                  |                  |                       |

**Notes**

* Each “View” page shows the read-only document; “Edit” flips the same component to an editable state (or can be a separate route as above).
* List routes handle table filtering, search, bulk actions.
* Settings is read-only/edit-inline; no separate “new” needed because entities and payment sources are added via an “Add” dialog inside their tab.

This route set covers all CRUD operations and matches every UI element in the specification.
