# Supabase Comprehensive Guide for PBS Invoicing (Updated 2025-04-06)

> **Recent Fix:** We've added a fix for the infinite recursion policy issue that was causing loading problems on refresh. See [RLS Policy Fixes](#10-rls-policy-fixes) section for details.

This document consolidates critical information regarding the Supabase setup, configuration, implementation, usage, and MCP integration for the PBS Invoicing application.

## 1. Credentials & Keys (Handle with Extreme Care!)

**WARNING:** This section contains highly sensitive information. **DO NOT** commit this file to public repositories or share it insecurely. If any key is compromised, regenerate it immediately in the Supabase dashboard.

*   **Project URL:**
    ```
    https://qwvukolqraoucpxjqpmu.supabase.co
    ```
    *(Found in Supabase Dashboard: Settings -> API)*

*   **Anon Key (Public):**
    ```
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NzI2OTEsImV4cCI6MjA1OTE0ODY5MX0.mhyCdgks_NAvnWWbkT7642Ww_RkwwosruEXLSLmQ_ew
    ```
    *(Safe for client-side use if RLS is enabled. Found in Supabase Dashboard: Settings -> API)*
    *(Environment Variable: `VITE_SUPABASE_ANON_KEY`)*

*   **Service Role Key (Secret):**
    ```
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU3MjY5MSwiZXhwIjoyMDU5MTQ4NjkxfQ.drlF5JNBEwLIVzFV_sO667Tq3wu2gXP5tHfyZ8kxAP0
    ```
    *(Bypasses RLS. **SERVER-SIDE USE ONLY.** Found in Supabase Dashboard: Settings -> API)*
    *(Environment Variable: `SUPABASE_SERVICE_ROLE_KEY`)*

*   **JWT Secret (Secret):**
    ```
    85rpmmYBMQlNKfvRvsTSYJu3Ws9VYnx6A0rQxSmobiKqYqxS3HUEi4N4OZKZtF27m9x++xzcrYi8HE2x8X1Q5A==
    ```
    *(Used for signing/verifying JWTs. Found in Supabase Dashboard: Settings -> API -> JWT Settings)*
    *(Environment Variable: `SUPABASE_JWT_SECRET` - if needed by custom auth)*

*   **Database Password (Secret):**
    ```
    PFUj63Bwj37nV1hz
    ```
    *(Set during project creation. Needed for direct DB connections, e.g., `psql`. Found in Supabase Dashboard: Settings -> Database -> Connection string)*

**`.env` File Configuration:**

Ensure the following variables are set correctly in the `.env` file at the project root:

```dotenv
VITE_SUPABASE_URL=https://qwvukolqraoucpxjqpmu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NzI2OTEsImV4cCI6MjA1OTE0ODY5MX0.mhyCdgks_NAvnWWbkT7642Ww_RkwwosruEXLSLmQ_ew
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU3MjY5MSwiZXhwIjoyMDU5MTQ4NjkxfQ.drlF5JNBEwLIVzFV_sO667Tq3wu2gXP5tHfyZ8kxAP0
# SUPABASE_JWT_SECRET=... (Add if needed)
# QUERY_API_KEY=... (Needed for Supabase MCP Server v0.4+)
```
*(Note: The `QUERY_API_KEY` is specific to the MCP server setup, see Section 11)*

## 2. Mock Data Import Process

The primary script for importing mock data resides in `src/utils/importMockData.ts`.

**Prerequisites:**

