// Import database types for consistency
import type { Database } from './database.generated';

// Re-export database types for convenience
export type DbTables = Database['public']['Tables'];
export type DbOrganization = DbTables['organizations']['Row'];
export type DbUserProfile = DbTables['user_profiles']['Row'];
export type DbClient = DbTables['clients']['Row'];
export type DbClinic = DbTables['clinics']['Row'];
export type DbPatient = DbTables['patients']['Row'];
export type DbInvoice = DbTables['invoices']['Row'];
export type DbInvoiceItem = DbTables['invoice_items']['Row'];
export type DbPayment = DbTables['payments']['Row'];
export type DbPaymentAllocation = DbTables['payment_allocations']['Row'];
export type DbCptCode = DbTables['cpt_codes']['Row'];

// Base User Interface with common fields
interface BaseUser {
  id: ID;
  organizationId?: ID;
  name: string;
  email: string;
  status: UserStatus;
  mfaEnabled: boolean;
  lastLoginAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  avatar?: string;
}

// User (Internal Admin, AR Manager, Staff)
export interface User extends BaseUser {
  userType: 'staff';
  role: UserRole;
}

// Client User (Portal Access)
export interface ClientUser extends BaseUser {
  userType: 'client';
  clientId: ID;
  role: ClientUserRole;
}

// AppUser is a union of the two user types
export type AppUser = User | ClientUser;

// Base types
export type ID = string | number;
export type Timestamp = string; // ISO 8601 string
export type DateString = string; // YYYY-MM-DD
export type DateRange = '7days' | '30days' | '90days' | 'ytd';

