/**
 * Laboratory Billing System Types
 * Three-level hierarchy: PBS → Laboratory → Clinic
 */

export interface BillingCompany {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Laboratory {
  id: string;
  billing_company_id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Clinic {
  id: string;
  laboratory_id: string;
  parent_clinic_id?: string; // For parent/child relationships
  name: string;
  code?: string;
  invoice_type?: 'SNF' | 'Hospice' | 'Standard' | 'Other';
  sales_rep?: string;
  address?: string;
  phone?: string;
  email?: string;
  billing_email?: string;
  fee_schedule_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImportColumn {
  field: string;
  label: string;
  required: boolean;
  format?: string;
  example?: string;
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  { field: 'client_name', label: 'Client Name (Laboratory)', required: true, example: 'MedScan Labs' },
  { field: 'clinic_name', label: 'Clinic Name', required: true, example: 'RiverBend Medical' },
  { field: 'invoice_type', label: 'Invoice Type', required: true, example: 'SNF' },
  { field: 'accession_number', label: 'Accession/Reference Number', required: true, example: 'ACC-2024-0001' },
  { field: 'date_of_collection', label: 'Date of Collection', required: true, format: 'MM/DD/YYYY', example: '01/15/2024' },
  { field: 'cpt_code', label: 'CPT Code (Charge Test Name)', required: true, example: '80053' },
  { field: 'patient_first_name', label: 'Patient First Name', required: true, example: 'John' },
  { field: 'patient_last_name', label: 'Patient Last Name', required: true, example: 'Doe' },
  { field: 'patient_dob', label: 'Patient DOB', required: true, format: 'MM/DD/YYYY', example: '01/01/1950' },
  { field: 'units', label: 'Units of Service', required: true, example: '1' },
  { field: 'display_note', label: 'Display Note', required: false, example: 'Lab notes (max 255 chars)' }
];

export interface ImportFailure {
  id: string;
  row_number: number;
  failure_type: 'duplicate' | 'missing_clinic' | 'missing_cpt' | 'invalid_format' | 'other';
  failure_reason: string;
  row_data: Record<string, any>;
  fixable: boolean;
  created_at: string;
  expires_at: string; // 90 days from creation
}

export interface CPTMapping {
  id: string;
  input_code: string; // What comes from the lab
  output_code: string; // What we bill (standard CPT)
  display_name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeSchedule {
  id: string;
  name: string;
  is_default: boolean;
  effective_date: string;
  expiration_date?: string;
  parent_schedule_id?: string; // For inheritance
  created_at: string;
  updated_at: string;
}

export interface FeeScheduleItem {
  id: string;
  fee_schedule_id: string;
  cpt_code: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  clinic_id: string;
  payment_number: string;
  payment_date: string;
  payment_method: 'Check' | 'ACH' | 'Card' | 'Cash' | 'Credit';
  check_number?: string;
  amount: number;
  applied_amount: number;
  unapplied_amount: number;
  status: 'unapplied' | 'applied' | 'on_hold';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  invoice_line_id: string;
  amount: number;
  created_at: string;
}

export interface Credit {
  id: string;
  clinic_id: string;
  amount: number;
  applied_amount: number;
  remaining_amount: number;
  reason: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Dispute {
  id: string;
  invoice_id: string;
  invoice_line_id?: string; // Line-level dispute
  clinic_id: string;
  reason: string;
  status: 'open' | 'resolved' | 'rejected';
  resolution?: string;
  disputed_amount: number;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface InvoiceStatus {
  draft: boolean;
  finalized: boolean;
  sent: boolean;
  paid: boolean;
  disputed: boolean;
  on_hold: boolean;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  accession_number: string;
  cpt_code: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_dob: string;
  date_of_service: string;
  units: number;
  unit_price: number;
  total_price: number;
  display_note?: string;
  paid_amount: number;
  disputed: boolean;
  deleted: boolean;
  deleted_reason?: string;
  deleted_by?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}