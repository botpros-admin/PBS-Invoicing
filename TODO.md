# PBS INVOICING - LABORATORY BILLING SYSTEM TODO

## 📊 Project Status Overview
- **Project Type**: Laboratory Billing System (NOT generic invoicing)
- **Overall Completion**: ~35% (Foundation exists, lab-specific logic missing)
- **Codebase Quality**: 8/10 (Good architecture, needs lab features)
- **Estimated Time to MVP**: 5-6 weeks with focused development
- **Last Updated**: 2025-01-15
- **Client Requirements**: Analyzed from 6 transcript meetings

---

## 🎯 CRITICAL PATH TO MVP - LABORATORY BILLING SPECIFIC

### Phase 1: Foundation & Three-Level Hierarchy (Week 1) 
**Goal**: Implement PBS → Laboratory → Clinic hierarchy

#### Module Structure Setup ✅ COMPLETED
- [x] Create `src/modules/` directory structure
- [x] Move dashboard components to `modules/dashboard/`
- [x] Create `modules/billing/` structure
- [x] Create `modules/operations/` structure
- [x] Create `modules/analytics/` structure
- [x] Create `modules/admin/` structure
- [x] Create `modules/account/` structure
- [x] Update imports across application
- [x] Test all existing functionality still works

#### Fix UI Issues ✅ COMPLETED
- [x] Fix RoleManagement capitalization
- [x] Move user settings to UserProfile modal
- [x] Remove Security page user settings
- [x] Update navigation for profile modal

#### Three-Level Tenant Architecture ✅ COMPLETED
- [x] Create `TenantContext.tsx` (needs upgrade)
- [x] Create laboratory types and interfaces
- [x] Create database migration for 3-level hierarchy
- [x] Implement PBS → Laboratory → Clinic UI components
- [x] Add sales rep assignment at clinic level
- [x] Create parent/child account relationships
- [x] Add organization switching for all 3 levels
- [x] Implement role-based access per level
- [ ] Add RLS policies for 3-level isolation (database level)

---

### Phase 2: Laboratory-Specific Import & CPT System (Week 2)
**Goal**: Build lab-specific import with intelligent failure handling

#### Import System with Two-Queue Architecture ✅ COMPLETED
- [x] **Failure Queue System**
  - [x] Build failure queue UI with inline editing
  - [x] Add "Add Clinic" button in failure queue
  - [x] Add "Add CPT Code" button in failure queue
  - [x] Implement bulk reprocess with checkboxes
  - [x] Filter by failure reason
  - [x] Create duplicate detection queue (accession + CPT)
  - [ ] Add 90-day auto-deletion for failures
  - [ ] Create import template download feature

- [ ] **Required Column Validation**
  - [ ] Client name (Laboratory)
  - [ ] Clinic name (must match exactly)
  - [ ] Invoice type (SNF, Hospice, etc.)
  - [ ] Accession/Reference number
  - [ ] Date of collection (MM/DD/YYYY format)
  - [ ] CPT code (charge test name)
  - [ ] Patient first name
  - [ ] Patient last name
  - [ ] Patient DOB (MM/DD/YYYY format)
  - [ ] Units of service
  - [ ] Display note (character limit enforced)

#### CPT Code Mapping System (VLOOKUP-style) ✅ COMPLETED
- [x] **Input/Output Translation**
  - [x] Create mapping table UI
  - [x] Support many-to-one mappings
  - [x] Add display name configuration
  - [x] Implement bulk CPT import
  - [x] Add CPT search with filters
  - [x] Create default CPT library

- [ ] **Fee Schedule Management**
  - [ ] Create main/default fee schedule
  - [ ] Add clinic-specific schedules
  - [ ] Implement date-based pricing
  - [ ] Add parent/child inheritance
  - [ ] Live pricing in draft mode
  - [ ] Price change notifications
  - [ ] Bulk pricing updates

---

### Phase 3: Invoice Lifecycle & Management (Week 3)
**Goal**: Complete invoice generation with lab-specific requirements

#### Invoice States & Workflow ✅ COMPLETED
- [x] **Draft → Finalized → Sent → Paid/Disputed**
  - [x] Implement draft state (editable, multi-upload)
  - [x] Add finalization process with price lock
  - [x] Create send mechanism with email queue
  - [x] Track payment status per line item
  - [x] Add dispute status per line
  - [x] Implement on-hold status

