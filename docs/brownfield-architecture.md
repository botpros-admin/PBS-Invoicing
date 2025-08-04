# Brownfield Architecture: PBS Invoicing Modernization

## 1. Overview

This document outlines the proposed architecture for the modernization of the PBS Invoicing application. The goal is to build upon the existing React/TypeScript and Supabase foundation to introduce advanced features for multi-level user roles, complex invoicing, dynamic pricing, and robust data import capabilities.

## 2. Current Architecture Summary

The existing application is a single-page application (SPA) built with React, TypeScript, and Vite. It uses Tailwind CSS for styling and React Router for navigation. The backend is powered by Supabase, with a service layer in the frontend that communicates with the Supabase API. Authentication is handled by Supabase Auth, and application state is managed via React Context.

## 3. Proposed Architectural Changes

### 3.1. Database Schema and User Roles

To support the three distinct user roles (Billing Company, Laboratory, Clinic), we will introduce the following changes to the database schema:

*   **`organizations` table:** This will represent the top-level entity, the "Billing Company".
*   **`labs` table:** This will be a new table to store laboratory information. It will have a foreign key relationship with the `organizations` table.
*   **`users` table:** We will add a `lab_id` column to associate users with a specific lab. We will also enforce role-based access control (RBAC) at the database level using Supabase's Row Level Security (RLS) policies.
*   **`clinics` table:** This table already exists but will be modified to include a `parent_clinic_id` to support parent/child relationships.
*   **`client_users` table:** A new table to manage clinic-level users, with limited permissions.

**RLS Policies:**

*   **Billing Company users:** Can access all labs within their organization.
*   **Laboratory users:** Can only access their own lab's data and associated clinics.
*   **Clinic users:** Can only access their own clinic's data.

### 3.2. Invoicing and Pricing Engine

The current invoicing system will be significantly enhanced to support the new requirements.

**Database Schema Changes:**

*   **`invoices` table:** We will remove the direct `patient_id` from this table. Invoices will be associated with a `clinic_id`.
*   **`invoice_line_items` table:** This table will include a `patient_id` and `accession_number` to link each line item to a specific patient and test.
*   **`price_schedules` table:** A new table to store the default and custom price schedules.
*   **`price_schedule_items` table:** A new table to store the individual CPT code prices for each price schedule.
*   **`disputes` table:** A new table to manage the dispute workflow, with fields for `reason`, `status`, `resolution_notes`, etc.

**Business Logic:**

*   **Invoice Generation:** A new serverless function (Supabase Edge Function) will be created to handle invoice generation. This function will aggregate all billable items for a clinic for a given period, apply the correct pricing rules, and create a new invoice.
*   **Pricing Engine:** A new module in the API layer will be responsible for calculating the price of each line item based on the clinic's assigned price schedule, falling back to the default schedule if no custom price is defined.
*   **Dispute Management:** The API will expose endpoints for clinics to submit disputes and for billing company users to review and resolve them.

### 3.3. Data Import and Validation

A new, more robust data import system will be implemented to handle the import of billing data from external systems.

**Architecture:**

1.  **File Upload:** The frontend will allow users to upload CSV/Excel files to a secure Supabase Storage bucket.
2.  **Import Queue:** A new `imports` table will be created to act as a queue. A new record will be created for each uploaded file.
3.  **Processing Function:** A Supabase Edge Function will be triggered when a new record is added to the `imports` table. This function will:
    *   Parse the uploaded file.
    *   Validate each row of data against the database (e.g., check for existing clinic names, valid CPT codes).
    *   **Duplicate Prevention:** Check for duplicate `accession_number` + `cpt_code` combinations.
    *   Create new invoice line items for valid data.
    *   Log any errors to an `import_errors` table.
4.  **Status Updates:** The frontend will poll the `imports` table to provide real-time feedback to the user on the import progress.

### 3.4. Frontend Architecture

The frontend will be updated to support the new features and provide a seamless user experience.

*   **New Components:**
    *   A new **"Admin" section** in the settings for managing labs, users, and price schedules.
    *   A dedicated **"Data Import" page** with a file uploader and progress monitoring.
    *   An enhanced **"Invoice Detail" page** with a dispute management section.
*   **State Management:** We will continue to use React Context for global state like the authenticated user. For more complex, local state (like the invoice creation form), we will use component-level state or consider a library like `zustand` if needed.
*   **API Layer:** The existing API service layer will be expanded with new functions to interact with the new database tables and serverless functions. All data fetching will be done through this layer, using `react-query` for caching and state management.

## 4. Technology Stack

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router
*   **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
*   **Data Fetching:** `react-query`

## 5. Next Steps

With this architecture in place, the next step is to create a detailed Product Requirements Document (PRD) that breaks down each feature into user stories and acceptance criteria. This will provide the development team with a clear roadmap for implementation.
