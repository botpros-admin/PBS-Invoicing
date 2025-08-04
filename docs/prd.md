# PBS Invoicing Brownfield Enhancement PRD

## Intro Project Analysis and Context

### Existing Project Overview

#### Analysis Source

IDE-based fresh analysis and the `brownfield-architecture.md` document located in `docs/brownfield-architecture.md`.

#### Current Project State

The project is a functional React-based SPA for invoicing, utilizing Supabase for the backend. It includes core features like user authentication, invoice creation, and a dashboard. The current architecture is sound but lacks the multi-tenancy, complex pricing, and robust data import features required for the next phase of development.

### Available Documentation Analysis

#### Available Documentation

- [x] Tech Stack Documentation
- [x] Source Tree/Architecture
- [ ] Coding Standards
- [x] API Documentation
- [ ] External API Documentation
- [ ] UX/UI Guidelines
- [x] Technical Debt Documentation
- [ ] "Other: "

### Enhancement Scope Definition

#### Enhancement Type

- [x] New Feature Addition
- [x] Major Feature Modification
- [x] Integration with New Systems
- [ ] Performance/Scalability Improvements
- [ ] UI/UX Overhaul
- [ ] Technology Stack Upgrade
- [ ] Bug Fix and Stability Improvements
- [ ] "Other: "

#### Enhancement Description

This enhancement will modernize the PBS Invoicing application by introducing a multi-level user role system (Billing Company, Laboratory, Clinic), a dynamic pricing engine with custom schedules, a robust data import and validation pipeline, and a comprehensive dispute management workflow.

#### Impact Assessment

- [ ] Minimal Impact (isolated additions)
- [ ] Moderate Impact (some existing code changes)
- [ ] Significant Impact (substantial existing code changes)
- [x] Major Impact (architectural changes required)

### Goals and Background Context

#### Goals

*   Implement a secure, multi-tenant architecture with role-based access control.
*   Create a flexible invoicing system that supports complex billing scenarios.
*   Develop a dynamic pricing engine to handle custom fee schedules.
*   Build a reliable data import system to streamline the onboarding of new clients.
*   Introduce a formal dispute management workflow to improve communication and resolution times.

#### Background Context

The current PBS Invoicing application serves as a solid MVP but needs to evolve to meet the complex needs of billing companies, laboratories, and clinics. The enhancements outlined in this PRD are based on extensive client feedback and are designed to transform the application into a comprehensive, enterprise-grade billing solution. This modernization will enable PBS to serve a wider range of clients and handle more complex billing workflows, ultimately driving revenue growth and improving customer satisfaction.

### User Experience (UX) Goals

*   **Intuitive Navigation:** The application should be easy to navigate for all user roles, with clear paths to key features and information.
*   **Dynamic UI:** The user interface should be dynamic and responsive, adapting to the specific needs and permissions of each user role.
*   **Logical Grouping:** All features, data, and actions should be logically grouped and categorized to match the mental models of the users.
*   **Data-Driven Workflows:** The application should guide users through complex workflows, such as invoice creation and dispute management, in a clear and intuitive manner.
*   **Consistency:** The UI should be consistent across the application, with a predictable and easy-to-understand design language.
*   **Strict Uniformity:** All new UI components and views must strictly adhere to the existing design system, including colors, typography, spacing, and element types. No "oddball" or one-off components should be introduced.

### Change Log

| Change | Date | Version | Description | Author |
| --- | --- | --- | --- | --- |
| Initial Draft | 2025-08-01 | 1.0 | First draft of the PRD | Gemini |
| Added UX Goals | 2025-08-01 | 1.1 | Added a section for User Experience Goals based on user feedback. | Gemini |
| Refined Requirements | 2025-08-01 | 1.2 | Restructured Functional and Non-Functional requirements for better logical grouping and clarity. | Gemini |
| Added Epic and Stories | 2025-08-01 | 1.3 | Defined the epic and user stories for the enhancement. | Gemini |
| Added UI Uniformity | 2025-08-01 | 1.4 | Added a specific requirement for UI uniformity. | Gemini |

## Requirements

### Functional Requirements

*   **FR1: Core Entity Management**
    *   FR1.1: The system must support a hierarchy of: Billing Company -> Laboratory -> Clinic.
    *   FR1.2: The system must support parent/child relationships between Clinics.
    *   FR1.3: Invoices must be associated with a Clinic.
    *   FR1.4: An Invoice must contain line items referencing multiple Patients and their specific Accession Numbers.
*   **FR2: User and Access Management (RBAC)**
    *   FR2.1: The system must support three user roles: Billing Company, Laboratory, and Clinic.
    *   FR2.2: Billing Company users must be able to manage and view all Laboratories within their organization.
    *   FR2.3: Laboratory users must only be able to access their own Laboratory's data and its associated Clinics.
    *   FR2.4: Clinic users must only be able to access their own Clinic's data. A user of a parent clinic should have an option to view data for its child clinics.
*   **FR3: Pricing & Fee Schedules**
    *   FR3.1: The system must support a default price schedule for each Laboratory.
    *   FR3.2: The system must allow the creation of custom price schedules for specific Clinics, which override the default prices.
    *   FR3.3: If a CPT code is not on a custom schedule, the system must fall back to the Laboratory's default price.
    *   FR3.4: The system must support importing price schedules from CSV or Excel files.
*   **FR4: Data Import & Validation**
    *   FR4.1: The system must provide a mechanism for importing billing data from CSV or Excel files.
    *   FR4.2: The import process must validate data, ensuring Clinic names and CPT codes exist.
    *   FR4.3: The import process must prevent duplicate line items based on a unique combination of `accession_number` and `cpt_code`.
    *   FR4.4: The system must provide a detailed error report for failed or partial imports, allowing users to correct and re-process failures.
    *   FR4.5: The system must allow a manual override for duplicate import warnings.