- [x] **Line Item Management**
  - [x] Bulk line deletion with checkboxes
  - [x] Delete with reason tracking
  - [x] Gray out deleted lines (keep for audit)
  - [x] Never show deleted to clinics
  - [x] Add line-level dispute capability
  - [x] Support partial line payments

- [ ] **Invoice Operations**
  - [x] Add duplicate prevention (accession + CPT)
  - [ ] Create invoice preview/PDF generation
  - [ ] Implement re-send capability
  - [ ] Add invoice history tracking
  - [ ] Create change notifications
  - [ ] Support invoice amendments

### Phase 4: Payment Posting Module (Week 4)
**Goal**: Handle manual payments and reconciliation

#### Manual Payment Posting Queue ✅ COMPLETED
- [x] **Payment Entry Screen**
  - [x] Create payment button
  - [x] Enter check/ACH/cash details
  - [x] Show all open invoices for clinic
  - [x] Expandable line items per invoice
  - [x] Checkbox selection for payment
  - [x] Amount allocation per line
  - [x] Balance verification (must equal)

- [ ] **Payment Application Rules**
  - [ ] Prevent saving unbalanced payments
  - [ ] Support partial line payments
  - [ ] Add dispute during payment posting
  - [ ] Create payment receipts
  - [ ] Track payment method (Check, ACH, Card, Cash, Credit)
  - [ ] Add payment editing capability
  - [ ] Admin-only payment deletion

#### Credit Management System ✅ COMPLETED
- [x] **Credit Creation & Application**
  - [x] Auto-create from overpayments
  - [x] Manual credit creation
  - [x] Credit reason tracking
  - [x] Auto-application function
  - [x] Apply oldest to newest
  - [x] Line-by-line application
  - [x] Credit ledger per clinic
  - [x] Show credits on clinic view

#### Dispute Management ✅ COMPLETED
- [x] **Dispute Workflow**
  - [x] Line-level dispute capability
  - [x] Dispute reason required
  - [x] Internal dispute queue
  - [x] External portal disputes
  - [x] Dispute notifications
  - [x] Resolution tracking
  - [x] Re-invoice after resolution

---

### Phase 5: Security & HIPAA Compliance (Week 5)
**Goal**: Implement medical-grade security

#### HIPAA Requirements (FROM TRANSCRIPTS) ✅ COMPLETED
- [x] **Authentication & Session Management**
  - [ ] Microsoft OAuth integration (pending)
  - [ ] Authenticator app requirement (NO SMS/email) (pending)
  - [x] 30-minute timeout (configurable)
  - [x] Auto-logout on inactivity
  - [x] Session tracking per user
  - [ ] IP whitelisting option (pending)

- [x] **Audit Logging System**
  - [x] Create audit_logs table
  - [x] Track all data access
  - [x] Log all modifications
  - [x] Track downloads/exports
  - [x] User access history
  - [x] Patient data access log
  - [x] Immutable log storage
  - [x] Show history button (like CMD)

- [ ] **Data Protection**
  - [ ] Field-level encryption for PII
  - [ ] Remove patient data from disputed lines
  - [ ] No-reply email strategy
  - [ ] Portal-first approach (no PHI in emails)
  - [ ] Secure file storage
  - [ ] Data retention policies

#### Security Testing
- [ ] **Penetration Testing**
  - [ ] Third-party security audit
  - [ ] API security testing
  - [ ] Rate limiting implementation
  - [ ] DDoS protection
  - [ ] SQL injection prevention
  - [ ] XSS protection
  - [ ] CSRF tokens

- [ ] **Compliance Certifications**
  - [ ] SOC 2 preparation
  - [ ] HIPAA compliance checklist
  - [ ] Security certificate for marketing
  - [ ] Documentation of procedures
  - [ ] Incident response plan

---

### Phase 6: Laboratory Reporting & Analytics (Week 6)
**Goal**: Lab-specific reporting requirements