1.  **`.env` File:** Ensure the `.env` file exists in the project root and contains the correct `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2.  **API Schema Exposure:** The `public` schema must be exposed via the Supabase API settings.
    *   Go to Supabase Dashboard: Settings -> API -> Data API Settings.
    *   Ensure `public` is listed under "Exposed schemas" (e.g., `api, public`).
3.  **Database Constraints:** The following unique constraints must exist in the `public` schema (add via SQL Editor if missing):
    ```sql
    ALTER TABLE public.organizations ADD CONSTRAINT organizations_name_key UNIQUE (name);
    ALTER TABLE public.clients ADD CONSTRAINT clients_name_organization_id_key UNIQUE (name, organization_id);
    ALTER TABLE public.clinics ADD CONSTRAINT clinics_client_id_name_key UNIQUE (client_id, name);
    ALTER TABLE public.patients ADD CONSTRAINT patients_client_id_mrn_key UNIQUE (client_id, mrn);
    -- Note: cpt_codes uses 'code' which is already defined as unique in the schema dump.
    -- Note: invoices uses 'invoice_number' which is already defined as unique.
    ```

**Steps to Run Import:**

1.  **Compile the script:**
    ```bash
    npx tsc --project tsconfig.import.json
    ```
    *(This compiles `src/utils/importMockData.ts` and related files into the `dist-import` directory)*
2.  **Execute the compiled script:**
    ```bash
    node dist-import/utils/importMockData.js
    ```
    *(This runs the import logic directly, using the `SUPABASE_SERVICE_ROLE_KEY`)*

**Note:** The `import-mock-data.bat` and `src/utils/runImportMockData.js` files were previously used but caused issues with environment variable loading and ES module context. Running the compiled script directly is the current reliable method.

## 3. Essential Supabase Setup Steps (Original)

*(This section provides context on the initial setup)*

### 3.1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com/) and log in.
2. Create a new project (e.g., "PBS Invoicing").
3. Set a secure database password (see Credentials section) and choose a region.

### 3.2. Get API Keys

*(See Credentials section above)*

### 3.3. Create Database Tables (Schema Definition)

This schema definition is based on the dump from the remote database (`supabase/schema_dump.sql`) as of 2025-04-03 02:07 AM. Use the SQL Editor in Supabase to apply these definitions if setting up a new environment.

```sql
-- (Schema SQL from original guide remains here...)
SET statement_timeout = 0;
SET lock_timeout = 0;
-- ... (rest of the schema dump) ...
GRANT ALL ON ALL FUNCTIONS IN SCHEMA "public" TO "anon", "authenticated", "service_role";
```
*(Note: The full schema dump is large and omitted here for brevity. Refer to `supabase/schema_dump.sql` if needed, though migrations are preferred now.)*

### 3.4. Create Admin User

1. Use Supabase Auth UI to add user `mritchie@botpros.ai` (Password: `Password123`), mark as confirmed.
2. Get the user's UUID.
3. Run SQL to insert into the `public.users` table:
   ```sql
   -- Replace 'user-uuid' with the actual UUID from Auth
   -- Ensure organization ID 1 exists first if needed:
   -- INSERT INTO organizations (id, name) VALUES (1, 'PBS Medical Billing (Mock Org)') ON CONFLICT (name) DO NOTHING;
   INSERT INTO public.users (auth_id, organization_id, first_name, last_name, email, role, status)
   VALUES ('user-uuid', 1, 'Maxwell', 'Ritchie', 'mritchie@botpros.ai', 'admin', 'active');
   ```

### 3.5. Configure Auth Settings

1. Enable Email provider in Supabase Auth.
2. Set Site URL to `http://localhost:5174` (or your dev URL).
3. Add `http://localhost:5174` as an additional redirect URL.
4. Enable MFA in Supabase Auth settings if desired.

### 3.6. Set Up Row Level Security (RLS)

Enable RLS on all tables and create policies. Examples:

**Users Table:**
- SELECT: `auth.uid() = auth_id OR (SELECT role FROM users WHERE auth_id = auth.uid()) = 'admin'`
- UPDATE: `auth.uid() = auth_id` (with check)
- ALL (for admin): `(SELECT role FROM users WHERE auth_id = auth.uid()) = 'admin'` (with check)

**Other Tables (e.g., Clients):**
- SELECT (for authenticated): `auth.role() = 'authenticated'`
- INSERT/UPDATE/DELETE (for admin/manager): `(SELECT role FROM users WHERE auth_id = auth.uid()) IN ('admin', 'ar_manager')` (with check)

*(Refer to Section 10 for important RLS policy fixes)*

### 3.7. Seed Data (Optional - Use Mock Import Instead)

The `scripts/create_seed_data.sql` script exists but using the **Mock Data Import Process (Section 2)** is the recommended way to populate development data.

## 4. Authentication Overview (Including MFA)

- The system uses Supabase for all authentication (no mocks).
- MFA (TOTP via authenticator app) is supported.
- **Components:** `MfaManagementSection.tsx`, `MfaSetupModal.tsx`, `MfaVerificationModal.tsx`.
- **Service:** `supabaseAuth.service.ts`.
- **Workflow:** Enroll via settings, verify code on subsequent logins.
- *(See `docs/authentication.md` for full details)*

## 5. Web Implementation Notes

- Use `VITE_USE_SUPABASE=true` in `.env.local` to force Supabase usage in dev.
- API services use `supabase-js` client.
- **Example Query (JS):**
  ```typescript
  import { supabase } from '../api/client';
  const { data, error } = await supabase.from('invoices').select('*').limit(10);
  ```
- **Real-time:** Use `supabase.channel().on().subscribe()`.
- **File Storage:** Use `supabase.storage.from('bucket-name').upload()`, etc.
- **Error Handling:** Use `handleSupabaseError` utility.
- **Data Transformation:** Handle snake_case vs camelCase, IDs, dates.

## 6. Schema Migration Explanation

