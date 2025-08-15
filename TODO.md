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

#### Three-Level Tenant Architecture 🚧 IN PROGRESS
- [x] Create `TenantContext.tsx` (needs upgrade)
- [ ] Implement PBS → Laboratory → Clinic hierarchy
- [ ] Add sales rep assignment at clinic level
- [ ] Create parent/child account relationships
- [ ] Add organization switching for all 3 levels
- [ ] Implement role-based access per level
- [ ] Add RLS policies for 3-level isolation

---

### Phase 2: Laboratory-Specific Import & CPT System (Week 2)
**Goal**: Build lab-specific import with intelligent failure handling

#### Import System with Two-Queue Architecture 🚧 CURRENT FOCUS
- [ ] **Failure Queue System**
  - [ ] Create duplicate detection queue (accession + CPT)
  - [ ] Build failure queue UI with inline editing
  - [ ] Add "Add Clinic" button in failure queue
  - [ ] Add "Add CPT Code" button in failure queue
  - [ ] Implement bulk reprocess with checkboxes
  - [ ] Filter by failure reason
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

#### CPT Code Mapping System (VLOOKUP-style)
- [ ] **Input/Output Translation**
  - [ ] Create mapping table UI
  - [ ] Support many-to-one mappings
  - [ ] Add display name configuration
  - [ ] Implement bulk CPT import
  - [ ] Add CPT search with filters
  - [ ] Create default CPT library

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

#### Invoice States & Workflow
- [ ] **Draft → Finalized → Sent → Paid/Disputed**
  - [ ] Implement draft state (editable, multi-upload)
  - [ ] Add finalization process with price lock
  - [ ] Create send mechanism with email queue
  - [ ] Track payment status per line item
  - [ ] Add dispute status per line
  - [ ] Implement on-hold status

- [ ] **Line Item Management**
  - [ ] Bulk line deletion with checkboxes
  - [ ] Delete with reason tracking
  - [ ] Gray out deleted lines (keep for audit)
  - [ ] Never show deleted to clinics
  - [ ] Add line-level dispute capability
  - [ ] Support partial line payments

- [ ] **Invoice Operations**
  - [ ] Add duplicate prevention (accession + CPT)
  - [ ] Create invoice preview/PDF generation
  - [ ] Implement re-send capability
  - [ ] Add invoice history tracking
  - [ ] Create change notifications
  - [ ] Support invoice amendments

### Phase 4: Payment Posting Module (Week 4)
**Goal**: Handle manual payments and reconciliation

#### Manual Payment Posting Queue
- [ ] **Payment Entry Screen**
  - [ ] Create payment button
  - [ ] Enter check/ACH/cash details
  - [ ] Show all open invoices for clinic
  - [ ] Expandable line items per invoice
  - [ ] Checkbox selection for payment
  - [ ] Amount allocation per line
  - [ ] Balance verification (must equal)

- [ ] **Payment Application Rules**
  - [ ] Prevent saving unbalanced payments
  - [ ] Support partial line payments
  - [ ] Add dispute during payment posting
  - [ ] Create payment receipts
  - [ ] Track payment method (Check, ACH, Card, Cash, Credit)
  - [ ] Add payment editing capability
  - [ ] Admin-only payment deletion

#### Credit Management System
- [ ] **Credit Creation & Application**
  - [ ] Auto-create from overpayments
  - [ ] Manual credit creation
  - [ ] Credit reason tracking
  - [ ] Nightly auto-application job
  - [ ] Apply oldest to newest
  - [ ] Line-by-line application
  - [ ] Credit ledger per clinic
  - [ ] Show credits on clinic view

#### Dispute Management
- [ ] **Dispute Workflow**
  - [ ] Line-level dispute capability
  - [ ] Dispute reason required
  - [ ] Internal dispute queue
  - [ ] External portal disputes
  - [ ] Dispute notifications
  - [ ] Resolution tracking
  - [ ] Re-invoice after resolution

---

### Phase 5: Security & HIPAA Compliance (Week 5)
**Goal**: Implement medical-grade security

#### HIPAA Requirements (FROM TRANSCRIPTS)
- [ ] **Authentication & Session Management**
  - [ ] Microsoft OAuth integration
  - [ ] Authenticator app requirement (NO SMS/email)
  - [ ] 30-minute timeout (configurable)
  - [ ] Auto-logout on inactivity
  - [ ] Session tracking per user
  - [ ] IP whitelisting option

- [ ] **Audit Logging System**
  - [ ] Create audit_logs table
  - [ ] Track all data access
  - [ ] Log all modifications
  - [ ] Track downloads/exports
  - [ ] User access history
  - [ ] Patient data access log
  - [ ] Immutable log storage
  - [ ] Show history button (like CMD)

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

## 🔴 CLIENT-SPECIFIC REQUIREMENTS (FROM TRANSCRIPTS)

### Business Rules That MUST Be Implemented
1. **Duplicate Detection**: Accession number + CPT code combo (NOT invoice number)
2. **Character Limits**: Display notes must be limited to prevent 17-page invoices
3. **Payment Posting**: Cannot save until every penny is allocated
4. **Credit Application**: Oldest invoice first, line by line, alphabetically
5. **Dispute Handling**: Line-level disputes, not invoice-level
6. **Email Strategy**: No-reply emails, everything through portal
7. **Deletion Tracking**: Deleted lines grayed out internally, never shown to clinics
8. **Live Pricing**: Draft invoices update pricing in real-time
9. **Multi-Upload**: Multiple uploads add to same draft until finalized
10. **Sales Rep Assignment**: At clinic level, reportable

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

### Week 1 Priority Tasks
- [x] Fix RoleManagement capitalization ✅
- [x] Create UserProfile modal ✅
- [ ] Implement 3-level hierarchy (PBS → Lab → Clinic)
- [ ] Build import failure queue UI
- [ ] Add inline editing for failed imports
- [ ] Create CPT mapping interface
- [ ] Add duplicate detection (accession + CPT)
- [ ] Implement character limits on notes
- [ ] Add sales rep field to clinics
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
| 3-Level Hierarchy | 30% | 100% | CRITICAL | 2 |
| Import Failure Queue | 10% | 100% | CRITICAL | 3 |
| CPT Mapping (VLOOKUP) | 0% | 100% | CRITICAL | 3 |
| Invoice Lifecycle | 20% | 100% | CRITICAL | 4 |
| Payment Posting Queue | 0% | 100% | CRITICAL | 4 |
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