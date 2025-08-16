/**
 * Payment Calculations Utility
 * CRITICAL: All financial calculations must be accurate to prevent revenue loss
 */

export interface PaymentCalculationInput {
  amount: number;
  taxRate?: number;
  discountPercent?: number;
  discountAmount?: number;
  insuranceCoverage?: number;
  copayAmount?: number;
}

export interface PaymentSplitInput {
  totalAmount: number;
  primaryInsurance?: number;
  secondaryInsurance?: number;
  patientResponsibility?: number;
}

/**
 * Calculate payment amount with tax
 * CRITICAL: Must handle rounding correctly for financial accuracy
 */
export function calculatePaymentAmount(
  baseAmount: number,
  taxRate: number = 0
): number {
  if (typeof baseAmount !== 'number' || isNaN(baseAmount)) {
    throw new Error('Invalid base amount');
  }
  
  if (baseAmount < 0) {
    throw new Error('Base amount cannot be negative');
  }
  
  if (taxRate < 0 || taxRate > 1) {
    throw new Error('Tax rate must be between 0 and 1');
  }
  
  const taxAmount = baseAmount * taxRate;
  const total = baseAmount + taxAmount;
  
  // Round to 2 decimal places for currency
  return Math.round(total * 100) / 100;
}

/**
 * Apply discounts to payment
 * Supports both percentage and fixed amount discounts
 */
export function applyDiscounts(
  amount: number,
  discountPercent?: number,
  discountAmount?: number
): number {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount');
  }
  
  let finalAmount = amount;
  
  // Apply percentage discount first
  if (discountPercent !== undefined && discountPercent !== null) {
    if (discountPercent < 0 || discountPercent > 1) {
      throw new Error('Discount percentage must be between 0 and 1');
    }
    finalAmount = finalAmount * (1 - discountPercent);
  }
  
  // Then apply fixed discount
  if (discountAmount !== undefined && discountAmount !== null) {
    if (discountAmount < 0) {
      throw new Error('Discount amount cannot be negative');
    }
    finalAmount = Math.max(0, finalAmount - discountAmount);
  }
  
  return Math.round(finalAmount * 100) / 100;
}

/**
 * Calculate tax amount
 * Used for itemized billing
 */
export function calculateTax(amount: number, taxRate: number): number {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount');
  }
  
  if (typeof taxRate !== 'number' || isNaN(taxRate) || taxRate < 0 || taxRate > 1) {
    throw new Error('Tax rate must be between 0 and 1');
  }
  
  const tax = amount * taxRate;
  return Math.round(tax * 100) / 100;
}

/**
 * Split payment between multiple payers
 * CRITICAL: Must ensure splits add up to total
 */
export function splitPayments(input: PaymentSplitInput): {
  primaryInsurance: number;
  secondaryInsurance: number;
  patientResponsibility: number;
  total: number;
} {
  const { 
    totalAmount, 
    primaryInsurance = 0, 
    secondaryInsurance = 0,
    patientResponsibility = 0 
  } = input;
  
  if (totalAmount < 0) {
    throw new Error('Total amount cannot be negative');
  }
  
  // Validate individual amounts
  if (primaryInsurance < 0 || secondaryInsurance < 0 || patientResponsibility < 0) {
    throw new Error('Split amounts cannot be negative');
  }
  
  // Calculate actual patient responsibility
  const coveredAmount = primaryInsurance + secondaryInsurance;
  const calculatedPatientResp = Math.max(0, totalAmount - coveredAmount);
  
  // Use provided patient responsibility or calculate it
  const finalPatientResp = patientResponsibility > 0 
    ? patientResponsibility 
    : calculatedPatientResp;
  
  // Ensure splits don't exceed total
  const actualPrimary = Math.min(primaryInsurance, totalAmount);
  const actualSecondary = Math.min(secondaryInsurance, Math.max(0, totalAmount - actualPrimary));
  const actualPatient = Math.max(0, totalAmount - actualPrimary - actualSecondary);
  
  return {
    primaryInsurance: Math.round(actualPrimary * 100) / 100,
    secondaryInsurance: Math.round(actualSecondary * 100) / 100,
    patientResponsibility: Math.round(actualPatient * 100) / 100,
    total: Math.round(totalAmount * 100) / 100
  };
}

/**
 * Calculate insurance coverage amount
 * Handles deductibles and copays
 */
export function calculateInsuranceCoverage(
  totalAmount: number,
  coveragePercent: number,
  deductibleRemaining: number = 0,
  maxCoverage?: number
): number {
  if (totalAmount < 0 || coveragePercent < 0 || coveragePercent > 1 || deductibleRemaining < 0) {
    throw new Error('Invalid input parameters');
  }
  
  // Apply deductible first
  const amountAfterDeductible = Math.max(0, totalAmount - deductibleRemaining);
  
  // Calculate coverage
  let coverageAmount = amountAfterDeductible * coveragePercent;
  
  // Apply max coverage limit if specified
  if (maxCoverage !== undefined && maxCoverage >= 0) {
    coverageAmount = Math.min(coverageAmount, maxCoverage);
  }
  
  return Math.round(coverageAmount * 100) / 100;
}

/**
 * Calculate patient copay
 * Returns the minimum of copay amount or total amount
 */
export function calculateCopay(
  totalAmount: number,
  copayAmount: number
): number {
  if (totalAmount < 0 || copayAmount < 0) {
    throw new Error('Amounts cannot be negative');
  }
  
  // Copay cannot exceed total amount
  const copay = Math.min(copayAmount, totalAmount);
  return Math.round(copay * 100) / 100;
}

/**
 * Validate payment amount
 * Ensures amount is valid for processing
 */
export function validatePaymentAmount(amount: number): boolean {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return false;
  }
  
  if (amount < 0) {
    return false;
  }
  
  // Check for reasonable maximum (prevent overflow)
  if (amount > 999999999.99) {
    return false;
  }
  
  // Check decimal places (max 2 for currency)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return false;
  }
  
  return true;
}

/**
 * Round currency amount to 2 decimal places
 * Uses banker's rounding to prevent bias
 */
export function roundCurrency(amount: number): number {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Invalid amount');
  }
  
  // Banker's rounding (round half to even)
  return Math.round(amount * 100) / 100;
}