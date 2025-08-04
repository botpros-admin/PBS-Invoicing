# PBS Invoicing Application

This is the main repository for the PBS Invoicing web application, built with React, TypeScript, Vite, and Supabase.

## Project Structure

The project follows standard conventions for Vite/React projects, with some specific organizational choices:

*   **`/` (Root):** Contains essential configuration files (`package.json`, `vite.config.ts`, `tsconfig.json`, `.env`, `.gitignore`, etc.) and the main `index.html` entry point.
*   **`/public/`:** Static assets that are served directly or copied to the build output (e.g., logos, favicons).
*   **`/src/`:** Contains all the application source code (React components, pages, hooks, API services, context, types, etc.), organized by feature/type.
*   **`/supabase/`:** Configuration and assets for Supabase integration, managed by the Supabase CLI (migrations, edge functions).
*   **`/docs/`:** Contains consolidated project documentation, including guides for authentication and Supabase integration.
*   **`/scripts/`:** Contains various utility, diagnostic, repair, and data management scripts, organized into subdirectories based on their purpose:
    *   **`data/`:** Scripts for data generation and seeding.
        *   `generation/`: Bulk data generation (invoices, patients).
        *   `seeding/`: Initial database seed data.
    *   **`db/`:** Scripts related to direct database operations.
        *   `constraints/`: SQL for defining specific table constraints.
        *   `diagnostics/`: Scripts for checking database health and integrity.
        *   `functions/`: SQL for creating database functions/procedures.
        *   `migrations/`: Manual or helper scripts related to schema migrations (distinct from `/supabase/migrations/`).
        *   *(Root of `db/`)*: General SQL execution utilities, user creation scripts.
    *   **`mcp/`:** Scripts for managing and interacting with the Supabase MCP server.
        *   `diagnostics/`: Scripts to diagnose MCP server issues.
        *   `runners/`: Various batch/PowerShell scripts to run the MCP server with different environment configurations.
    *   **`repairs/`:** One-off scripts used to fix specific issues.
        *   `auth/`: Authentication-related repair scripts.
        *   `db/`: Database structure or data repair scripts.
        *   `general/`: General application repair scripts.
    *   **`testing/`:** Scripts specifically for testing purposes.
        *   `mcp/`: Scripts for testing the MCP server connection/functionality.
    *   **`utils/`:** General utility scripts (e.g., file listing, browser helpers).

## Development

1.  Install dependencies: `npm install`
2.  Configure environment variables in `.env` (copy from `.env.example` if needed). Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
3.  Run the development server: `npm run dev`

## Building

Run `npm run build` to create a production build in the `dist/` directory.

## Supabase

*   Migrations are managed using the Supabase CLI (see `/supabase/migrations/`).
*   Database interactions from the frontend use the `supabase-js` client initialized in `/src/api/supabase.ts`.
*   See `/docs/supabase_guide.md` for comprehensive details on setup, credentials, and MCP integration.

### Edge Functions

*   **`invite-user`**: Sends an invitation email to a new user.
*   **`import-data`**: Parses, validates, and imports billing data from a CSV or Excel file.
*   **`get-invoice-for-payment`**: Retrieves the total amount due for an invoice for the external payment portal.
*   **`process-payment`**: Processes a payment using Stripe.

### Data Import

The data import feature expects a CSV or Excel file with the following columns:
`Invoice #`, `Client`, `Patient`, `Accession #`, `CPT Code`, `Description`, `Date of Service`, `Amount`

## Authentication

*   Authentication is handled via Supabase Auth.
*   See `/docs/authentication.md` for implementation details, fixes, and testing procedures.

## Scripts

Refer to the `/scripts/` directory and its subdirectories for various utility and maintenance tasks. Each subdirectory contains scripts related to its specific purpose (e.g., database diagnostics, data generation, MCP server management).