*   **FR5: Invoice & Payment Workflow**
    *   FR5.1: The system must support manual and automated invoice generation.
    *   FR5.2: Clinic users must be able to dispute individual line items on an invoice, providing a reason.
    *   FR5.3: A disputed line item's value must be temporarily excluded from the "Amount Due" for payment, but the total balance should remain unchanged.
    *   FR5.4: Billing Company users must be able to review, approve, or deny disputes with notes.
    *   FR5.5: A specific line item can only be disputed once. Once a dispute is resolved, it cannot be re-disputed.
    *   FR5.6: The system must provide a public-facing portal for paying an invoice using only the invoice number, without displaying patient data.

### Non-Functional Requirements

*   **NFR1: Security & Compliance**
    *   NFR1.1: The system must be HIPAA compliant in all aspects of data storage, transmission, and access.
    *   NFR1.2: All sensitive data, including PHI and financial information, must be encrypted at rest and in transit.
    *   NFR1.3: The system must implement strict Role-Based Access Control (RBAC) to enforce the principle of least privilege for all user roles.
    *   NFR1.4: The system must maintain a detailed audit log of all actions related to viewing or modifying sensitive data.
*   **NFR2: Performance & Responsiveness**
    *   NFR2.1: The application must achieve a Lighthouse performance score of 85+ for key pages (Dashboard, Invoice List).
    *   NFR2.2: API requests for fetching data must respond in under 500ms on average.
    *   NFR2.3: The data import process for a file of 1,000 rows should be acknowledged within 5 seconds and completed in under 2 minutes.
*   **NFR3: Usability & Accessibility**
    *   NFR3.1: The user interface must be intuitive and align with the UX Goals defined in this document.
    *   NFR3.2: The application must be responsive and fully functional on modern web browsers (Chrome, Firefox, Safari, Edge) on both desktop and tablet devices.
    *   NFR3.3: The application should adhere to WCAG 2.1 Level AA accessibility standards.
    *   NFR3.4: All new UI components must be built using the existing component library and style guide. Any new component must be generic enough to be reusable and must be approved by the UX lead before implementation.
*   **NFR4: Scalability**
    *   NFR4.1: The system architecture must support scaling to handle 100+ laboratories, 10,000+ clinics, and over 1 million invoice line items per month without significant performance degradation.
*   **NFR5: Data Integrity**
    *   NFR5.1: All financial calculations must be accurate to two decimal places.
    *   NFR5.2: The data import process must not corrupt or lose data. Failed imports must be reversible or correctable without manual database intervention.
*   **NFR6: Maintainability**
    *   NFR6.1: New code must adhere to the existing coding style and patterns of the project.
    *   NFR6.2: New components and services must be modular and loosely coupled to facilitate future enhancements.

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: This enhancement will be structured as a single, comprehensive epic. All the requirements are highly interconnected and contribute to a unified goal: modernizing the application into a multi-tenant, enterprise-grade billing platform. This approach will ensure a cohesive development process and mitigate integration risks.

## Epic 1: Application Modernization and Multi-Tenancy

**Epic Goal**: To transform the PBS Invoicing application into a secure, multi-tenant platform with advanced features for complex invoicing, dynamic pricing, and robust data management, supporting Billing Company, Laboratory, and Clinic user roles.

**Integration Requirements**: All new features must be seamlessly integrated with the existing React frontend and Supabase backend, adhering to the established architecture and coding patterns.

### Stories

*   **Story 1.1: Foundational Multi-Tenancy and RBAC**
    *   **As a** system administrator,
    *   **I want** to implement the database schema changes for multi-tenancy (Organizations, Labs, and parent/child Clinics) and configure Row Level Security (RLS) for the three user roles,
    *   **so that** the application has a secure foundation for role-based data access.
*   **Story 1.2: User Management for All Roles**
    *   **As a** Billing Company user,
    *   **I want** a user management interface to invite, view, and manage Laboratory and Clinic users, assigning them the appropriate roles,
    *   **so that** I can control access to the system.
*   **Story 1.3: Dynamic Pricing Engine**
    *   **As a** Billing Company user,
    *   **I want** to create and manage a default price schedule for each Laboratory and custom price schedules for specific Clinics,
    *   **so that** I can handle complex pricing agreements.
*   **Story 1.4: Advanced Invoice Data Model**
    *   **As a** developer,
    *   **I want** to refactor the invoice data model to support multiple patients and accession numbers per invoice,
    *   **so that** the system can accommodate complex billing scenarios.
*   **Story 1.5: Data Import and Validation**
    *   **As a** Billing Company user,
    *   **I want** to upload a CSV or Excel file with billing data, have it validated against the system's data, and see a clear report of any errors,
    *   **so that** I can efficiently import data from external systems.
*   **Story 1.6: Manual Invoice Creation and Management**
    *   **As a** Billing Company user,
    *   **I want** a user-friendly interface to manually create, edit, and manage invoices with multiple patients and line items,
    *   **so that** I can handle one-off billing scenarios.
*   **Story 1.7: Dispute Management Workflow**
    *   **As a** Clinic user,
    *   **I want** to be able to dispute a line item on an invoice and track the status of my dispute,
    *   **so that** I can resolve billing discrepancies efficiently.
*   **Story 1.8: External Payment Portal**
    *   **As a** Clinic user without an account,
    *   **I want** to be able to pay an invoice using only the invoice number,
    *   **so that** I can easily make payments without needing to log in.