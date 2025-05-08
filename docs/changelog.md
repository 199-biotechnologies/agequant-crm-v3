# Changelog

## [Unreleased] - 2025-08-05

### Changed
- Refactored "Add New" button functionality for improved UI consistency and maintainability.
  - Centralized "Add New" logic into the `components/layout/action-buttons.tsx` component.
  - The button in the top action bar now displays context-aware labels (e.g., "New Quote", "New Invoice") and uses a consistent `PlusCircle` icon.
  - Removed redundant page-specific "New Quote" button from `app/quotes/page.tsx`.
  - Removed redundant page-specific "New Invoice" button from `app/invoices/page.tsx`.
- Updated `docs/front-end-ui.md` to reflect the new context-aware "New [Item]" button in the Top Action Bar specification.