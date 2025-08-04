# Rollback Procedures

## Story 1.1: Foundational Multi-Tenancy and RBAC

### Database Migration

To roll back the database migration for this story, you will need to run the down migration script. This will drop the new tables and remove the RLS policies.

**Steps:**

1.  **Connect to the database:**
    ```bash
    psql -h localhost -p 5432 -U postgres -d postgres
    ```
2.  **Run the down migration:**
    ```sql
    -- Drop RLS policies
    DROP POLICY "Billing company users can view all data in their organization" ON organizations;
    DROP POLICY "Billing company users can view all labs in their organization" ON labs;
    DROP POLICY "Laboratory users can view their own lab" ON labs;
    DROP POLICY "Laboratory users can view clinics associated with their lab" ON clinics;
    DROP POLICY "Clinic users can view their own clinic" ON clinics;
    DROP POLICY "Clinic users can view invoices for their clinic" ON invoices;

    -- Disable RLS
    ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
    ALTER TABLE labs DISABLE ROW LEVEL SECURITY;
    ALTER TABLE clinics DISABLE ROW LEVEL SECURITY;
    ALTER TABLE client_users DISABLE ROW LEVEL SECURITY;
    ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
    ALTER TABLE invoice_line_items DISABLE ROW LEVEL SECURITY;
    ALTER TABLE patients DISABLE ROW LEVEL SECURITY;

    -- Drop new tables
    DROP TABLE client_users;
    DROP TABLE labs;
    DROP TABLE organizations;

    -- Remove columns
    ALTER TABLE clinics DROP COLUMN parent_clinic_id;
    ALTER TABLE users DROP COLUMN lab_id;
    ```

**Data Considerations:**

*   This rollback script will result in the loss of any data that has been created in the new tables (`organizations`, `labs`, `client_users`).
*   Before running this script, it is highly recommended to back up the database.
