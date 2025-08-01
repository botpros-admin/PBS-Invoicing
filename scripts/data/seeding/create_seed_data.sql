-- PBS Invoicing Seed Data Script for Supabase
-- This script populates the database with sample data for testing

-- Organization
INSERT INTO organizations (name, address, city, state, zip_code, phone, email)
VALUES ('PBS Medical Billing', '123 Healthcare Ave', 'San Francisco', 'CA', '94105', '(415) 555-0123', 'contact@pbs.com');

-- Users
INSERT INTO users (auth_id, organization_id, first_name, last_name, email, role, status)
VALUES 
('auth_id_admin', 1, 'Admin', 'User', 'admin@pbs.com', 'admin', 'active'),
('auth_id_manager', 1, 'AR', 'Manager', 'manager@pbs.com', 'ar_manager', 'active'),
('auth_id_staff', 1, 'Staff', 'User', 'staff@pbs.com', 'staff', 'active');

-- Clients
INSERT INTO clients (organization_id, name, address_line1, city, state, zip_code, main_phone)
VALUES 
(1, 'City Medical Center', '500 Hospital Dr', 'San Francisco', 'CA', '94110', '(415) 555-1000'),
(1, 'Valley Health Partners', '123 Valley Rd', 'Oakland', 'CA', '94618', '(510) 555-2000');

-- Clinics
INSERT INTO clinics (client_id, name, facility_type, address_line1, city, state, zip_code, main_phone, is_active)
VALUES 
(1, 'City Medical - Main', 'hospital', '500 Hospital Dr', 'San Francisco', 'CA', '94110', '(415) 555-1000', true),
(1, 'City Medical - Downtown', 'clinic', '123 Market St', 'San Francisco', 'CA', '94105', '(415) 555-1100', true),
(2, 'Valley General Hospital', 'hospital', '123 Valley Rd', 'Oakland', 'CA', '94618', '(510) 555-2000', true);

-- Patients
INSERT INTO patients (client_id, first_name, last_name, mrn)
VALUES
(1, 'John', 'Smith', 'MRN12345'),
(1, 'Jane', 'Doe', 'MRN12346'),
(2, 'Robert', 'Johnson', 'MRN54321');

-- CPT Codes
INSERT INTO cpt_codes (code, description, default_price, is_active)
VALUES
('99213', 'Office visit, established patient - moderate complexity', 120.00, true),
('99214', 'Office visit, established patient - high complexity', 180.00, true),
('80053', 'Comprehensive metabolic panel', 85.00, true);

-- Invoices
INSERT INTO invoices (
  client_id, clinic_id, patient_id, invoice_number, 
  date_created, date_due, status,
  subtotal, total, amount_paid, balance
)
VALUES
(1, 1, 1, 'INV-1001', '2025-01-15', '2025-02-15', 'sent', 120.00, 120.00, 0.00, 120.00),
(1, 2, 2, 'INV-1002', '2025-01-20', '2025-02-20', 'partial', 265.00, 265.00, 100.00, 165.00),
(2, 3, 3, 'INV-1003', '2025-01-25', '2025-02-25', 'paid', 180.00, 180.00, 180.00, 0.00);

-- Invoice Items
INSERT INTO invoice_items (
  invoice_id, cpt_code_id, description, date_of_service, 
  quantity, unit_price, total, is_disputed
)
VALUES
(1, 1, 'Office visit - moderate complexity', '2025-01-10', 1, 120.00, 120.00, false),
(2, 1, 'Office visit - moderate complexity', '2025-01-15', 1, 120.00, 120.00, false),
(2, 3, 'Comprehensive metabolic panel', '2025-01-15', 1, 85.00, 85.00, true),
(3, 2, 'Office visit - high complexity', '2025-01-20', 1, 180.00, 180.00, false);

-- Payments
INSERT INTO payments (
  client_id, payment_number, payment_date, amount, 
  method, reference_number, status, reconciliation_status
)
VALUES
(1, 'PMT-501', '2025-02-01', 100.00, 'check', 'CHK12345', 'received', 'fully_reconciled'),
(2, 'PMT-502', '2025-02-05', 180.00, 'ach', 'ACH98765', 'received', 'fully_reconciled');

-- Payment Allocations
INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount)
VALUES
(1, 2, 100.00),
(2, 3, 180.00);
