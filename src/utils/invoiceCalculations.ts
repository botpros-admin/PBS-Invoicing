/**
 * Invoice Calculations Utility
 * CRITICAL: Ensures accurate invoice generation for medical billing
 */

export interface InvoiceLineItem {
  id: string;
  description: string;
  cptCode?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
}

export interface InvoiceCalculation {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  lineItems: CalculatedLineItem[];
}

export interface CalculatedLineItem extends InvoiceLineItem {
  lineTotal: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
}

export interface InsuranceAdjustment {
  insuranceId: string;
  coveragePercent: number;
  coverageAmount: number;
  deductible?: number;
  copay?: number;
  maxBenefit?: number;
}

/**
 * Calculate line item total
 * CRITICAL: Must handle quantity, discount, and tax correctly
 */
export function calculateLineItem(item: InvoiceLineItem): CalculatedLineItem {
  if (!item || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
    throw new Error('Invalid line item data');
  }

  if (item.quantity < 0 || item.unitPrice < 0) {
    throw new Error('Quantity and unit price must be non-negative');
  }

  // Calculate base amount
  const baseAmount = item.quantity * item.unitPrice;
  
  // Apply discount
  const discountPercent = item.discount || 0;
  if (discountPercent < 0 || discountPercent > 1) {
    throw new Error('Discount must be between 0 and 1');
  }
  const discountAmount = baseAmount * discountPercent;
  const amountAfterDiscount = baseAmount - discountAmount;
  
  // Apply tax
  const taxRate = item.tax || 0;
  if (taxRate < 0 || taxRate > 1) {
    throw new Error('Tax rate must be between 0 and 1');
  }
  const taxAmount = amountAfterDiscount * taxRate;
  const finalAmount = amountAfterDiscount + taxAmount;

  return {
    ...item,
    lineTotal: Math.round(baseAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    finalAmount: Math.round(finalAmount * 100) / 100
  };
}

/**
 * Calculate invoice totals
 * CRITICAL: Must accurately aggregate all line items
 */
export function calculateInvoiceTotal(lineItems: InvoiceLineItem[]): InvoiceCalculation {
  if (!Array.isArray(lineItems)) {
    throw new Error('Line items must be an array');
  }

  if (lineItems.length === 0) {
    return {
      subtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      total: 0,
      lineItems: []
    };
  }

  const calculatedItems = lineItems.map(calculateLineItem);
  
  const subtotal = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalDiscount = calculatedItems.reduce((sum, item) => sum + item.discountAmount, 0);
  const totalTax = calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = calculatedItems.reduce((sum, item) => sum + item.finalAmount, 0);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    total: Math.round(total * 100) / 100,
    lineItems: calculatedItems
  };
}

/**
 * Apply insurance coverage to invoice
 * CRITICAL: Must correctly calculate insurance adjustments
 */
export function applyInsuranceCoverage(
  invoiceTotal: number,
  insurance: InsuranceAdjustment
): {
  coveredAmount: number;
  patientResponsibility: number;
  deductibleApplied: number;
  copayAmount: number;
} {
  if (invoiceTotal < 0) {
    throw new Error('Invoice total cannot be negative');
  }

  if (insurance.coveragePercent < 0 || insurance.coveragePercent > 1) {
    throw new Error('Coverage percent must be between 0 and 1');
  }

  const deductible = insurance.deductible || 0;
  const copay = insurance.copay || 0;
  const maxBenefit = insurance.maxBenefit || Infinity;

  // Apply deductible
  const deductibleApplied = Math.min(deductible, invoiceTotal);
  const amountAfterDeductible = invoiceTotal - deductibleApplied;

  // Calculate coverage
  let coveredAmount = amountAfterDeductible * insurance.coveragePercent;
  
  // Apply maximum benefit limit
  coveredAmount = Math.min(coveredAmount, maxBenefit);

  // Calculate patient responsibility
  const patientResponsibility = invoiceTotal - coveredAmount + copay;

  return {
    coveredAmount: Math.round(coveredAmount * 100) / 100,
    patientResponsibility: Math.round(Math.max(0, patientResponsibility) * 100) / 100,
    deductibleApplied: Math.round(deductibleApplied * 100) / 100,
    copayAmount: Math.round(copay * 100) / 100
  };
}