// Organization
export interface Organization {
  id: ID;
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// User roles
export type UserRole = 'super_admin' | 'admin' | 'ar_manager' | 'staff';
export type UserStatus = 'active' | 'inactive' | 'invited';
export type ClientUserRole = 'admin' | 'user';

// Invoice statuses
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'dispute'
  | 'write_off'
  | 'exhausted'
  | 'cancelled';

// Payment methods
export type PaymentMethod = 'credit_card' | 'check' | 'ach' | 'wire' | 'adjustment' | 'write_off' | 'other';
export type ReconciliationStatus = 'received' | 'reconciled' | 'issue';

// Invoice types & reason types
export type InvoiceType = 'Hospice' | 'Invalids' | 'CB' | 'Standard';
export type ReasonType = 'hospice' | 'snf' | 'ltc';

// CPT Code
export interface CptCode {
  id: ID;
  code: string;
  description: string;
  defaultPrice: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Pricing Overrides
export interface ClientPricingOverride {
  id: ID;
  clientId: ID;
  cptCodeId: ID;
  price: number;
  startDate?: DateString;
  endDate?: DateString;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClinicPricingOverride {
  id: ID;
  clinicId: ID;
  cptCodeId: ID;
  price: number;
  startDate?: DateString;
  endDate?: DateString;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Invoice Item - Enhanced from database type
export interface InvoiceItem extends Omit<DbInvoiceItem, 'invoice_id' | 'cpt_code_id' | 'cpt_code' | 'description_override' | 'date_of_service' | 'unit_price' | 'is_disputed' | 'dispute_reason' | 'dispute_resolved_at' | 'dispute_resolution_notes' | 'medical_necessity_provided' | 'medical_necessity_document_path' | 'created_at' | 'updated_at'> {
  invoiceId: ID;
  cptCodeId: ID;
  cptCode: string;
  descriptionOverride?: string;
  dateOfService: DateString;
  unitPrice: number;
  isDisputed: boolean;
  disputeReason?: string;
  disputeResolvedAt?: Timestamp;
  disputeResolutionNotes?: string;
  medicalNecessityProvided: boolean;
  medicalNecessityDocumentPath?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Invoice
export interface Invoice {
  id: ID;
  clientId: ID;
  clinicId: ID;
  patientId: ID;
  invoiceNumber: string;
  dateCreated: DateString;
  dateDue: DateString;
  status: InvoiceStatus;
  invoiceType?: InvoiceType;
  reasonType?: ReasonType;
  icn?: string; // Internal Claim Number
  notes?: string;
  subtotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  writeOffAmount?: number;
  writeOffReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sentAt?: Timestamp;
  viewedAt?: Timestamp;
  paidAt?: Timestamp;
  
  // Populated fields (not in DB)
  items?: InvoiceItem[];
  client?: Client;
  clinic?: Clinic;
  patient?: Patient;
  
  // Admin override flag (not in DB)
  forceEdit?: boolean;
}

// Payment
export interface Payment {
  id: ID;
  clientId: ID;
  paymentDate: DateString;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  reconciliationStatus: ReconciliationStatus;
  createdByUserId?: ID;
  createdByClientUserId?: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Populated (not in DB)
  allocations?: PaymentAllocation[];
}

// Payment Allocation
export interface PaymentAllocation {
  id: ID;
  paymentId: ID;
  invoiceId: ID;
  invoiceItemId?: ID;
  allocatedAmount: number;
  createdAt: Timestamp;
  
  // Populated (not in DB)
  invoice?: Invoice;
  invoiceItem?: InvoiceItem;
}

// MFA related types
export interface MfaEnrollmentData {
  factorId: string;
  qrCode: string;
  secret: string;
}

export interface MfaChallengeData {
  challengeId: string;
  factorId: string;
}

export interface MfaFactor {
  id: string;
  friendlyName?: string;
  factorType: 'totp';
  status: 'verified' | 'unverified';
}

// Invoice History (Audit Trail)
export interface InvoiceHistory {
  id: ID;
  invoiceId: ID;
  timestamp: Timestamp;
  userId?: ID;
  clientUserId?: ID;
  eventType: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  
  // Populated (not in DB)
  user?: User;
  clientUser?: ClientUser;
}

// Patient - Using database type with camelCase conversion
export interface Patient extends Omit<DbPatient, 'client_id' | 'first_name' | 'last_name' | 'middle_name' | 'accession_number' | 'created_at' | 'updated_at'> {
  clientId: ID;
  firstName: string;
  lastName: string;
  middleName?: string;
  accessionNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Clinic Contact
export interface ClinicContact {
  id: ID;
  clinicId: ID;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  fax?: string;
  department?: string;
  notes?: string;
  isPrimary: boolean;
  clientUserId?: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Populated (not in DB)
  clientUser?: ClientUser;
}

// Clinic (Formerly Facility)
export interface Clinic {
  id: ID;
  clientId: ID;
  parentClinicId?: ID;
  name: string;
  address: string;
  logoUrl?: string;
  salesRep?: string;
  preferredContactMethod?: 'email' | 'phone' | 'portal';
  billToAddress?: string;
  notes?: string;
  contractDocumentPath?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Populated (not in DB)
  contacts?: ClinicContact[];
  parentClinic?: Clinic;
  childClinics?: Clinic[];
}

// Invoice Parameters
export interface InvoiceParameters {
  id: ID;
  clientId?: ID; // null for global default
  showLogo: boolean;
  logoPosition: 'top-left' | 'top-right';
  headerStyle: 'modern' | 'classic';
  footerStyle: 'simple' | 'detailed';
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  customMessage?: string;
  primaryColor: string;
  highlightColor: string;
  fontFamily: string;
  fontSize: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Client
export interface Client {
  id: ID;
  organizationId?: ID;
  name: string;
  code?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  billingTerms?: number;
  isActive?: boolean;
  logoUrl?: string;
  paymentRemitInfo?: string;
  paymentAddress?: string;
  wiringInfo?: string;
  onlineCcProcessorConfig?: Record<string, unknown>; // Replaced any
  invoiceContactPhone?: string;
  invoiceContactEmail?: string;
  invoiceContactFax?: string;
  invoiceContactWebsite?: string;
  invoiceContactHours?: string;
  w9DocumentPath?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Populated (not in DB)
  clinics?: Clinic[];
  invoiceParameters?: InvoiceParameters | null;
  users?: ClientUser[];
}

// Email Settings
export interface EmailSettings {
  id: ID;
  settingType: string;
  configDetails: Record<string, unknown>; // Replaced any - JSON structure for server/credentials
  fromEmail?: string;
  fromName?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Email Templates
export interface EmailTemplate {
  id: ID;
  templateType: string;
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Automation Rules
export interface AutomationRule {
  id: ID;
  emailTemplateId: ID;
  triggerEvent: string;
  conditionLogic?: string;
  delayValue?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Populated (not in DB)
  emailTemplate?: EmailTemplate;
}

// Notification Types
export type NotificationType = 'dispute_filed' | 'payment_received' | 'invoice_overdue' | 'system' | 'dispute' | 'payment';

// Notification Preferences
export interface NotificationPreference {
  id: ID;
  userId?: ID;
  clientUserId?: ID;
  notificationType: NotificationType;
  isEnabled: boolean;
}

// Notification
export interface Notification {
  id: ID;
  userId?: ID;
  clientUserId?: ID;
  type: NotificationType;
  message: string;
  isRead?: boolean;
  read?: boolean; // For backwards compatibility
  readAt?: Timestamp;
  date?: string; // For backwards compatibility
  relatedEntityType?: string;
  relatedEntityId?: ID;
  invoiceId?: ID; // For backwards compatibility
  createdAt?: Timestamp;
}

// Invoice Upload
export interface InvoiceUpload {
  id: ID;
  clientId: ID;
  clientUserId: ID;
  filePath: string;
  originalFilename: string;
  uploadTimestamp: Timestamp;
  status: 'pending' | 'processing' | 'completed' | 'error';
  processingStartedAt?: Timestamp;
  processingCompletedAt?: Timestamp;
  totalRows?: number;
  processedRows?: number;
  errorCount?: number;
  errorLogPath?: string;
  
  // Populated (not in DB)
  client?: Client;
  clientUser?: ClientUser;
}

// Dashboard Stats
export interface DashboardStat {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  link?: string;
}

// Filter Options (for API queries)
export interface FilterOptions {
  search?: string;
  status?: InvoiceStatus[];
  dateFrom?: DateString;
  dateTo?: DateString;
  clientId?: ID[];
  clinicId?: ID[];
  patientId?: ID[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Pagination Response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Aging Bucket (for reports)
export interface AgingBucket {
  label: string;
  value: number;
  count: number;
}

// Report Data
export interface ReportData {
  agingBuckets: AgingBucket[];
  statusDistribution: {
    status: InvoiceStatus;
    count: number;
    value: number;
  }[];
  clientPerformance: {
    clientId: ID;
    clientName: string;
    invoiceCount: number;
    totalValue: number;
    disputeRate: number;
  avgDaysToPayment: number;
}[];
}

// Global Search Result Type
export interface SearchResult {
  id: string;
  type: 'invoice' | 'client' | 'clinic' | 'patient' | 'user';
  title: string;
  subtitle: string;
}
