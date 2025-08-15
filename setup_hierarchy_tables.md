# Database Setup Instructions

## Important: Run this SQL in your Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/qwvukolqraoucpxjqpmu
2. Navigate to the SQL Editor (in the left sidebar)
3. Create a new query
4. Copy and paste the SQL from the file: `supabase/migrations/20250815_create_hierarchy_tables.sql`
5. Click "Run" to execute the migration

This will create:
- billing_companies table (PBS level)
- laboratories table 
- parent_accounts table for parent/child clinics
- cpt_mappings table for CPT code mapping
- fee_schedules and fee_schedule_items tables
- credits and credit_applications tables
- disputes and dispute_messages tables
- payment_allocations table
- Various helper functions for pricing, credits, and disputes

## Alternative: Manual Table Creation

If you prefer, you can also create these tables using the Supabase Table Editor:

1. Go to Table Editor in Supabase Dashboard
2. Create the following tables with these columns:

### billing_companies
- id (uuid, primary key)
- name (text)
- code (text, unique)
- email (text)
- active (boolean)

### laboratories  
- id (uuid, primary key)
- billing_company_id (uuid, foreign key to billing_companies)
- name (text)
- code (text, unique)
- email (text)
- active (boolean)

Then update the clients table to add:
- laboratory_id (uuid, foreign key to laboratories)
- parent_id (uuid, self-referential foreign key to clients)

## Verification

After running the migration, verify the tables exist by running:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('billing_companies', 'laboratories', 'parent_accounts', 'cpt_mappings', 'fee_schedules', 'credits', 'disputes');
```

You should see all the new tables listed.