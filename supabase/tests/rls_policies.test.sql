-- supabase/tests/rls_policies.test.sql
BEGIN;

-- Plan the tests
SELECT plan(10);

-- Seed data for testing
-- 1. Organization
INSERT INTO public.organizations (id, name) OVERRIDING SYSTEM VALUE VALUES (1, 'Billing Co');

-- 2. Lab
INSERT INTO public.labs (id, organization_id, name) OVERRIDING SYSTEM VALUE VALUES (100, 1, 'Test Lab A');
INSERT INTO public.labs (id, organization_id, name) OVERRIDING SYSTEM VALUE VALUES (101, 1, 'Test Lab B');


-- 3. Clinics
INSERT INTO public.clinics (id, client_id, name, address) OVERRIDING SYSTEM VALUE VALUES (1000, 100, 'Test Clinic A1', '123 Main St');
INSERT INTO public.clinics (id, client_id, name, address) OVERRIDING SYSTEM VALUE VALUES (1001, 100, 'Test Clinic A2', '456 Oak Ave');
INSERT INTO public.clinics (id, client_id, name, address) OVERRIDING SYSTEM VALUE VALUES (1002, 101, 'Test Clinic B1', '789 Pine Ln');

-- 4. Users
-- Billing Co Admin
INSERT INTO auth.users (id, email, role) VALUES ('00000000-0000-0000-0000-000000000001', 'admin@billing.co', 'authenticated');
INSERT INTO public.users (auth_id, organization_id, role) VALUES ('00000000-0000-0000-0000-000000000001', 1, 'admin');

-- Lab A User
INSERT INTO auth.users (id, email, role) VALUES ('00000000-0000-0000-0000-000000000002', 'user@laba.com', 'authenticated');
INSERT INTO public.users (auth_id, lab_id, role) VALUES ('00000000-0000-0000-0000-000000000002', 100, 'lab_user');

-- Clinic A1 User
INSERT INTO auth.users (id, email, role) VALUES ('00000000-0000-0000-0000-000000000003', 'user@clinica1.com', 'authenticated');
INSERT INTO public.client_users (clinic_id, user_id, role) VALUES (1000, '00000000-0000-0000-0000-000000000003', 'clinic_user');


--- Test Cases ---

-- Test 1: Billing Co Admin can see all labs in their organization
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
SELECT is((SELECT COUNT(*)::INT FROM public.labs), 2, 'Admin should see all 2 labs');

-- Test 2: Billing Co Admin can see all clinics in their organization
SELECT is((SELECT COUNT(*)::INT FROM public.clinics), 3, 'Admin should see all 3 clinics');


-- Test 3: Lab A User can only see their own lab
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated"}', true);
SELECT is((SELECT COUNT(*)::INT FROM public.labs), 1, 'Lab A user should see only 1 lab');
SELECT is((SELECT name FROM public.labs LIMIT 1), 'Test Lab A', 'Lab A user should see "Test Lab A"');

-- Test 4: Lab A User can only see clinics associated with their lab
SELECT is((SELECT COUNT(*)::INT FROM public.clinics), 2, 'Lab A user should see 2 clinics');

-- Test 5: Lab A User cannot see Lab B's clinics
SELECT is_empty('SELECT * FROM public.clinics WHERE id = 1002', 'Lab A user should not see Lab B clinics');


-- Test 6: Clinic A1 User can only see their own clinic
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000003", "role": "authenticated"}', true);
SELECT is((SELECT COUNT(*)::INT FROM public.clinics), 1, 'Clinic A1 user should see only 1 clinic');
SELECT is((SELECT name FROM public.clinics LIMIT 1), 'Test Clinic A1', 'Clinic A1 user should see "Test Clinic A1"');

-- Test 7: Clinic A1 User cannot see other clinics
SELECT is_empty('SELECT * FROM public.clinics WHERE id = 1001', 'Clinic A1 user should not see other clinics');

-- Test 8: Anonymous user cannot see any labs
SELECT set_config('role', 'anon', true);
SELECT set_config('request.jwt.claims', '{"sub": "anonymous", "role": "anon"}', true);
SELECT is_empty('SELECT * FROM public.labs', 'Anonymous user should not see any labs');


-- Finish the tests
SELECT * FROM finish();

ROLLBACK;
