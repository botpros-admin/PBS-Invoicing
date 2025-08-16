export interface PaymentCredit {
  id: string;
  paymentId: string;
  clientId: string;
  amount: number;
  remainingAmount: number;
  status: 'available' | 'applied' | 'expired' | 'refunded';
  appliedToInvoiceId?: string;
  appliedAt?: string;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreditApplication {
  id: string;
  creditId: string;
  invoiceId: string;
  amountApplied: number;
  appliedAt: string;
  appliedBy?: string;
  notes?: string;
}

export interface CreateCreditParams {
  paymentId: string;
  clientId: string;
  amount: number;
  notes?: string;
  expiresAt?: string;
}

export interface ApplyCreditParams {
  creditId: string;
  invoiceId: string;
  amount?: number; // Optional - will apply maximum possible if not specified
}

export interface CreditSummary {
  clientId: string;
  clientName: string;
  totalCredits: number;
  availableCredits: number;
  appliedCredits: number;
  expiredCredits: number;
  credits: PaymentCredit[];
}