# AgeQuant CRM v3

AgeQuant CRM v3 is a modern Customer Relationship Management application designed to streamline the management of invoices, quotes, customers, and products. This version focuses on UI consistency, scalability, and best practices in modern web development.

## Project Overview

This project is built with Next.js and TypeScript, utilizing Tailwind CSS for styling and Shadcn/ui for UI components. The primary goal is to provide an intuitive and efficient platform for businesses to manage their core sales and customer interaction workflows. The application uses Supabase as its backend and database solution.

## Implementation Status

*   **Dashboard:** ✅ Complete - Shows real-time metrics with charts and overviews.
*   **Invoice Management:** ✅ Complete - Full CRUD implementation with status management.
*   **Quote Management:** ✅ Complete - Full CRUD with quote-to-invoice conversion.
*   **Customer Management:** ✅ Complete - Full CRUD implementation with database integration.
*   **Product Management:** ✅ Complete - Full CRUD with multi-currency pricing support.
*   **Settings:** ✅ Complete - Includes app defaults, issuing entities, and payment sources.
*   **Multi-Currency Support:** ✅ Complete - FX rates with API fallback and database caching.
*   **Responsive Design:** ✅ Complete - Accessible and usable across various devices.
*   **Testing:** ✅ Complete - Unit, component, and integration tests with CI pipeline.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components:** [Shadcn/ui](https://ui.shadcn.com/)
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **Backend:** [Supabase](https://supabase.io/)
*   **Charts:** [Recharts](https://recharts.org/)
*   **Testing:** [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/agequant-crm-v3.git
cd agequant-crm-v3

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
pnpm dev

# Run tests
pnpm test
```

## Project Structure

*   `app/`: Contains the Next.js pages, server actions, and API routes.
*   `components/`: Reusable UI components, categorized by feature.
*   `docs/`: Project documentation, including UI specifications and changelog.
    * [Implementation Status](docs/implementation-status.md)
    * [Financial Documents System](docs/financial-documents-system.md)
    * [FX/Currency System](docs/fx-currency-system.md)
    * [Error Handling Guidelines](docs/error-handling-guidelines.md)
    * [Schema Alignment](docs/schema-alignment.md)
*   `hooks/`: Custom React hooks.
*   `lib/`: Utility functions, type definitions, and shared libraries.
*   `public/`: Static assets.
*   `styles/`: Global styles.
*   `supabase/`: Database migrations and configuration.
*   `__tests__/`: Unit, component, and integration tests.

## Testing

The application includes comprehensive tests:

- **Unit Tests**: Test utility functions and helpers
- **Component Tests**: Test UI components in isolation
- **Integration Tests**: Test form submissions and server actions

Run the tests with:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test -- --coverage
```

## CI/CD

The project uses GitHub Actions for continuous integration:

- Automatic linting and testing on pull requests
- Code coverage reporting
- Build verification

See `.github/workflows/test.yml` for the CI configuration.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass with `pnpm test`
5. Submit a pull request

## License

(To be added: Project license information)