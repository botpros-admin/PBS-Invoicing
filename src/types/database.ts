// Database schema types for PBS Invoicing System
// Generated from migrations/20250114000000_complete_invoice_system.sql

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  billing_terms: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent_id?: string;
}

export interface CPTCode {
  id: string;
  organization_id: string;
  code: string;
  description: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingSchedule {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  effective_date: string;
  expiration_date?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingRule {
  id: string;
  organization_id: string;
  pricing_schedule_id: string;
  cpt_code_id: string;
  client_id?: string;
  base_price: number;
  discount_percentage: number;
  minimum_price?: number;
  maximum_price?: number;
  effective_date: string;
  expiration_date?: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'disputed';

export interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  client_id: string;
  invoice_date: string;
  due_date: string;
  billing_period_start?: string;
  billing_period_end?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number; // Generated column
  status: InvoiceStatus;
  terms?: string;
  notes?: string;
  sent_at?: string;
  viewed_at?: string;
  paid_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  organization_id: string;
  invoice_id: string;
  accession_number: string;
  cpt_code_id: string;
  description: string;
  service_date: string;
  quantity: number;
  units?: number; // Units field for mileage, time-based charges, etc.
  unit_price: number;
  line_total: number; // Generated column
  pricing_rule_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
export type PaymentStatus = 'pending' | 'cleared' | 'bounced' | 'cancelled';

export interface Payment {
  id: string;
  organization_id: string;
  payment_number: string;
  client_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  status: PaymentStatus;
  deposited_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  organization_id: string;
  payment_id: string;
  invoice_id: string;
  allocated_amount: number;
  allocation_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type CreditStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface AccountCredit {
  id: string;
  organization_id: string;
  client_id: string;
  credit_number: string;
  amount: number;
  reason: string;
  credit_date: string;
  expiration_date?: string;
  used_amount: number;
  remaining_amount: number; // Generated column
  status: CreditStatus;
  related_invoice_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected' | 'escalated';

export interface Dispute {
  id: string;
  organization_id: string;
  invoice_id: string;
  dispute_number: string;
  disputed_amount: number;
  reason: string;
  description?: string;
  dispute_date: string;
  status: DisputeStatus;
  resolution?: string;
  resolved_date?: string;
  resolved_amount?: number;
  created_by?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ImportQueue {
  id: string;
  organization_id: string;
  filename: string;
  file_size?: number;
  mime_type?: string;
  status: ImportStatus;
  total_rows?: number;
  processed_rows: number;
  success_rows: number;
  error_rows: number;
  errors: any[]; // JSONB
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  organization_id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_values?: any; // JSONB
  new_values?: any; // JSONB
  changed_by?: string;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
}

// Helper types for form inputs and API responses
export interface CreateInvoiceInput {
  client_id: string;
  invoice_date?: string;
  due_date: string;
  billing_period_start?: string;
  billing_period_end?: string;
  terms?: string;
  notes?: string;
  items: CreateInvoiceItemInput[];
}

export interface CreateInvoiceItemInput {
  accession_number: string;
  // Patient information fields for laboratory billing
  patient_first_name?: string;
  patient_last_name?: string;
  patient_dob?: string;
  patient_mrn?: string; // Medical Record Number
  patient_insurance_id?: string;
  // Service fields
  cpt_code_id: string;
  description: string;
  service_date: string;
  units: number; // Units field for quantity, mileage, time-based charges
  unit_price: number;
  // Additional fields
  invoice_type?: 'SNF' | 'Invalids' | 'Hospice' | 'Regular';
  notes?: string;
}

export interface ImportRowData {
  accession_number: string;
  cpt_code: string;
  client_code: string;
  service_date: string;
  quantity?: number;
  [key: string]: any; // Allow additional fields for mapping
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

export interface ImportResult {
  success: boolean;
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  error_rows: number;
  errors: ImportValidationError[];
  duplicates: ImportRowData[];
}
