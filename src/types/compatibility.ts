/**
 * Type compatibility layer
 * 
 * This file provides interfaces that extend the base types to include 
 * backward compatibility properties used in mock data or older components.
 */

import { 
  Client, 
  InvoiceParameters, 
  Payment, 
  Clinic, 
  ClinicContact, 
  Invoice, 
  InvoiceItem,
  User,
  ID 
} from './index.js'; // Added .js extension

// Extended Client interface to handle 'clinic' properties used in mock data
export interface ExtendedClient extends Client {
  clinic?: string; // For backward compatibility
  logo?: string; // For backward compatibility
}

// Extended InvoiceParameters interface for mock data
export interface ExtendedInvoiceParameters extends Partial<InvoiceParameters> {
  // The mock data only includes these properties, so we make the required ones optional
  id?: number | string;
  createdAt?: string;
  updatedAt?: string;
}

// Extended Payment interface for mock data
export interface ExtendedPayment extends Payment {
  date?: string; // For backward compatibility
  reference?: string; // For backward compatibility
}

// Compatibility interfaces needed for services
export interface CompatClient {
  id: ID;
  name: string;
  logoUrl?: string;
  logo?: string; // Old format
  address?: string;
  clinics?: CompatClinic[];
  invoiceParameters?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompatClinic {
  id: ID;
  clientId?: ID;
  name: string;
  address: string;
  logoUrl?: string;
  logo?: string; // Old format
  salesRep?: string;
  preferredContactMethod?: 'email' | 'phone' | 'portal';
  billToAddress?: string;
  notes?: string;
  contractDocumentPath?: string;
  isActive?: boolean;
  parentClinicId?: ID;
  contacts?: CompatClinicContact[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CompatClinicContact {
  id: ID;
  clinicId?: ID;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  fax?: string;
  department?: string;
  notes?: string;
  isPrimary: boolean;
  clientUserId?: ID;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompatInvoice {
  id: ID;
  invoiceNumber: string;
  clientId?: ID; // Added for compatibility
  clinicId?: ID; // Added for compatibility
  patientId?: ID; // Added for compatibility
  client?: {
    id: ID;
    name: string;
    clinic?: string; // Old format
  };
  patient?: {
    id: ID;
    name: string;
    dob?: string;
    accessionNumber?: string;
  };
  dateCreated: string;
  dateDue: string;
  status: string;
  items?: any[];
  subtotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  reasonType?: string;
  notes?: string;
  writeOffAmount?: number;
  writeOffReason?: string;
  updatedAt?: string; // Added for compatibility
  createdAt?: string; // Added for compatibility
}

export interface CompatInvoiceItem {
  id: ID;
  invoiceId?: ID; // Added for compatibility
  cptCodeId?: ID; // Added for compatibility
  description: string;
  cptCode: string;
  dateOfService: string;
  quantity: number;
  unitPrice: number;
  total: number;
  disputed?: boolean;
  isDisputed?: boolean; // Added for compatibility
  medicalNecessity?: boolean;
  medicalNecessityProvided?: boolean; // Added for compatibility
  createdAt?: string; // Added for compatibility
  updatedAt?: string; // Added for compatibility
}

export interface CompatUser {
  id: ID;
  name: string;
  email: string;
  role: string;
  status?: string;
  avatar?: string;
  mfaEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  organizationId?: ID;
}

// Conversion functions
export function convertToClient(client: CompatClient): Client {
  return {
    id: client.id,
    name: client.name,
    logoUrl: client.logoUrl || client.logo,
    address: client.address,
    createdAt: client.createdAt || new Date().toISOString(),
    updatedAt: client.updatedAt || new Date().toISOString(),
    clinics: client.clinics?.map(clinic => convertToClinic(clinic, client.id)) || [],
    invoiceParameters: client.invoiceParameters ? convertToInvoiceParameters(client.invoiceParameters, client.id) : undefined
  } as Client;
}

export function convertToClinic(clinic: CompatClinic, clientId: ID): Clinic {
  return {
    id: clinic.id,
    clientId: clientId,
    name: clinic.name,
    address: clinic.address,
    logoUrl: clinic.logoUrl || clinic.logo,
    salesRep: clinic.salesRep,
    preferredContactMethod: clinic.preferredContactMethod,
    billToAddress: clinic.billToAddress,
    notes: clinic.notes,
    contractDocumentPath: clinic.contractDocumentPath,
    isActive: clinic.isActive !== undefined ? clinic.isActive : true,
    parentClinicId: clinic.parentClinicId,
    contacts: clinic.contacts?.map(contact => convertToClinicContact(contact, clinic.id)) || [],
    createdAt: clinic.createdAt || new Date().toISOString(),
    updatedAt: clinic.updatedAt || new Date().toISOString()
  } as Clinic;
}

export function convertToClinicContact(contact: CompatClinicContact, clinicId: ID): ClinicContact {
  return {
    id: contact.id,
    clinicId: clinicId,
    name: contact.name,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    fax: contact.fax,
    department: contact.department,
    notes: contact.notes,
    isPrimary: contact.isPrimary,
    clientUserId: contact.clientUserId,
    createdAt: contact.createdAt || new Date().toISOString(),
    updatedAt: contact.updatedAt || new Date().toISOString()
  } as ClinicContact;
}

export function convertToInvoiceParameters(params: any, clientId: ID): InvoiceParameters {
  return {
    id: params.id || `inv-params-${Date.now()}`,
    clientId: clientId,
    showLogo: params.showLogo !== undefined ? params.showLogo : true,
    logoPosition: params.logoPosition || 'top-left',
    headerStyle: params.headerStyle || 'modern',
    footerStyle: params.footerStyle || 'simple',
    companyName: params.companyName,
    companyAddress: params.companyAddress,
    companyEmail: params.companyEmail,
    companyPhone: params.companyPhone,
    customMessage: params.customMessage,
    primaryColor: params.primaryColor || '#0078D7',
    highlightColor: params.highlightColor || 'rgb(207, 240, 253)',
    fontFamily: params.fontFamily || 'Helvetica, Arial, sans-serif',
    fontSize: params.fontSize || '14px',
    createdAt: params.createdAt || new Date().toISOString(),
    updatedAt: params.updatedAt || new Date().toISOString()
  } as InvoiceParameters;
}

export function convertToInvoice(invoice: CompatInvoice): Invoice {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    dateCreated: invoice.dateCreated,
    dateDue: invoice.dateDue,
    status: invoice.status as any,
    subtotal: invoice.subtotal,
    total: invoice.total,
    amountPaid: invoice.amountPaid,
    balance: invoice.balance,
    reasonType: invoice.reasonType as any,
    notes: invoice.notes,
    writeOffAmount: invoice.writeOffAmount,
    writeOffReason: invoice.writeOffReason,
    // These fields aren't in the mock data but are required by the type
    clientId: invoice.client?.id || 'unknown',
    clinicId: 'unknown', // Not in the mock data
    patientId: invoice.patient?.id || 'unknown',
    createdAt: invoice.dateCreated,
    updatedAt: invoice.dateCreated,
    // Populated fields
    client: invoice.client as any,
    patient: invoice.patient as any,
    items: invoice.items?.map(item => convertToInvoiceItem(item as CompatInvoiceItem, invoice.id)) || []
  } as Invoice;
}

export function convertToInvoiceItem(item: CompatInvoiceItem, invoiceId: ID): InvoiceItem {
  return {
    id: item.id,
    invoiceId: invoiceId,
    cptCodeId: item.cptCode, // Using code as ID
    cptCode: item.cptCode,
    description: item.description,
    dateOfService: item.dateOfService,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
    isDisputed: item.disputed || false,
    medicalNecessityProvided: item.medicalNecessity || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as InvoiceItem;
}
