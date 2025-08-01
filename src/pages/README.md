# `src/pages` Component Guidelines

This document outlines the established guidelines for developing and maintaining page-level components within the `src/pages` directory and related settings components in `src/components/settings`. The goal is to ensure uniformity, maintainability, security, and HIPAA compliance, leveraging Supabase and React Query effectively.

## 1. Data Fetching & Server State Management

*   **Standardize on React Query (`@tanstack/react-query`):**
    *   Use `useQuery` for fetching data (reads).
    *   Use `useMutation` for creating, updating, or deleting data (writes).
    *   Leverage React Query's caching, refetching, loading, and error states to simplify component logic.
*   **Dedicated Service Layer:**
    *   All direct interactions with the Supabase client (`src/api/supabase.ts`) should reside within dedicated service functions located in `src/api/services/`.
    *   Page components should import and call these service functions, passing necessary parameters. Components should **not** directly import or use the Supabase client.
*   **API Calls:**
    *   Service functions will utilize the Supabase JavaScript client for database operations (tables, views) or calling RPC functions (PostgreSQL functions).

## 2. Component State Management

*   **Server State:** Managed exclusively by React Query. Do not duplicate fetched data in `useState`. Access data via the `data` property returned by `useQuery`.
*   **Local UI State:** Use `useState` for component-specific UI concerns, such as:
    *   Modal visibility
    *   Form input values (controlled components)
    *   Active tabs or UI selections
    *   Filter/search term values

## 3. Forms & Mutations

*   **Controlled Components:** Forms should use controlled components, with input values managed by `useState`.
*   **Mutations:** Form submissions that modify data (create, update, delete) should use `useMutation`.
    *   Pass the appropriate service function to `useMutation`.
    *   Handle `isLoading`, `isError`, and `error` states provided by the hook to give user feedback.
    *   On successful mutation (`onSuccess`), invalidate relevant `useQuery` caches using `queryClient.invalidateQueries()` to trigger data refetching and keep the UI consistent. Avoid direct manipulation of local state arrays after mutations.
*   **Complex Forms:** For highly complex forms (e.g., multi-step wizards like `CreateInvoice`), consider using a dedicated form library (like React Hook Form) integrated with `useMutation` if `useState` becomes too cumbersome.

## 4. Error Handling

*   **Data Fetching (`useQuery`):**
    *   Use the `isLoading` state for loading indicators (e.g., spinners).
    *   Use the `isError` and `error` states to display user-friendly error messages. Avoid showing raw technical error details to the end-user. Consider a generic message or use a notification system.
*   **Mutations (`useMutation`):**
    *   Use `isLoading` for disabling forms/buttons during submission.
    *   Use `isError` and `error` to display specific feedback about the failed operation (e.g., "Failed to save invoice: [formatted error message]"). Use notifications/toasts or inline alerts.
*   **General Errors:** Utilize `ErrorBoundary` components at appropriate levels (e.g., around major page sections or the whole app) to catch unexpected rendering errors gracefully.

## 5. HIPAA Compliance & PHI Handling

*   **Row-Level Security (RLS):** This is the **primary security mechanism**. Ensure RLS policies are enabled and correctly configured in Supabase for **all** tables containing PHI or sensitive data. Policies should restrict access based on the authenticated user's ID (`auth.uid()`) and role (`auth.role()`).
*   **Service Functions:** Service functions interacting with Supabase **must not** bypass RLS by using the `service_role` key unless absolutely necessary for a specific, secure backend process (like an admin-only bulk operation initiated server-side, not directly from the frontend). Frontend-facing services rely on the user's session JWT for RLS enforcement.
*   **Role-Based Access (Frontend):**
    *   Use the `useAuth` hook to get the user's role.
    *   Conditionally render UI elements (buttons, menu items, entire sections) based on the user's role and required permissions.
    *   Use the `ProtectedRoute` component (or similar logic) to restrict access to entire pages based on roles.
*   **Minimize Data Exposure:**
    *   Fetch only the data fields necessary for the specific view or operation.
    *   Avoid displaying sensitive PHI in lists or aggregated views unless essential and permitted for the user's role. Consider anonymization or aggregation on the backend where appropriate.
    *   **Never log PHI** to the browser console.
*   **Secure Transmission:** Ensure all communication is over HTTPS (default with Supabase).
*   **Audit Trails:** Implement or leverage Supabase's audit capabilities on the backend to log access and modifications to PHI as required by HIPAA.
*   **Sensitive Configurations:** API keys (Payment Gateways) and other sensitive credentials (SMTP passwords) must be stored securely on the backend, never in the frontend code.

## 6. Code Structure & Libraries

*   **Components:** Continue using functional components and hooks.
*   **Styling:** Standardize on Tailwind CSS utility classes. Use shared CSS classes (e.g., `form-input`, `form-label`) where appropriate. Avoid extensive inline styles (refactor `TwoPageInvoicePreview` if feasible).
*   **Libraries:** Continue using `lucide-react` for icons, `date-fns` for date manipulation, `recharts` for charts, and `@tanstack/react-query` for server state.
*   **Shared Components:** Utilize components from `src/components` (e.g., `Modal`, `DataTable`, `StatusBadge`) for consistency.

By adhering to these guidelines, we can build more robust, secure, maintainable, and HIPAA-compliant page components using Supabase and React Query effectively.