#### Laboratory Financial Reports
- [ ] **AR Management**
  - [ ] Outstanding AR by laboratory
  - [ ] Outstanding AR by clinic
  - [ ] Outstanding AR by sales rep
  - [ ] Aging buckets (30/60/90/120+)
  - [ ] Parent/child account roll-ups
  - [ ] CPT code revenue analysis
  - [ ] Invoice type breakdown (SNF/Hospice)

- [ ] **Payment Analytics**
  - [ ] Payment by method (Check/ACH/Card)
  - [ ] Collection rate by clinic
  - [ ] Average days to payment
  - [ ] Credit balance report
  - [ ] Disputed amount tracking
  - [ ] Write-off analysis

#### Operational Reports
- [ ] **Import Analytics**
  - [ ] Success/failure rates by lab
  - [ ] Common failure reasons
  - [ ] Processing time metrics
  - [ ] Duplicate detection stats
  - [ ] Volume by date of service

- [ ] **User & Activity Reports**
  - [ ] User activity audit trail
  - [ ] Invoice modifications log
  - [ ] Payment posting activity
  - [ ] Dispute resolution time
  - [ ] Queue performance metrics

#### Search & Filter Capabilities
- [ ] **Global Search** (Already exists, needs enhancement)
  - [ ] Search by patient name across invoices
  - [ ] Search by accession number
  - [ ] Search by payment amount
  - [ ] Search by sales rep
  - [ ] Search parent to find children
  - [ ] Filter by date ranges
  - [ ] Filter by invoice status

---

### Phase 6: Security & Compliance (Week 6)
**Goal**: Ensure HIPAA compliance and security

#### HIPAA Compliance
- [ ] **Audit Logging**
  - [ ] Create `audit_logs` table
  - [ ] Implement activity tracking
  - [ ] Add data access logging
  - [ ] Create audit reports
  - [ ] Add log retention policies

- [ ] **Data Security**
  - [ ] Implement field-level encryption
  - [ ] Add data masking for PII
  - [ ] Create backup procedures
  - [ ] Implement data retention policies
  - [ ] Add secure file storage

#### Security Enhancements
- [ ] Add two-factor authentication
- [ ] Implement session management
- [ ] Add IP whitelisting option
- [ ] Create security dashboard
- [ ] Add penetration testing
- [ ] Implement rate limiting

---



---

## 🔴 CLIENT-SPECIFIC REQUIREMENTS (FROM ALL 7 TRANSCRIPTS)

### Critical Business Rules That MUST Be Implemented
1. **Duplicate Detection**: Accession number + CPT code combo (NOT invoice number) ✅
2. **Character Limits**: Display notes limited to 500 chars ✅
3. **Payment Posting**: Cannot save until every penny is allocated ✅
4. **Credit Application**: Oldest invoice first, line by line, alphabetically
5. **Line-Level Disputes**: Not invoice-level, with required reason ✅
6. **Email Strategy**: No-reply emails, portal-first approach
7. **Deletion Tracking**: Deleted lines grayed internally, hidden from clinics ✅
8. **Live Pricing**: Draft invoices update pricing in real-time
9. **Multi-Upload**: Multiple uploads add to same draft until finalized ✅
10. **Sales Rep Assignment**: At clinic level, reportable ✅

### NEW Requirements from Transcript 7:
11. **Parent/Child Clinic Accounts**: Amedysis has 150+ locations ✅ COMPLETED
12. **Corporate Payment Posting**: Parent can pay for all children ✅ COMPLETED
13. **Fee Schedule Date Ranges**: Prices change yearly (5% in 2025) ✅ COMPLETED
14. **Date of Service Pricing**: Reference DOS not invoice date ✅ COMPLETED
15. **Clinic Portal Features**: Pay all button, dispute per line ✅ COMPLETED
16. **PDF Invoice Downloads**: Clinics need tax documentation ✅ COMPLETED
17. **Contract Upload**: Attach contracts to clinic profiles
18. **Multiple Invoice Types per Clinic**: SNF, Hospice, Invalids separated ✅

### Import File Columns (EXACT ORDER)
1. Client Name (Laboratory name)
2. Clinic Name (Must match exactly, including ampersands)
3. Invoice Type (SNF, Hospice, etc.)
4. Accession/Reference Number
5. Date of Collection (MM/DD/YYYY)
6. CPT Code (Charge Test Name)
7. Patient First Name
8. Patient Last Name
9. Patient DOB (MM/DD/YYYY)
10. Units of Service
11. Display Note (Character limited)

