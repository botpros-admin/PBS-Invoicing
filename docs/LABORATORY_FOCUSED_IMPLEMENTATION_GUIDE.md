# PBS Invoicing - Laboratory-Focused Implementation Guide
## Complete Technical Specification for Multi-Tenant Laboratory Billing Platform

---

## Executive Summary

Based on comprehensive analysis of client transcripts with Ashley (PBS Billing Services), this platform must be architected as a **laboratory-first billing system** with secondary support for clinics. This document provides exact implementation specifications for transforming the current single-tenant application into a multi-tenant laboratory billing platform.

**Key Finding from Ashley (Session 1):**
> "The fundamental difference is that clinics bill for services provided to patients during visits, while laboratories bill for tests performed on specimens that may come from multiple sources and require complex processing."

---

## Table of Contents

1. [Database Schema Changes](#1-database-schema-changes)
2. [Laboratory-Specific Features](#2-laboratory-specific-features)
3. [User Interface Changes](#3-user-interface-changes)
4. [API Endpoint Modifications](#4-api-endpoint-modifications)
5. [Business Logic Implementation](#5-business-logic-implementation)
6. [Reporting & Analytics](#6-reporting--analytics)
7. [Integration Requirements](#7-integration-requirements)
8. [Migration Strategy](#8-migration-strategy)

---

## 1. Database Schema Changes

### 1.1 Provider Type Enhancement

**Current State:** Generic `provider_type` field
**Required Change:** Laboratory-focused provider configuration

#### Implementation:

```sql
-- Add to healthcare_providers table
ALTER TABLE healthcare_providers ADD COLUMN IF NOT EXISTS provider_configuration JSONB DEFAULT '{}';
ALTER TABLE healthcare_providers ADD COLUMN IF NOT EXISTS is_reference_lab BOOLEAN DEFAULT false;
ALTER TABLE healthcare_providers ADD COLUMN IF NOT EXISTS clia_number VARCHAR(20);
ALTER TABLE healthcare_providers ADD COLUMN IF NOT EXISTS lab_director_name VARCHAR(255);
ALTER TABLE healthcare_providers ADD COLUMN IF NOT EXISTS lab_certifications TEXT[];

-- Provider type specific configuration
UPDATE healthcare_providers 
SET provider_configuration = 
  CASE 
    WHEN provider_type = 'laboratory' THEN 
      '{
        "billing_mode": "post_service",
        "average_payment_days": 60,
        "supports_batch_processing": true,
        "requires_specimen_tracking": true,
        "instrument_integration_enabled": true
      }'::jsonb
    WHEN provider_type = 'clinic' THEN
      '{
        "billing_mode": "point_of_service",
        "average_payment_days": 30,
        "supports_batch_processing": false,
        "requires_specimen_tracking": false,
        "instrument_integration_enabled": false
      }'::jsonb
  END;
```

**Why:** Ashley emphasized laboratories have fundamentally different operational models requiring specific configuration parameters.

### 1.2 Specimen Tracking System

**New Table Required:** `specimens`

```sql
CREATE TABLE specimens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  specimen_id VARCHAR(50) UNIQUE NOT NULL, -- Barcode/unique identifier
  collection_date TIMESTAMPTZ NOT NULL,
  received_date TIMESTAMPTZ NOT NULL,
  specimen_type VARCHAR(100), -- Blood, Urine, Tissue, etc.
  specimen_status VARCHAR(50) DEFAULT 'received', -- received, processing, completed, rejected
  
  -- Source Information
  ordering_provider_id TEXT,
  ordering_provider_npi VARCHAR(20),
  client_account_number VARCHAR(50),
  
  -- Patient Link
  patient_id TEXT REFERENCES patients_multitenant(id),
  
  -- Multi-tenant isolation
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id),
  provider_id TEXT NOT NULL REFERENCES healthcare_providers(id),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_specimen_provider 
    FOREIGN KEY (provider_id) 
    REFERENCES healthcare_providers(id) 
    ON DELETE CASCADE
);

CREATE INDEX idx_specimens_specimen_id ON specimens(specimen_id);
CREATE INDEX idx_specimens_status ON specimens(specimen_status);
CREATE INDEX idx_specimens_provider ON specimens(provider_id);
CREATE INDEX idx_specimens_patient ON specimens(patient_id);
```

**Why:** Ashley (Session 2): "We receive specimens, process them through various instruments, generate results, and then bill."

### 1.3 Laboratory Test Results

**New Table Required:** `lab_test_results`

```sql
CREATE TABLE lab_test_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  specimen_id TEXT NOT NULL REFERENCES specimens(id),
  test_code VARCHAR(50) NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  result_value TEXT,
  result_unit VARCHAR(50),
  reference_range VARCHAR(100),
  abnormal_flag VARCHAR(10), -- H, L, HH, LL, A (abnormal)
  result_status VARCHAR(50) DEFAULT 'pending', -- pending, preliminary, final, corrected, cancelled
  
  -- CPT Mapping
  cpt_codes TEXT[], -- Array of CPT codes for this test
  diagnosis_codes TEXT[], -- ICD-10 codes
  
  -- Quality Control
  qc_status VARCHAR(50) DEFAULT 'pending', -- pending, passed, failed
  qc_notes TEXT,
  
  -- Billing Trigger
  billable BOOLEAN DEFAULT true,
  billed BOOLEAN DEFAULT false,
  billed_date TIMESTAMPTZ,
  invoice_line_item_id TEXT,
  
  -- Instrument Data
  instrument_id VARCHAR(100),
  instrument_name VARCHAR(255),
  performed_by TEXT,
  performed_date TIMESTAMPTZ,
  verified_by TEXT,
  verified_date TIMESTAMPTZ,
  
  -- Multi-tenant isolation
  billing_company_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lab_test_results_specimen ON lab_test_results(specimen_id);
CREATE INDEX idx_lab_test_results_status ON lab_test_results(result_status);
CREATE INDEX idx_lab_test_results_billable ON lab_test_results(billable, billed);
CREATE INDEX idx_lab_test_results_test_code ON lab_test_results(test_code);
```

**Why:** Ashley (Session 3): "We have hundreds of different lab tests, each with specific CPT codes, and some tests require multiple CPT codes."

### 1.4 CPT Code Mapping (VLOOKUP Functionality)

**New Table Required:** `test_cpt_mappings`

```sql
CREATE TABLE test_cpt_mappings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  test_code VARCHAR(50) NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  cpt_codes TEXT[] NOT NULL, -- Array of CPT codes
  requires_diagnosis BOOLEAN DEFAULT false,
  default_price DECIMAL(10, 2),
  
  -- Insurance-specific pricing
  medicare_price DECIMAL(10, 2),
  medicaid_price DECIMAL(10, 2),
  
  -- Panel/Profile Information
  is_panel BOOLEAN DEFAULT false,
  panel_components TEXT[], -- If this is a panel, list component test codes
  
  -- Billing Rules
  billing_rules JSONB DEFAULT '{}',
  prior_auth_required BOOLEAN DEFAULT false,
  medical_necessity_criteria TEXT,
  
  -- Multi-tenant (billing company specific mappings)
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id),
  provider_id TEXT REFERENCES healthcare_providers(id), -- Optional provider-specific override
  
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  termination_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(test_code, billing_company_id, provider_id)
);

CREATE INDEX idx_test_cpt_mappings_test_code ON test_cpt_mappings(test_code);
CREATE INDEX idx_test_cpt_mappings_active ON test_cpt_mappings(is_active);
CREATE INDEX idx_test_cpt_mappings_billing_company ON test_cpt_mappings(billing_company_id);
```

**Why:** Ashley (Session 4): "We need VLOOKUP functionality to map test codes to CPT codes. This is critical for accurate billing."

### 1.5 Client Account Management

**New Table Required:** `client_accounts` (for B2B relationships)

```sql
CREATE TABLE client_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_number VARCHAR(50) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_type VARCHAR(50) NOT NULL, -- hospital, clinic, physician_office, nursing_home
  
  -- Billing Preferences
  billing_format VARCHAR(50) DEFAULT 'standard', -- standard, custom, hl7, csv
  billing_frequency VARCHAR(50) DEFAULT 'daily', -- daily, weekly, monthly
  payment_terms_days INTEGER DEFAULT 60,
  
  -- Custom Requirements
  custom_report_format JSONB,
  required_fields TEXT[],
  excluded_tests TEXT[], -- Tests not to bill to this client
  
  -- Pricing
  pricing_tier VARCHAR(50) DEFAULT 'standard',
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  
  -- Contact Information
  billing_contact_name VARCHAR(255),
  billing_contact_email VARCHAR(255),
  billing_contact_phone VARCHAR(50),
  billing_address JSONB,
  
  -- Integration
  electronic_billing_enabled BOOLEAN DEFAULT false,
  edi_information JSONB,
  portal_access_enabled BOOLEAN DEFAULT false,
  
  -- Multi-tenant isolation
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id),
  provider_id TEXT NOT NULL REFERENCES healthcare_providers(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_accounts_account_number ON client_accounts(account_number);
CREATE INDEX idx_client_accounts_provider ON client_accounts(provider_id);
CREATE INDEX idx_client_accounts_active ON client_accounts(is_active);
```

**Why:** Ashley (Session 5): "We serve multiple types of clients - hospitals, clinics, physicians' offices. Each has different billing preferences, reporting requirements, and payment terms."

### 1.6 Batch Processing Support

**New Table Required:** `billing_batches`

```sql
CREATE TABLE billing_batches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  batch_date DATE NOT NULL,
  batch_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, manual
  
  -- Batch Contents
  total_tests INTEGER DEFAULT 0,
  total_specimens INTEGER DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  
  -- Processing Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_log JSONB,
  
  -- Multi-tenant isolation
  billing_company_id TEXT NOT NULL REFERENCES billing_companies(id),
  provider_id TEXT NOT NULL REFERENCES healthcare_providers(id),
  
  created_by TEXT REFERENCES users_multitenant(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE billing_batch_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  batch_id TEXT NOT NULL REFERENCES billing_batches(id),
  specimen_id TEXT REFERENCES specimens(id),
  test_result_id TEXT REFERENCES lab_test_results(id),
  invoice_id TEXT REFERENCES invoices_multitenant(id),
  
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_batches_batch_number ON billing_batches(batch_number);
CREATE INDEX idx_billing_batches_status ON billing_batches(status);
CREATE INDEX idx_billing_batch_items_batch ON billing_batch_items(batch_id);
```

**Why:** Ashley (Session 1): "We process thousands of lab results weekly. Each result potentially generates a separate billing event."

### 1.7 Enhanced Invoice Structure for Labs

**Modifications to `invoices_multitenant` table:**

```sql
ALTER TABLE invoices_multitenant 
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'standard', -- standard, lab_test, panel, client_account
ADD COLUMN IF NOT EXISTS specimen_ids TEXT[], -- Array of specimen IDs included
ADD COLUMN IF NOT EXISTS test_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_account_id TEXT REFERENCES client_accounts(id),
ADD COLUMN IF NOT EXISTS billing_batch_id TEXT REFERENCES billing_batches(id),
ADD COLUMN IF NOT EXISTS expected_payment_date DATE, -- Based on client payment terms
ADD COLUMN IF NOT EXISTS aging_bucket VARCHAR(20); -- current, 30, 60, 90, 120+

-- Add trigger to calculate aging bucket
CREATE OR REPLACE FUNCTION update_aging_bucket()
RETURNS TRIGGER AS $$
BEGIN
  NEW.aging_bucket = 
    CASE 
      WHEN NEW.paid_amount >= NEW.total THEN 'paid'
      WHEN CURRENT_DATE - NEW.billing_date::date < 30 THEN 'current'
      WHEN CURRENT_DATE - NEW.billing_date::date < 60 THEN '30'
      WHEN CURRENT_DATE - NEW.billing_date::date < 90 THEN '60'
      WHEN CURRENT_DATE - NEW.billing_date::date < 120 THEN '90'
      ELSE '120+'
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_aging 
BEFORE INSERT OR UPDATE ON invoices_multitenant
FOR EACH ROW EXECUTE FUNCTION update_aging_bucket();
```

**Why:** Ashley (Session 4): "We often don't get paid for 60-90 days, and we need to track aging very carefully."

---

## 2. Laboratory-Specific Features

### 2.1 Test Order Management

**Feature:** Complete test ordering workflow

#### Frontend Components Required:

```typescript
// components/Laboratory/TestOrderForm.tsx
interface TestOrderFormProps {
  patientId: string;
  orderingProviderId: string;
  clientAccountId?: string;
}

interface TestOrder {
  specimenId: string;
  testCodes: string[];
  diagnosisCodes: string[];
  priority: 'routine' | 'stat' | 'asap';
  collectionDate: Date;
  orderingProviderNPI: string;
  insuranceInfo?: {
    primaryInsurance: InsuranceInfo;
    secondaryInsurance?: InsuranceInfo;
  };
}
```

#### Backend API Endpoint:

```javascript
// POST /api/laboratory/test-orders
async function createTestOrder(req, res) {
  const { specimenId, testCodes, patientId, orderingProviderId } = req.body;
  
  // 1. Validate specimen exists
  // 2. Look up CPT codes using VLOOKUP
  const cptMappings = await db.test_cpt_mappings.findMany({
    where: {
      test_code: { in: testCodes },
      billing_company_id: req.tenantId,
      is_active: true
    }
  });
  
  // 3. Check insurance coverage if applicable
  // 4. Create test result records
  // 5. Queue for processing
  
  return res.json({ orderId, estimatedTAT, estimatedCost });
}
```

**Why:** Laboratory workflow requires test ordering before billing can occur.

### 2.2 CPT Code VLOOKUP Interface

**Feature:** Excel-like VLOOKUP for test-to-CPT mapping

#### Frontend Implementation:

```typescript
// components/Laboratory/CPTMappingManager.tsx
interface CPTMappingManagerProps {
  onMappingUpdate: (mapping: TestCPTMapping) => void;
}

// Features:
// 1. Bulk import from CSV/Excel
// 2. Search and filter by test code
// 3. Edit multiple CPT codes per test
// 4. Version history tracking
// 5. Provider-specific overrides
```

#### Backend API Endpoints:

```javascript
// GET /api/laboratory/cpt-lookup/:testCode
async function lookupCPTCodes(req, res) {
  const { testCode } = req.params;
  const { providerId } = req.query;
  
  // Check provider-specific mapping first
  let mapping = await db.test_cpt_mappings.findFirst({
    where: {
      test_code: testCode,
      provider_id: providerId,
      billing_company_id: req.tenantId
    }
  });
  
  // Fall back to company-wide mapping
  if (!mapping) {
    mapping = await db.test_cpt_mappings.findFirst({
      where: {
        test_code: testCode,
        provider_id: null,
        billing_company_id: req.tenantId
      }
    });
  }
  
  return res.json(mapping);
}

// POST /api/laboratory/cpt-mappings/bulk-import
async function bulkImportMappings(req, res) {
  // Handle CSV/Excel file upload
  // Validate and insert mappings
}
```

**Why:** Ashley (Session 4): "We need VLOOKUP functionality to map test codes to CPT codes."

### 2.3 Batch Processing System

**Feature:** Process thousands of tests in batches

#### Implementation:

```javascript
// services/laboratory/BatchProcessor.js
class BatchProcessor {
  async createDailyBatch(providerId) {
    // 1. Find all unbilled test results
    const unbilledTests = await db.lab_test_results.findMany({
      where: {
        provider_id: providerId,
        billable: true,
        billed: false,
        result_status: 'final',
        qc_status: 'passed'
      }
    });
    
    // 2. Group by client account
    const groupedByClient = this.groupByClientAccount(unbilledTests);
    
    // 3. Create batch record
    const batch = await db.billing_batches.create({
      batch_number: this.generateBatchNumber(),
      batch_date: new Date(),
      batch_type: 'daily',
      total_tests: unbilledTests.length
    });
    
    // 4. Process each client group
    for (const [clientId, tests] of Object.entries(groupedByClient)) {
      await this.processClientBilling(clientId, tests, batch.id);
    }
    
    return batch;
  }
  
  async processClientBilling(clientId, tests, batchId) {
    // Create invoice based on client preferences
    const client = await db.client_accounts.findUnique({
      where: { id: clientId }
    });
    
    if (client.billing_frequency === 'daily') {
      await this.createClientInvoice(client, tests, batchId);
    } else {
      await this.queueForLaterBilling(client, tests, batchId);
    }
  }
}
```

**Why:** Ashley (Session 1): "We process thousands of lab results weekly."

### 2.4 Quality Control Integration

**Feature:** QC status affects billing

#### Implementation:

```javascript
// services/laboratory/QualityControl.js
class QualityControlService {
  async updateQCStatus(testResultId, status, notes) {
    const result = await db.lab_test_results.update({
      where: { id: testResultId },
      data: {
        qc_status: status,
        qc_notes: notes,
        billable: status === 'passed', // Only billable if QC passed
        updated_at: new Date()
      }
    });
    
    // Trigger billing workflow if QC passed
    if (status === 'passed') {
      await this.triggerBillingWorkflow(result);
    }
    
    // Create audit log
    await this.createAuditLog({
      action: 'QC_STATUS_UPDATE',
      entity_type: 'lab_test_result',
      entity_id: testResultId,
      old_values: { qc_status: result.qc_status },
      new_values: { qc_status: status }
    });
    
    return result;
  }
}
```

**Why:** Ashley (Session 3): "If a test fails QC, it shouldn't be billed."

---

## 3. User Interface Changes

### 3.1 Laboratory Dashboard

**New Component:** `LaboratoryDashboard.tsx`

```typescript
interface LaboratoryDashboardProps {
  providerId: string;
  dateRange: DateRange;
}

// Key Metrics to Display:
// 1. Daily test volume
// 2. Pending billing count
// 3. QC failure rate
// 4. Average TAT (turnaround time)
// 5. Aging receivables by bucket
// 6. Top 10 tests by volume
// 7. Client account status
```

**Why:** Laboratories need different metrics than clinics.

### 3.2 Specimen Tracking Interface

**New Component:** `SpecimenTracker.tsx`

```typescript
// Features:
// 1. Barcode scanning support
// 2. Real-time status updates
// 3. Batch specimen receiving
// 4. Chain of custody tracking
// 5. Result linking
```

### 3.3 Client Portal

**New Section:** Client-specific billing portal

```typescript
// pages/client-portal/[clientId].tsx
// Features:
// 1. View invoices by date range
// 2. Download reports in preferred format
// 3. Payment submission
// 4. Test catalog with pricing
// 5. Order history
```

---

## 4. API Endpoint Modifications

### 4.1 Laboratory-Specific Endpoints

```javascript
// Laboratory Test Management
GET    /api/laboratory/specimens
POST   /api/laboratory/specimens
GET    /api/laboratory/specimens/:id
PATCH  /api/laboratory/specimens/:id/status

// Test Results
GET    /api/laboratory/test-results
POST   /api/laboratory/test-results
PATCH  /api/laboratory/test-results/:id/qc-status
POST   /api/laboratory/test-results/bulk-import

// CPT Mapping
GET    /api/laboratory/cpt-mappings
POST   /api/laboratory/cpt-mappings
GET    /api/laboratory/cpt-lookup/:testCode
POST   /api/laboratory/cpt-mappings/bulk-import

// Batch Processing
POST   /api/laboratory/batches/create
GET    /api/laboratory/batches/:id
POST   /api/laboratory/batches/:id/process
GET    /api/laboratory/batches/:id/status

// Client Accounts
GET    /api/laboratory/client-accounts
POST   /api/laboratory/client-accounts
PATCH  /api/laboratory/client-accounts/:id
GET    /api/laboratory/client-accounts/:id/invoices

// Laboratory Reports
GET    /api/laboratory/reports/test-volume
GET    /api/laboratory/reports/tat-analysis
GET    /api/laboratory/reports/client-summary
GET    /api/laboratory/reports/financial-analysis
```

### 4.2 Modified Invoice Endpoints

```javascript
// Enhanced for laboratory needs
POST /api/invoices/create-from-tests
{
  "testResultIds": ["id1", "id2"],
  "clientAccountId": "client123",
  "billingBatchId": "batch456"
}

POST /api/invoices/create-batch
{
  "batchId": "batch456",
  "groupBy": "client" // or "patient", "date"
}
```

---

## 5. Business Logic Implementation

### 5.1 Laboratory Billing Workflow

```javascript
class LaboratoryBillingWorkflow {
  async processTestResult(testResultId) {
    // 1. Verify test is complete and QC passed
    const testResult = await this.verifyTestReadyForBilling(testResultId);
    
    // 2. Look up CPT codes
    const cptCodes = await this.lookupCPTCodes(testResult.test_code);
    
    // 3. Check insurance requirements
    const insurance = await this.checkInsuranceRequirements(
      testResult.patient_id,
      cptCodes
    );
    
    // 4. Calculate pricing
    const pricing = await this.calculatePricing(
      cptCodes,
      insurance,
      testResult.client_account_id
    );
    
    // 5. Create or update invoice
    const invoice = await this.createOrUpdateInvoice(
      testResult,
      pricing
    );
    
    // 6. Mark test as billed
    await this.markTestAsBilled(testResultId, invoice.id);
    
    return invoice;
  }
}
```

### 5.2 Client-Specific Billing Rules

```javascript
class ClientBillingRules {
  async applyClientRules(clientAccountId, invoice) {
    const client = await db.client_accounts.findUnique({
      where: { id: clientAccountId }
    });
    
    // Apply discount
    if (client.discount_percentage > 0) {
      invoice.total *= (1 - client.discount_percentage / 100);
    }
    
    // Set payment terms
    invoice.expected_payment_date = addDays(
      invoice.billing_date,
      client.payment_terms_days
    );
    
    // Apply custom format
    if (client.billing_format === 'custom') {
      invoice = this.applyCustomFormat(invoice, client.custom_report_format);
    }
    
    return invoice;
  }
}
```

---

## 6. Reporting & Analytics

### 6.1 Laboratory-Specific Reports

```sql
-- Test Volume Report
CREATE VIEW test_volume_report AS
SELECT 
  DATE(performed_date) as test_date,
  test_code,
  test_name,
  COUNT(*) as test_count,
  COUNT(DISTINCT specimen_id) as specimen_count,
  COUNT(DISTINCT patient_id) as patient_count,
  SUM(CASE WHEN billed THEN 1 ELSE 0 END) as billed_count,
  AVG(EXTRACT(EPOCH FROM (verified_date - performed_date))/3600) as avg_tat_hours
FROM lab_test_results
WHERE result_status = 'final'
GROUP BY DATE(performed_date), test_code, test_name;

-- Client Revenue Analysis
CREATE VIEW client_revenue_analysis AS
SELECT
  ca.client_name,
  ca.client_type,
  COUNT(DISTINCT i.id) as invoice_count,
  SUM(i.total) as total_billed,
  SUM(i.paid_amount) as total_paid,
  AVG(i.total) as avg_invoice_amount,
  AVG(EXTRACT(EPOCH FROM (p.payment_date - i.billing_date))/86400) as avg_payment_days
FROM client_accounts ca
LEFT JOIN invoices_multitenant i ON ca.id = i.client_account_id
LEFT JOIN payments_multitenant p ON i.id = p.invoice_id
GROUP BY ca.client_name, ca.client_type;

-- Aging Analysis
CREATE VIEW aging_analysis AS
SELECT
  aging_bucket,
  COUNT(*) as invoice_count,
  SUM(total - paid_amount) as outstanding_amount,
  AVG(CURRENT_DATE - billing_date::date) as avg_days_outstanding
FROM invoices_multitenant
WHERE status NOT IN ('PAID', 'CANCELLED')
GROUP BY aging_bucket;
```

### 6.2 Turnaround Time (TAT) Analytics

```javascript
// services/laboratory/TATAnalytics.js
class TATAnalytics {
  async calculateTAT(startDate, endDate, testCode = null) {
    const query = {
      performed_date: { between: [startDate, endDate] },
      result_status: 'final'
    };
    
    if (testCode) {
      query.test_code = testCode;
    }
    
    const results = await db.lab_test_results.findMany({ where: query });
    
    return {
      avgTAT: this.calculateAverage(results, 'tat'),
      medianTAT: this.calculateMedian(results, 'tat'),
      percentile95: this.calculatePercentile(results, 'tat', 95),
      byTestCode: this.groupByTestCode(results)
    };
  }
}
```

---

## 7. Integration Requirements

### 7.1 Laboratory Information System (LIS) Integration

```javascript
// integrations/LISInterface.js
class LISInterface {
  async syncTestResults() {
    // HL7 or API integration with LIS
    const results = await this.fetchFromLIS();
    
    for (const result of results) {
      // Map LIS data to our schema
      const mappedResult = this.mapLISResult(result);
      
      // Create or update test result
      await db.lab_test_results.upsert({
        where: { 
          specimen_id_test_code: {
            specimen_id: mappedResult.specimen_id,
            test_code: mappedResult.test_code
          }
        },
        create: mappedResult,
        update: mappedResult
      });
    }
  }
}
```

### 7.2 Instrument Integration

```javascript
// integrations/InstrumentInterface.js
class InstrumentInterface {
  supportedInstruments = {
    'ABBOTT_ARCHITECT': 'Abbott Architect',
    'ROCHE_COBAS': 'Roche Cobas',
    'SIEMENS_ATELLICA': 'Siemens Atellica'
  };
  
  async processInstrumentData(instrumentId, dataFile) {
    const parser = this.getParser(instrumentId);
    const results = await parser.parse(dataFile);
    
    // Create test results from instrument data
    for (const result of results) {
      await this.createTestResult(result, instrumentId);
    }
  }
}
```

---

## 8. Migration Strategy

### 8.1 Phase 1: Database Setup (Week 1)

```sql
-- Run migrations in order:
-- 1. Create new tables
psql -d database_name -f migrations/01_specimen_tracking.sql
psql -d database_name -f migrations/02_lab_test_results.sql
psql -d database_name -f migrations/03_test_cpt_mappings.sql
psql -d database_name -f migrations/04_client_accounts.sql
psql -d database_name -f migrations/05_batch_processing.sql

-- 2. Modify existing tables
psql -d database_name -f migrations/06_enhance_providers.sql
psql -d database_name -f migrations/07_enhance_invoices.sql

-- 3. Create views and indexes
psql -d database_name -f migrations/08_reporting_views.sql
psql -d database_name -f migrations/09_performance_indexes.sql
```

### 8.2 Phase 2: Data Migration (Week 2)

```javascript
// scripts/migrate-to-laboratory.js
async function migrateToLaboratory() {
  // 1. Set all existing providers as laboratories
  await db.healthcare_providers.updateMany({
    where: { provider_type: null },
    data: { 
      provider_type: 'laboratory',
      provider_configuration: laboratoryDefaultConfig
    }
  });
  
  // 2. Create default CPT mappings
  await importDefaultCPTMappings();
  
  // 3. Convert existing invoices
  await convertInvoicesToLaboratoryFormat();
  
  // 4. Create default client accounts
  await createDefaultClientAccounts();
}
```

### 8.3 Phase 3: Application Updates (Week 3-4)

1. Deploy new API endpoints
2. Update frontend components
3. Implement laboratory workflows
4. Add reporting features
5. Test integrations

### 8.4 Phase 4: Testing & Validation (Week 5)

```javascript
// tests/laboratory-workflow.test.js
describe('Laboratory Billing Workflow', () => {
  test('Should create invoice from test results', async () => {
    // 1. Create specimen
    // 2. Add test results
    // 3. Pass QC
    // 4. Trigger billing
    // 5. Verify invoice created
  });
  
  test('Should apply client-specific billing rules', async () => {
    // Test discount application
    // Test payment terms
    // Test custom formatting
  });
  
  test('Should handle batch processing', async () => {
    // Create 1000+ test results
    // Run batch processor
    // Verify all processed correctly
  });
});
```

---

## Implementation Checklist

### Developer Checklist

#### Database Changes
- [ ] Create `specimens` table
- [ ] Create `lab_test_results` table
- [ ] Create `test_cpt_mappings` table
- [ ] Create `client_accounts` table
- [ ] Create `billing_batches` and `billing_batch_items` tables
- [ ] Enhance `healthcare_providers` table with lab-specific fields
- [ ] Enhance `invoices_multitenant` table with lab fields
- [ ] Create all indexes
- [ ] Create reporting views
- [ ] Apply RLS policies

#### Backend Implementation
- [ ] Implement specimen tracking service
- [ ] Implement test result management service
- [ ] Implement CPT VLOOKUP service
- [ ] Implement batch processing service
- [ ] Implement QC integration service
- [ ] Create all laboratory API endpoints
- [ ] Implement client-specific billing rules
- [ ] Add laboratory-specific validations
- [ ] Implement TAT calculations
- [ ] Create aging analysis jobs

#### Frontend Implementation
- [ ] Create Laboratory Dashboard component
- [ ] Create Specimen Tracker component
- [ ] Create CPT Mapping Manager component
- [ ] Create Test Order Form component
- [ ] Create Batch Processing Interface
- [ ] Create Client Portal pages
- [ ] Update Invoice Form for lab tests
- [ ] Create laboratory-specific reports
- [ ] Add aging analysis views
- [ ] Implement barcode scanning support

#### Integration Tasks
- [ ] Design LIS integration interface
- [ ] Create instrument data parsers
- [ ] Implement HL7 message handling
- [ ] Create EDI billing interface
- [ ] Set up automated batch scheduling

#### Testing Requirements
- [ ] Unit tests for all services
- [ ] Integration tests for workflows
- [ ] Load testing for batch processing
- [ ] Client-specific billing rule tests
- [ ] QC workflow tests
- [ ] Aging calculation tests

#### Documentation
- [ ] API documentation for lab endpoints
- [ ] User guide for laboratory features
- [ ] Client portal documentation
- [ ] Integration guide for LIS/instruments
- [ ] CPT mapping instructions

---

## Performance Considerations

### Database Optimization
- Partition `lab_test_results` table by month
- Index all foreign keys and search fields
- Use materialized views for reports
- Implement connection pooling

### Application Optimization
- Implement Redis caching for CPT lookups
- Use queue system for batch processing
- Paginate large result sets
- Lazy load client account data

### Monitoring Requirements
- Track batch processing times
- Monitor TAT metrics
- Alert on QC failure rates
- Track API response times

---

## Security Considerations

### Data Protection
- Encrypt patient SSN and sensitive data
- Implement field-level encryption for PHI
- Audit all data access
- Implement data retention policies

### Access Control
- Laboratory technicians: Test data only
- Billing staff: Financial data access
- Client users: Own account data only
- Implement IP whitelisting for clients

---

## Success Metrics

Based on Ashley's requirements (Session 6):

1. **Billing Accuracy**: < 1% error rate
2. **Processing Speed**: Process 1000 tests in < 5 minutes
3. **TAT Tracking**: Real-time TAT calculation
4. **Payment Tracking**: Accurate aging to the day
5. **Client Satisfaction**: Custom formatting for all clients
6. **QC Integration**: 100% QC status tracking
7. **CPT Accuracy**: 99.9% correct CPT mapping

---

## Notes for Developers

### Critical Implementation Points

1. **Laboratory First**: Every feature should prioritize laboratory workflow
2. **High Volume**: Design for thousands of daily transactions
3. **Client Variety**: Support multiple client billing preferences
4. **Extended Payment**: Build for 60-90 day payment cycles
5. **QC Integration**: Billing depends on quality control status
6. **Batch Processing**: Most billing happens in batches, not real-time
7. **VLOOKUP Critical**: Test-to-CPT mapping is core functionality

### Common Pitfalls to Avoid

1. Don't assume point-of-service billing (labs bill after processing)
2. Don't create single CPT per test (many tests need multiple CPTs)
3. Don't ignore client-specific requirements (each client is different)
4. Don't skip QC integration (failed QC = no billing)
5. Don't design for patient billing (labs bill other providers/facilities)

---

## Conclusion

This implementation guide transforms PBS Invoicing into a laboratory-first billing platform while maintaining the flexibility to support clinics as a secondary use case. Every change is driven by specific requirements from Ashley's transcripts, ensuring the platform meets the real-world needs of laboratory billing operations.

The key differentiator is understanding that **laboratories operate fundamentally differently from clinics** - they process specimens rather than see patients, bill after results rather than at point of service, and serve other healthcare providers rather than patients directly.

Following this guide will create a platform specifically optimized for the unique challenges of laboratory billing while maintaining the scalability and multi-tenant architecture needed for a successful billing service company.