- **Issue:** Past mismatch between frontend querying `public` and PostgREST API restricted to `api`.
- **Fix:** Frontend code updated to query `public` directly.
- **Current State:** Tables likely exist in both `public` and `api`. Frontend code queries `public`. Import script now also targets `public`.
- **API Setting:** The `public` schema needed to be added to "Exposed schemas" in API settings for the import script (using service key) to work.
- **Future:** Consider standardizing on one schema.
- **Migration Script:** `scripts/migrate_to_api_schema.sql` exists for reference.

## 7. Past Authentication Improvements

- Mock auth removed.
- Missing user record handling improved.
- "Unknown User" issue fixed.
- *(See `docs/authentication.md` for full details)*

## 8. Implementation Plan Reference

- See `SUPABASE_IMPLEMENTATION_PLAN.md` (if it exists).

## 9. CLI Querying (Note)

- Use `psql` with the DB connection string for direct remote querying.
- **Example psql connection (replace placeholders):**
  ```bash
  psql 'postgresql://postgres:[YOUR-DB-PASSWORD]@[YOUR-DB-HOST]:5432/postgres'
  ```
- **Example SQL:**
  ```sql
  SELECT * FROM public.clients LIMIT 10;
  ```

## 10. RLS Policy Fixes

### Infinite Recursion in Users Table RLS Policies

**Problem:**
Users experienced a loading indicator after refreshing when already signed in due to infinite recursion in the RLS policies for the `users` table. The policy tried to query the users table while evaluating access to that same table.

**Solution Implemented:**
A fix using a view (`user_roles_lookup`) and helper functions (`user_has_role`, `user_has_any_role`) was implemented to break this circular dependency. RLS policies were rewritten to use these functions.

**Database Changes Made:**
- Added `public.user_roles_lookup` view
- Added functions: `public.user_has_role()`, `public.user_has_any_role()`, `public.is_own_user_record()`
- Updated policies on `users`, `clients`, `clinics`, `organizations`, and `cpt_codes` tables

**Application Safeguards and Optimizations:**
Comprehensive application-level safeguards and optimizations were added:
- Enhanced error handling for RLS recursion errors (`src/context/enhanced-auth-error-handling.ts`).
- Graceful error handling in `AuthContext.tsx` and `supabaseAuth.service.ts`.
- Improved loading state management and caching in `AuthContext.tsx` and `ProtectedRoute.tsx`.

**Reference:**
- `scripts/fix_infinite_recursion_rls.sql` - The SQL fix applied.
- `scripts/RLS_RECURSION_FIX_INSTRUCTIONS.md` - Detailed documentation.

The users should no longer experience loading indicators after refreshing the page when already signed in.

## 11. Test Data Generation

### 11.1. Generating Test Invoices

Generating test invoices requires care due to schema constraints and types.

**Common Issues to Avoid:**
- Column ambiguity in SQL (use table aliases).
- Enum type handling (cast strings explicitly, e.g., `'sent'::invoice_status`).
- Variable naming collisions (use distinct names like `subtotal_val`).
- Check constraints (e.g., `check_payment_created_by` requires one user ID).

**Successful Approach:**
- Use nested `DECLARE` blocks for scoped variables.
- Use table aliases.
- Cast enum values.
- Set user ID for payments.
- Use descriptive variable names.

**Working Example:**
See `scripts/generate_50_invoices_simplified.sql`.

**Sample Execution:**
```bash
psql 'postgresql://postgres:[YOUR-DB-PASSWORD]@[YOUR-DB-HOST]:5432/postgres' -f scripts/generate_50_invoices_simplified.sql
```

### 11.2. Database Query Examples

**Count Invoices:** `SELECT COUNT(*) FROM public.invoices;`
**Count Invoice Line Items:** `SELECT COUNT(*) FROM public.invoice_line_items;`
**Count Payments:** `SELECT COUNT(*) FROM public.payments;`
**View Enum Types:** `SELECT enum_range(NULL::invoice_status);`
**Check Table Constraints:** `SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_name = 'check_payment_created_by';`

### 11.3. Database Table Dependencies

- **Invoices** depend on: `clients`, `clinics`, `patients`.
- **Invoice Items** depend on: `invoices`, `cpt_codes`.
- **Payments** depend on: `clients`, `users`.

Ensure referenced records exist before creating dependent records.

---

## 12. Supabase MCP Server Integration

This section covers the setup, usage, and troubleshooting of the Supabase Model Context Protocol (MCP) server integration.

### 12.1. MCP Server Setup

**Installation Status:**
The Supabase MCP Server (v0.4+) is installed:
- Executable: `C:\Users\Agent\AppData\Roaming\Python\Python313\Scripts\supabase-mcp-server.exe`
- Batch file: `scripts/run_supabase_mcp.bat` (or similar, check `scripts/`)
- Environment config: `C:\Users\Agent\AppData\Roaming\supabase-mcp\.env`
- VS Code Cline settings updated.