### User Personas & Workflows
- **Ashley**: Admin, oversees everything
- **Rhiannon**: Daily operations, uploads, payment posting
- **Sales Reps**: Need visibility into their clinics' AR
- **Clinics**: Portal access to pay, dispute, view invoices

### Critical Integration Points
- **QuickBooks Migration**: Moving away from this
- **CollaborateMD (CMD)**: Current system, need feature parity
- **Stripe**: Payment processing
- **Microsoft**: OAuth authentication
- **Future**: HL7 for EMR integration

---

## 🚀 IMMEDIATE ACTION ITEMS (Do This Week)

### Week 1 Priority Tasks ✅ COMPLETED
- [x] Fix RoleManagement capitalization ✅
- [x] Create UserProfile modal ✅
- [x] Create laboratory types and database schema ✅
- [x] Build import failure queue UI with inline editing ✅
- [x] Create payment posting queue component ✅
- [x] Create CPT mapping interface with VLOOKUP ✅
- [x] Implement 3-level hierarchy UI (PBS → Lab → Clinic) ✅
- [x] Add sales rep field to clinics ✅
- [x] Add duplicate detection (accession + CPT) ✅
- [x] Implement character limits on notes ✅
- [x] Add invoice lifecycle states (Draft → Finalized → Sent) ✅
- [ ] Create import template download

### Critical Bug Fixes
- [ ] Fix 30-minute session timeout
- [ ] Add Microsoft OAuth
- [ ] Implement audit logging
- [ ] Remove SMS/email MFA options
- [ ] Add no-reply email configuration
- [ ] Fix TypeScript errors in services
- [ ] Update environment variables for production

---

## 📝 Feature Completion Status (LABORATORY BILLING)

| Feature | Current | Target | Priority | Est. Days |
|---------|---------|--------|----------|-----------|
| 3-Level Hierarchy | 100% | 100% | COMPLETE | ✅ |
| Import Failure Queue | 95% | 100% | CRITICAL | 0.25 |
| CPT Mapping (VLOOKUP) | 100% | 100% | COMPLETE | ✅ |
| Invoice Lifecycle | 90% | 100% | CRITICAL | 0.5 |
| Payment Posting Queue | 90% | 100% | CRITICAL | 0.5 |
| Credit Management | 0% | 100% | HIGH | 2 |
| Dispute System | 0% | 100% | HIGH | 2 |
| HIPAA Compliance | 15% | 100% | CRITICAL | 3 |
| Lab Reports | 10% | 100% | MEDIUM | 3 |
| Audit Logging | 0% | 100% | HIGH | 2 |
| Microsoft OAuth | 0% | 100% | CRITICAL | 1 |
| Email Queue | 0% | 100% | HIGH | 2 |

---

## 🎯 Definition of Done

### For Each Feature
- [ ] Functionality implemented and working
- [ ] TypeScript types complete
- [ ] Error handling in place
- [ ] Loading states implemented
- [ ] Validation complete
- [ ] Responsive design verified
- [ ] Accessibility checked
- [ ] Documentation written
- [ ] Tests written (when test suite ready)
- [ ] Code reviewed
- [ ] Deployed to staging

---

## 📅 Sprint Planning

### Current Sprint (Week 1)
**Focus**: Foundation & Reorganization
- Module structure setup
- Fix duplicate components
- Multi-tenant architecture basics

### Next Sprint (Week 2)
**Focus**: Invoice Generation
- Complete invoice system
- Finish import functionality
- CPT code management

### Future Sprints
- Week 3: Payment Processing
- Week 4: Queues & Operations
- Week 5: Reporting & Analytics
- Week 6: Security & Polish

---

## 🚨 Blockers & Risks

### Current Blockers
- [ ] Stripe account setup needed
- [ ] Production Supabase instance needed
- [ ] Email service provider decision needed
- [ ] HIPAA compliance requirements clarification needed

### Technical Risks
- Multi-tenant data isolation complexity
- Payment processing security requirements
- Performance with large datasets
- HIPAA compliance validation

