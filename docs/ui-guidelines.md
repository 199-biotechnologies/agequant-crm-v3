# UI Development Guidelines - AgeQuantCRM 2.0

This document provides guidelines for developing user interfaces in the AgeQuantCRM 2.0 project. Adhering to these guidelines will help maintain consistency, clarity, and a good user experience.

## 1. General Principles

*   **Consistency**: UI elements and patterns should be consistent across the application. Similar actions or information should be presented in a similar way.
*   **Clarity**: Interfaces should be clear, intuitive, and easy to understand. Avoid ambiguity and unnecessary complexity.
*   **Responsiveness**: Ensure that layouts and components adapt well to different screen sizes (desktop, tablet, mobile).
*   **Accessibility**: Strive to meet accessibility standards (WCAG) to make the application usable by as many people as possible.

## 2. Layout

### Main Application Layout
*   The primary application layout is defined in `app/layout.tsx` and implemented via the `components/layout/app-layout.tsx` component.
*   `AppLayout` provides the main structure including the `Sidebar` (`components/layout/sidebar.tsx`) for navigation and the `TopBar` (`components/layout/top-bar.tsx`).
*   **Crucially, individual page components (e.g., `app/settings/page.tsx`, `app/customers/page.tsx`) should NOT re-wrap their content with `<AppLayout>`.** The root layout already handles this. Pages should only render their specific content, which will be injected as `children` into the `AppLayout`.

### Page Structure
*   **Overall Page Container**: Each page's content (that which is passed as `children` to `AppLayout`) should start with a root `div`.
    *   **Spacing**: Apply `className="space-y-6"` to this root `div` to ensure consistent vertical spacing between major sections of the page (e.g., between the title header and the main content).
    *   **Padding**: The `AppLayout`'s `main` tag already provides overall padding (`p-4 md:p-6`). Avoid adding redundant page-level padding that would conflict with this.
*   **Page Header**:
    *   The first element within the page's root `div` should typically be a header section:
      ```html
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Your Page Title</h1>
        {/* Optional: Page-specific action buttons can go here, e.g., a Refresh button. */}
        {/* Note: Global "New X" buttons are often handled by `components/layout/action-buttons.tsx` in the TopBar. */}
      </div>
      ```
    *   The `h1` tag with `text-3xl font-bold tracking-tight` should be used for the main page title.
*   **Main Content**:
    *   The main content of the page (e.g., DataTables, grids of Cards, forms) should follow the page header.
    *   Use `Card` components (`@/components/ui/card`) to group related content subsections, especially for complex pages like the Dashboard or form pages.
        *   `CardHeader`, `CardTitle`, `CardDescription` for section titles and context.
    *   `CardContent` for the main content of the section.
    *   `CardFooter` for actions or summary information related to the card.
*   **Responsiveness**: Employ Tailwind CSS responsive prefixes (e.g., `md:grid-cols-2`) to ensure layouts adapt to different screen sizes.

## 3. Component Usage

The project primarily uses **shadcn/ui** components. Refer to the [shadcn/ui documentation](https://ui.shadcn.com/docs) for available components and their APIs.

### Common Patterns:

*   **Forms**:
    *   Use `Form` and related components from `react-hook-form` integrated with `shadcn/ui` (`@/components/ui/form`).
    *   Structure: `Form` > `FormField` > `FormItem` > `FormLabel`, `FormControl`, `FormMessage`, `FormDescription`.
    *   Inputs: `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup` from `@/components/ui/...`.
    *   Validation: Use Zod schemas (e.g., `customerFormSchema.ts`) with `zodResolver`.
    *   Submission: Prefer Next.js Server Actions passed to the `action` prop of the `<form>` element.
*   **Data Display**:
    *   **Tables**: Use `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from `@/components/ui/table` for simple tabular data.
    *   **DataTables**: For interactive tables with sorting, filtering, and pagination, use the `DataTable` component (`@/components/ui/data-table.tsx`) along with a client wrapper (e.g., `CustomerDataTableClientWrapper`). Column definitions should be separate (e.g., `customer-columns.tsx`).
    *   **Cards**: As mentioned in Layout, use `Card` for sectioning content.
*   **Navigation**:
    *   **Main Navigation**: Handled by `Sidebar`.
    *   **Sub-Navigation/Sectioning**: Use `Tabs` (`@/components/ui/tabs`) for organizing content within a single page, as seen in `app/settings/page.tsx`.
    *   **Links**: Use Next.js `Link` component for internal navigation.
*   **Buttons**:
    *   Use `Button` component (`@/components/ui/button`) with appropriate variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`).
    *   Include icons (from `lucide-react`) where appropriate to enhance clarity.
*   **Feedback & Notifications**:
    *   **Toasts**: Use `toast` from `sonner` (as seen in column actions) for brief, non-modal notifications.
    *   **Alert Dialogs**: Use `AlertDialog` (`@/components/ui/alert-dialog`) for critical confirmations (e.g., delete actions).
*   **Badges**: Use `Badge` (`@/components/ui/badge`) for displaying status, tags, or short pieces of information (e.g., currency codes).

## 4. Styling

*   **Tailwind CSS**: Utilize Tailwind CSS utility classes for styling.
*   **Theme**: The application uses `ThemeProvider` for light/dark mode support. Styles should be theme-aware where possible.
*   **Global Styles**: Global styles are defined in `app/globals.css`. Add styles here sparingly; prefer utility classes or component-scoped styles.

## 5. Settings Page Example (`app/settings/page.tsx`)

*   **Layout**: The `SettingsPage` correctly uses `Tabs` to organize different settings sections (Defaults, Issuing Entities, Payment Sources). This is a good pattern.
*   **Sub-Pages as Components**: Currently, `DefaultsSettingsPage`, `EntitiesSettingsPage`, etc., are imported and rendered as components within `TabsContent`.
    *   **Future Consideration**: As noted in the code comments, these could be refactored into actual Next.js sub-routes (e.g., `/settings/defaults`, `/settings/entities`) using a route group layout (`app/settings/layout.tsx`) if distinct URLs and more complex state per section are needed. This would involve creating an `app/settings/layout.tsx` file that contains the `Tabs` navigation, and each sub-page would be the `children` of that layout.
*   **Content of Settings Tabs**: Each settings tab's content (e.g., `DefaultsSettingsPage`) should follow the general guidelines for forms, cards, and input components.

## 6. Code Structure for UI

*   **Server Components vs. Client Components**:
    *   Use Server Components by default for pages and data fetching.
    *   Use `"use client";` directive for components that require interactivity, hooks (`useState`, `useEffect`, etc.), or event listeners.
*   **Separation of Concerns**:
    *   Keep Zod schemas for forms in separate files (e.g., `*-form-schema.ts`).
    *   Define types/interfaces related to specific features close to their usage or in shared type files (e.g., `app/settings/types.ts`).
    *   Column definitions for DataTables should be in their own files (e.g., `*-columns.tsx`).
*   **Directory Structure**: Follow the existing conventions (e.g., `components/ui` for base UI elements, `components/layout` for layout parts, feature-specific components under `components/[feature]`).

## 7. Avoiding Layout Issues

*   **Single Source of Truth for Layout**: The root `app/layout.tsx` (using `AppLayout`) is the single source for the main sidebar and top bar.
*   **No Nested Layouts**: Pages or sub-layouts should not re-render `AppLayout` or its parts (Sidebar, TopBar) if they are already provided by a higher-level layout.

By following these guidelines, future development should maintain a consistent and high-quality user interface. Remember to consult the shadcn/ui documentation and existing code for examples.