/**
 * Calculate patient responsibility with multiple insurances
 * CRITICAL: Coordination of benefits calculation
 */
export function calculatePatientResponsibility(
  invoiceTotal: number,
  primaryInsurance?: InsuranceAdjustment,
  secondaryInsurance?: InsuranceAdjustment
): {
  primaryCoverage: number;
  secondaryCoverage: number;
  totalCoverage: number;
  patientResponsibility: number;
} {
  if (invoiceTotal < 0) {
    throw new Error('Invoice total cannot be negative');
  }

  let primaryCoverage = 0;
  let secondaryCoverage = 0;
  let remainingBalance = invoiceTotal;

  // Apply primary insurance
  if (primaryInsurance) {
    const primary = applyInsuranceCoverage(invoiceTotal, primaryInsurance);
    primaryCoverage = primary.coveredAmount;
    remainingBalance = invoiceTotal - primaryCoverage;
  }

  // Apply secondary insurance to remaining balance
  if (secondaryInsurance && remainingBalance > 0) {
    const secondary = applyInsuranceCoverage(remainingBalance, secondaryInsurance);
    secondaryCoverage = secondary.coveredAmount;
    remainingBalance = remainingBalance - secondaryCoverage;
  }

  const totalCoverage = primaryCoverage + secondaryCoverage;
  const patientResponsibility = Math.max(0, invoiceTotal - totalCoverage);

  return {
    primaryCoverage: Math.round(primaryCoverage * 100) / 100,
    secondaryCoverage: Math.round(secondaryCoverage * 100) / 100,
    totalCoverage: Math.round(totalCoverage * 100) / 100,
    patientResponsibility: Math.round(patientResponsibility * 100) / 100
  };
}

/**
 * Validate CPT code format
 * CRITICAL: Invalid CPT codes will cause claim rejections
 */
export function validateCPTCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // CPT codes are 5 digits, sometimes with modifiers
  const cptRegex = /^[0-9]{5}(-[0-9]{2})?$/;
  return cptRegex.test(code);
}

/**
 * Calculate invoice due date based on terms
 * @param invoiceDate - Date the invoice was created
 * @param terms - Payment terms in days (e.g., 30 for Net 30)
 */
export function calculateDueDate(invoiceDate: Date, terms: number = 30): Date {
  if (!(invoiceDate instanceof Date) || isNaN(invoiceDate.getTime())) {
    throw new Error('Invalid invoice date');
  }

  if (terms < 0) {
    throw new Error('Payment terms cannot be negative');
  }

  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + terms);
  return dueDate;
}

/**
 * Check if invoice is overdue
 */
export function isInvoiceOverdue(dueDate: Date, currentDate: Date = new Date()): boolean {
  if (!(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
    throw new Error('Invalid due date');
  }

  if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    throw new Error('Invalid current date');
  }

  return currentDate > dueDate;
}

/**
 * Calculate late fee if applicable
 */
export function calculateLateFee(
  invoiceAmount: number,
  daysOverdue: number,
  lateFeePercent: number = 0.015,
  maxLateFee?: number
): number {
  if (invoiceAmount < 0 || daysOverdue < 0 || lateFeePercent < 0) {
    throw new Error('Invalid input for late fee calculation');
  }

  if (daysOverdue === 0) {
    return 0;
  }

  // Simple late fee calculation (not compound)
  let lateFee = invoiceAmount * lateFeePercent * Math.ceil(daysOverdue / 30);
  
  if (maxLateFee !== undefined && maxLateFee >= 0) {
    lateFee = Math.min(lateFee, maxLateFee);
  }

  return Math.round(lateFee * 100) / 100;
}

/**
 * Format invoice number with prefix and padding
 */
export function formatInvoiceNumber(
  sequenceNumber: number,
  prefix: string = 'INV',
  padLength: number = 6
): string {
  if (sequenceNumber < 0) {
    throw new Error('Sequence number cannot be negative');
  }

  if (padLength < 1) {
    throw new Error('Pad length must be at least 1');
  }

  const paddedNumber = String(sequenceNumber).padStart(padLength, '0');
  return `${prefix}-${paddedNumber}`;
}