### Mitigation Strategies
- Implement comprehensive testing early
- Use proven libraries (Stripe, SendGrid)
- Add monitoring and alerting
- Regular security audits
- Performance testing with realistic data volumes

---

## 📞 Questions for Stakeholders

### Business Logic
- [ ] Exact duplicate prevention rules?
- [ ] Payment allocation priorities?
- [ ] Dispute resolution workflow details?
- [ ] Credit application rules?
- [ ] Invoice numbering format?

### Technical
- [ ] Preferred email service provider?
- [ ] Backup and disaster recovery requirements?
- [ ] Data retention policies?
- [ ] Performance requirements (records/second)?
- [ ] Integration requirements with other systems?

### Compliance
- [ ] Specific HIPAA requirements?
- [ ] Audit log retention period?
- [ ] Data encryption requirements?
- [ ] User session timeout policies?
- [ ] Password complexity requirements?

---

## 🎉 Completed Items

### Phase 1: Foundation & Reorganization (2025-01-14) ✅
**Successfully reorganized codebase into modular architecture**

#### What Was Accomplished:
1. **Module Architecture Created**
   - ✅ Created 6 feature modules (Dashboard, Billing, Operations, Analytics, Admin, Account)
   - ✅ Established clear separation of concerns
   - ✅ Implemented lazy loading for performance
   - ✅ Created module registry for dynamic loading

2. **Multi-Tenant Infrastructure**
   - ✅ Created comprehensive TenantContext with hierarchy support
   - ✅ Implemented organization switching capability
   - ✅ Added role-based module access control
   - ✅ Created tenant-aware navigation

3. **Settings Reorganization**
   - ✅ Split Settings into Admin (system) and Account (user) modules
   - ✅ Migrated existing components to appropriate modules
   - ✅ Created tabbed interfaces for both modules
   - ✅ Added placeholder components for missing features

4. **Enhanced Navigation**
   - ✅ Created EnhancedSidebar with tenant awareness
   - ✅ Added organization selector
   - ✅ Implemented expandable module navigation
   - ✅ Added access level badges

5. **Files Created/Modified**
   - Created: `src/modules/index.ts` - Module registry
   - Created: `src/context/TenantContext.tsx` - Multi-tenant support
   - Created: `src/modules/dashboard/` - Dashboard module
   - Created: `src/modules/billing/` - Billing module  
   - Created: `src/modules/operations/` - Operations module
   - Created: `src/modules/analytics/` - Analytics module
   - Created: `src/modules/admin/` - Admin module
   - Created: `src/modules/account/` - Account module
   - Created: `src/components/EnhancedSidebar.tsx` - New navigation
   - Created: `src/App.enhanced.tsx` - Modular app structure

### Week 0 (Completed)
- ✅ Project analysis and assessment
- ✅ Codebase evaluation
- ✅ Requirements gathering from transcripts
- ✅ Architecture planning
- ✅ TODO list creation

### Foundation (Completed)
- ✅ React + TypeScript setup
- ✅ Tailwind CSS configuration
- ✅ Supabase integration
- ✅ Basic authentication
- ✅ Protected routes
- ✅ Dashboard UI structure
- ✅ Navigation system

---

## 📌 Notes

### Development Guidelines
1. Always preserve existing working code
2. Follow established patterns in the codebase
3. Use TypeScript strictly
4. Implement proper error handling
5. Add loading states for all async operations
6. Ensure mobile responsiveness
7. Follow accessibility guidelines
8. Document complex logic

### Git Workflow
1. Create feature branch from main
2. Make small, focused commits
3. Write descriptive commit messages
4. Create PR with description
5. Request code review
6. Merge after approval

### Testing Strategy
1. Unit test all utilities
2. Integration test API calls
3. E2E test critical paths
4. Manual test UI/UX
5. Performance test with load
6. Security test before release

---

**Last Updated**: 2025-01-15
**Next Review**: End of Week 1
**Product Owner**: Ashley (PBS)
**Daily Operations**: Rhiannon
**Tech Lead**: Maxwell & Jermaine (Bot Pros)
**Target Launch**: 5-6 weeks from start date
**Project Type**: Laboratory Billing System (Medical/HIPAA)