**API Key Configuration:**
Supabase MCP Server v0.4+ requires an API key from thequery.dev.
- API Key: `qry_v1_dmUEgsN7NJMd6lK2Wls2CuwfSLz8KR8r_GJRiy62plk`
- This key should be configured in the startup script (e.g., `run_mcp_clean_env.bat`) or the global `.env` file (`QUERY_API_KEY`).

**Project Configuration:**
The server connects to the PBS Invoicing Supabase project:
- Project Reference: `qwvukolqraoucpxjqpmu`
- Project URL: `https://qwvukolqraoucpxjqpmu.supabase.co`
- Region: `us-east-1`

**Launching the Server:**
Use the appropriate script, likely one designed to handle environment variables correctly:
```powershell
# Example using the clean environment script
./scripts/run_mcp_clean_env.bat
# Or the simple PowerShell script
./scripts/run_mcp_simple.ps1
```

### 12.2. MCP Server Usage Guide

The MCP server provides tools for direct interaction with Supabase.

**Available Tools:**
- **Database:** `get_schemas`, `get_tables`, `get_table_schema`, `execute_postgresql`, `confirm_destructive_operation`, `retrieve_migrations`.
- **Management API:** `send_management_api_request`, `get_management_api_spec`.
- **Auth Admin:** `get_auth_admin_methods_spec`, `call_auth_admin_method`.
- **Safety:** `live_dangerously`.
- **Logs:** `retrieve_logs`.

**Example Tool Usage (XML Format for Cline):**

*   **List Tables:**
    ```xml
    <use_mcp_tool>
    <server_name>supabase-mcp</server_name>
    <tool_name>get_tables</tool_name>
    <arguments>{"schema": "public"}</arguments>
    </use_mcp_tool>
    ```
*   **Execute SQL:**
    ```xml
    <use_mcp_tool>
    <server_name>supabase-mcp</server_name>
    <tool_name>execute_postgresql</tool_name>
    <arguments>{"sql": "SELECT id, email, role FROM public.users WHERE status = 'active' LIMIT 5;"}</arguments>
    </use_mcp_tool>
    ```
*   **Create User (Auth Admin):**
    ```xml
    <use_mcp_tool>
    <server_name>supabase-mcp</server_name>
    <tool_name>call_auth_admin_method</tool_name>
    <arguments>{
      "method_name": "createUser",
      "params": {
        "email": "new.user@example.com",
        "password": "SecurePassword123",
        "email_confirm": true
      }
    }</arguments>
    </use_mcp_tool>
    ```

**Common Scenarios:**
- **Diagnosing Auth Issues:** Use `execute_postgresql` to query the `users` table.
- **Checking Invoice Data:** Use `execute_postgresql` to query `invoices`.
- **Examining Relationships:** Use `execute_postgresql` with JOINs or query related tables.

**Best Practices:**
- Use read operations first.
- Backup critical data before major changes.
- Filter carefully.
- Validate results.
- Remember MCP operations bypass RLS.

### 12.3. MCP Server Troubleshooting

**Problem Identified (Timeout Error):**
The server previously encountered validation errors (`vite_supabase_url: Extra inputs are not permitted`) due to conflicting environment variables from Vite, leading to timeouts.

**Solution Implemented:**
- A clean environment batch file (`scripts/run_mcp_clean_env.bat`) was created to isolate the environment and unset problematic Vite variables.
- MCP server configuration in Cline settings was updated to use this batch file.
- The required `QUERY_API_KEY` was added to the global `.env` file.

**Troubleshooting Ongoing Issues:**
If you still encounter timeout or connection errors:
1.  **Restart VS Code** after any configuration changes.
2.  Verify the correct startup script (e.g., `run_mcp_clean_env.bat`) is being used in Cline settings.
3.  Run `scripts/diagnose_mcp_server.ps1` to check server status.
4.  Check for conflicting environment variables.
5.  Examine the log file: `%USERPROFILE%\.local\share\supabase-mcp\mcp_server.log`.
6.  Try running the server startup script directly in a terminal to see error messages.
7.  Check the MCP Servers tab in the Cline sidebar for connection status.
8.  **Common Errors:**
    *   `spawn EINVAL`: Incorrect batch file path or missing API key in script/env.
    *   `No tools available`: Server running but not connected/configured properly.
    *   `Tenant or user not found`: Incorrect region setting.
    *   `Validation Error`: Conflicting environment variables (ensure clean env script is used).

---
This consolidated guide should serve as the primary reference for Supabase within the PBS Invoicing project.
