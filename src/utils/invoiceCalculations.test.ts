/**
 * Invoice Calculations Test Suite
 * CRITICAL: Ensures accurate medical billing calculations
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLineItem,
  calculateInvoiceTotal,
  applyInsuranceCoverage,
  calculatePatientResponsibility,
  validateCPTCode,
  calculateDueDate,
  isInvoiceOverdue,
  calculateLateFee,
  formatInvoiceNumber,
  type InvoiceLineItem,
  type InsuranceAdjustment
} from './invoiceCalculations';

describe('Invoice Calculations - CRITICAL MEDICAL BILLING ACCURACY', () => {

  describe('calculateLineItem - LINE ITEM CALCULATIONS', () => {
    it('should calculate simple line item correctly', () => {
      const item: InvoiceLineItem = {
        id: '1',
        description: 'Office Visit',
        cptCode: '99213',
        quantity: 1,
        unitPrice: 150.00
      };

      const result = calculateLineItem(item);
      
      expect(result.lineTotal).toBe(150.00);
      expect(result.discountAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.finalAmount).toBe(150.00);
    });

    it('should calculate line item with quantity correctly', () => {
      const item: InvoiceLineItem = {
        id: '1',
        description: 'Lab Test',
        quantity: 3,
        unitPrice: 50.00
      };

      const result = calculateLineItem(item);
      
      expect(result.lineTotal).toBe(150.00);
      expect(result.finalAmount).toBe(150.00);
    });

    it('should apply discount correctly', () => {
      const item: InvoiceLineItem = {
        id: '1',
        description: 'Procedure',
        quantity: 1,
        unitPrice: 1000.00,
        discount: 0.10 // 10% discount
      };

      const result = calculateLineItem(item);
      
      expect(result.lineTotal).toBe(1000.00);
      expect(result.discountAmount).toBe(100.00);
      expect(result.finalAmount).toBe(900.00);
    });

    it('should apply tax correctly', () => {
      const item: InvoiceLineItem = {
        id: '1',
        description: 'Medical Supply',
        quantity: 2,
        unitPrice: 25.00,
        tax: 0.08 // 8% tax
      };

      const result = calculateLineItem(item);
      
      expect(result.lineTotal).toBe(50.00);
      expect(result.taxAmount).toBe(4.00);
      expect(result.finalAmount).toBe(54.00);
    });

    it('should apply both discount and tax in correct order', () => {
      const item: InvoiceLineItem = {
        id: '1',
        description: 'Service',
        quantity: 1,
        unitPrice: 100.00,
        discount: 0.20, // 20% discount
        tax: 0.10 // 10% tax
      };

      const result = calculateLineItem(item);
      
      expect(result.lineTotal).toBe(100.00);
      expect(result.discountAmount).toBe(20.00);
      expect(result.taxAmount).toBe(8.00); // Tax on discounted amount (80)
      expect(result.finalAmount).toBe(88.00); // 80 + 8
    });

    it('should handle zero quantity', () => {
      const item: InvoiceLineItem = {
        id: '1',
        description: 'Service',
        quantity: 0,
        unitPrice: 100.00
      };

      const result = calculateLineItem(item);
      expect(result.finalAmount).toBe(0);
    });

    it('should handle decimal quantities for medications', () => {
      const item: InvoiceLineItem = {
        id: '1',
        description: 'Medication',
        quantity: 0.5,
        unitPrice: 100.00
      };

      const result = calculateLineItem(item);
      expect(result.lineTotal).toBe(50.00);
      expect(result.finalAmount).toBe(50.00);
    });

    it('should throw error for negative values', () => {
      expect(() => calculateLineItem({
        id: '1',
        description: 'Test',
        quantity: -1,
        unitPrice: 100
      })).toThrow('Quantity and unit price must be non-negative');

      expect(() => calculateLineItem({
        id: '1',
        description: 'Test',
        quantity: 1,
        unitPrice: -100
      })).toThrow('Quantity and unit price must be non-negative');
    });

    it('should throw error for invalid discount', () => {
      expect(() => calculateLineItem({
        id: '1',
        description: 'Test',
        quantity: 1,
        unitPrice: 100,
        discount: 1.5
      })).toThrow('Discount must be between 0 and 1');
    });

    it('should handle rounding correctly', () => {
      const item: InvoiceLineItem = {
        id: '1',
        description: 'Service',
        quantity: 3,
        unitPrice: 33.33,
        tax: 0.0825
      };

      const result = calculateLineItem(item);
      
      expect(result.lineTotal).toBe(99.99);
      expect(result.taxAmount).toBe(8.25);
      expect(result.finalAmount).toBe(108.24);
    });
  });

  describe('calculateInvoiceTotal - AGGREGATE CALCULATIONS', () => {
    it('should calculate invoice with multiple line items', () => {
      const lineItems: InvoiceLineItem[] = [
        { id: '1', description: 'Office Visit', quantity: 1, unitPrice: 150.00 },
        { id: '2', description: 'Lab Test', quantity: 2, unitPrice: 75.00 },
        { id: '3', description: 'X-Ray', quantity: 1, unitPrice: 200.00 }
      ];

      const result = calculateInvoiceTotal(lineItems);
      
      expect(result.subtotal).toBe(500.00);
      expect(result.totalDiscount).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.total).toBe(500.00);
      expect(result.lineItems).toHaveLength(3);
    });

    it('should aggregate discounts and taxes correctly', () => {
      const lineItems: InvoiceLineItem[] = [
        { id: '1', description: 'Service 1', quantity: 1, unitPrice: 100.00, discount: 0.10, tax: 0.08 },
        { id: '2', description: 'Service 2', quantity: 1, unitPrice: 200.00, discount: 0.15, tax: 0.08 },
        { id: '3', description: 'Service 3', quantity: 1, unitPrice: 300.00, tax: 0.08 }
      ];

      const result = calculateInvoiceTotal(lineItems);
      
      expect(result.subtotal).toBe(600.00);
      expect(result.totalDiscount).toBe(40.00); // 10 + 30
      expect(result.totalTax).toBe(44.80); // 7.20 + 13.60 + 24.00
      expect(result.total).toBe(604.80); // 97.20 + 183.60 + 324.00
    });

    it('should handle empty invoice', () => {
      const result = calculateInvoiceTotal([]);
      
      expect(result.subtotal).toBe(0);
      expect(result.totalDiscount).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.total).toBe(0);
      expect(result.lineItems).toHaveLength(0);
    });

    it('should handle single item invoice', () => {
      const lineItems: InvoiceLineItem[] = [
        { id: '1', description: 'Consultation', quantity: 1, unitPrice: 250.00 }
      ];

      const result = calculateInvoiceTotal(lineItems);
      
      expect(result.subtotal).toBe(250.00);
      expect(result.total).toBe(250.00);
      expect(result.lineItems).toHaveLength(1);
    });

    it('should throw error for invalid input', () => {
      expect(() => calculateInvoiceTotal(null as any)).toThrow('Line items must be an array');
      expect(() => calculateInvoiceTotal(undefined as any)).toThrow('Line items must be an array');
    });
  });

  describe('applyInsuranceCoverage - INSURANCE CALCULATIONS', () => {
    it('should calculate basic insurance coverage', () => {
      const insurance: InsuranceAdjustment = {
        insuranceId: 'ins-1',
        coveragePercent: 0.80,
        coverageAmount: 0
      };

      const result = applyInsuranceCoverage(1000, insurance);
      
      expect(result.coveredAmount).toBe(800.00);
      expect(result.patientResponsibility).toBe(200.00);
      expect(result.deductibleApplied).toBe(0);
      expect(result.copayAmount).toBe(0);
    });

    it('should apply deductible before coverage', () => {
      const insurance: InsuranceAdjustment = {
        insuranceId: 'ins-1',
        coveragePercent: 0.80,
        coverageAmount: 0,
        deductible: 200
      };

      const result = applyInsuranceCoverage(1000, insurance);
      
      expect(result.deductibleApplied).toBe(200.00);
      expect(result.coveredAmount).toBe(640.00); // 80% of (1000 - 200)
      expect(result.patientResponsibility).toBe(360.00);
    });

    it('should include copay in patient responsibility', () => {
      const insurance: InsuranceAdjustment = {
        insuranceId: 'ins-1',
        coveragePercent: 0.80,
        coverageAmount: 0,
        copay: 25
      };

      const result = applyInsuranceCoverage(1000, insurance);
      
      expect(result.coveredAmount).toBe(800.00);
      expect(result.copayAmount).toBe(25.00);
      expect(result.patientResponsibility).toBe(225.00); // 200 + 25 copay
    });

    it('should respect maximum benefit limit', () => {
      const insurance: InsuranceAdjustment = {
        insuranceId: 'ins-1',
        coveragePercent: 0.80,
        coverageAmount: 0,
        maxBenefit: 500
      };

      const result = applyInsuranceCoverage(1000, insurance);
      
      expect(result.coveredAmount).toBe(500.00); // Limited by max benefit
      expect(result.patientResponsibility).toBe(500.00);
    });

    it('should handle 100% coverage', () => {
      const insurance: InsuranceAdjustment = {
        insuranceId: 'ins-1',
        coveragePercent: 1.00,
        coverageAmount: 0
      };

      const result = applyInsuranceCoverage(500, insurance);
      
      expect(result.coveredAmount).toBe(500.00);
      expect(result.patientResponsibility).toBe(0);
    });

    it('should handle zero coverage', () => {
      const insurance: InsuranceAdjustment = {
        insuranceId: 'ins-1',
        coveragePercent: 0,
        coverageAmount: 0
      };

      const result = applyInsuranceCoverage(500, insurance);
      
      expect(result.coveredAmount).toBe(0);
      expect(result.patientResponsibility).toBe(500.00);
    });

    it('should throw error for invalid inputs', () => {
      const insurance: InsuranceAdjustment = {
        insuranceId: 'ins-1',
        coveragePercent: 0.80,
        coverageAmount: 0
      };

      expect(() => applyInsuranceCoverage(-100, insurance)).toThrow('Invoice total cannot be negative');
      
      expect(() => applyInsuranceCoverage(100, {
        ...insurance,
        coveragePercent: -0.1
      })).toThrow('Coverage percent must be between 0 and 1');
    });
  });

  describe('calculatePatientResponsibility - COORDINATION OF BENEFITS', () => {
    it('should calculate with primary insurance only', () => {
      const primary: InsuranceAdjustment = {
        insuranceId: 'primary',
        coveragePercent: 0.80,
        coverageAmount: 0
      };

      const result = calculatePatientResponsibility(1000, primary);
      
      expect(result.primaryCoverage).toBe(800.00);
      expect(result.secondaryCoverage).toBe(0);
      expect(result.totalCoverage).toBe(800.00);
      expect(result.patientResponsibility).toBe(200.00);
    });

    it('should coordinate primary and secondary insurance', () => {
      const primary: InsuranceAdjustment = {
        insuranceId: 'primary',
        coveragePercent: 0.80,
        coverageAmount: 0
      };

      const secondary: InsuranceAdjustment = {
        insuranceId: 'secondary',
        coveragePercent: 0.50,
        coverageAmount: 0
      };

      const result = calculatePatientResponsibility(1000, primary, secondary);
      
      expect(result.primaryCoverage).toBe(800.00);
      expect(result.secondaryCoverage).toBe(100.00); // 50% of remaining 200
      expect(result.totalCoverage).toBe(900.00);
      expect(result.patientResponsibility).toBe(100.00);
    });

    it('should handle full coverage between insurances', () => {
      const primary: InsuranceAdjustment = {
        insuranceId: 'primary',
        coveragePercent: 0.70,
        coverageAmount: 0
      };

      const secondary: InsuranceAdjustment = {
        insuranceId: 'secondary',
        coveragePercent: 1.00,
        coverageAmount: 0
      };

      const result = calculatePatientResponsibility(500, primary, secondary);
      
      expect(result.primaryCoverage).toBe(350.00);
      expect(result.secondaryCoverage).toBe(150.00);
      expect(result.totalCoverage).toBe(500.00);
      expect(result.patientResponsibility).toBe(0);
    });

    it('should handle no insurance', () => {
      const result = calculatePatientResponsibility(500);
      
      expect(result.primaryCoverage).toBe(0);
      expect(result.secondaryCoverage).toBe(0);
      expect(result.totalCoverage).toBe(0);
      expect(result.patientResponsibility).toBe(500.00);
    });

    it('should never have negative patient responsibility', () => {
      const primary: InsuranceAdjustment = {
        insuranceId: 'primary',
        coveragePercent: 1.20, // Over 100% (shouldn't happen but testing edge case)
        coverageAmount: 0
      };

      // This should throw due to validation
      expect(() => calculatePatientResponsibility(100, primary))
        .toThrow('Coverage percent must be between 0 and 1');
    });
  });

  describe('validateCPTCode - CPT CODE VALIDATION', () => {
    it('should validate correct CPT codes', () => {
      expect(validateCPTCode('99213')).toBe(true);
      expect(validateCPTCode('00100')).toBe(true);
      expect(validateCPTCode('99999')).toBe(true);
    });

    it('should validate CPT codes with modifiers', () => {
      expect(validateCPTCode('99213-25')).toBe(true);
      expect(validateCPTCode('00100-51')).toBe(true);
    });

    it('should reject invalid CPT codes', () => {
      expect(validateCPTCode('9921')).toBe(false); // Too short
      expect(validateCPTCode('992133')).toBe(false); // Too long
      expect(validateCPTCode('ABCDE')).toBe(false); // Letters
      expect(validateCPTCode('99213-ABC')).toBe(false); // Invalid modifier
      expect(validateCPTCode('')).toBe(false);
      expect(validateCPTCode(null as any)).toBe(false);
      expect(validateCPTCode(undefined as any)).toBe(false);
    });
  });

  describe('calculateDueDate - DUE DATE CALCULATIONS', () => {
    it('should calculate due date with default 30 days', () => {
      const invoiceDate = new Date('2024-01-01');
      const dueDate = calculateDueDate(invoiceDate);
      
      expect(dueDate.toISOString().split('T')[0]).toBe('2024-01-31');
    });

    it('should calculate due date with custom terms', () => {
      const invoiceDate = new Date('2024-01-01');
      const dueDate = calculateDueDate(invoiceDate, 15);
      
      expect(dueDate.toISOString().split('T')[0]).toBe('2024-01-16');
    });

    it('should handle zero day terms (due immediately)', () => {
      const invoiceDate = new Date('2024-01-01');
      const dueDate = calculateDueDate(invoiceDate, 0);
      
      expect(dueDate.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('should handle month boundaries correctly', () => {
      const invoiceDate = new Date('2024-01-15');
      const dueDate = calculateDueDate(invoiceDate, 30);
      
      expect(dueDate.toISOString().split('T')[0]).toBe('2024-02-14');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateDueDate(new Date('invalid'), 30)).toThrow('Invalid invoice date');
      expect(() => calculateDueDate(new Date('2024-01-01'), -1)).toThrow('Payment terms cannot be negative');
    });
  });

  describe('isInvoiceOverdue - OVERDUE STATUS', () => {
    it('should correctly identify overdue invoices', () => {
      const dueDate = new Date('2024-01-01');
      const currentDate = new Date('2024-01-02');
      
      expect(isInvoiceOverdue(dueDate, currentDate)).toBe(true);
    });

    it('should correctly identify current invoices', () => {
      const dueDate = new Date('2024-01-02');
      const currentDate = new Date('2024-01-01');
      
      expect(isInvoiceOverdue(dueDate, currentDate)).toBe(false);
    });

    it('should handle same day as not overdue', () => {
      const dueDate = new Date('2024-01-01');
      const currentDate = new Date('2024-01-01');
      
      expect(isInvoiceOverdue(dueDate, currentDate)).toBe(false);
    });

    it('should use current date if not provided', () => {
      const pastDate = new Date('2020-01-01');
      expect(isInvoiceOverdue(pastDate)).toBe(true);
      
      const futureDate = new Date('2030-01-01');
      expect(isInvoiceOverdue(futureDate)).toBe(false);
    });
  });

  describe('calculateLateFee - LATE FEE CALCULATIONS', () => {
    it('should calculate late fee for overdue invoice', () => {
      const lateFee = calculateLateFee(1000, 30, 0.015);
      expect(lateFee).toBe(15.00); // 1.5% of 1000
    });

    it('should calculate compound late fees for multiple periods', () => {
      const lateFee = calculateLateFee(1000, 60, 0.015);
      expect(lateFee).toBe(30.00); // 2 periods
    });

    it('should return zero for non-overdue invoice', () => {
      const lateFee = calculateLateFee(1000, 0, 0.015);
      expect(lateFee).toBe(0);
    });

    it('should respect maximum late fee', () => {
      const lateFee = calculateLateFee(1000, 90, 0.015, 25);
      expect(lateFee).toBe(25.00); // Limited by max
    });

    it('should handle partial months', () => {
      const lateFee = calculateLateFee(1000, 15, 0.015);
      expect(lateFee).toBe(15.00); // Rounds up to 1 period
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateLateFee(-100, 30, 0.015)).toThrow('Invalid input for late fee calculation');
      expect(() => calculateLateFee(100, -30, 0.015)).toThrow('Invalid input for late fee calculation');
      expect(() => calculateLateFee(100, 30, -0.015)).toThrow('Invalid input for late fee calculation');
    });
  });

  describe('formatInvoiceNumber - INVOICE NUMBER FORMATTING', () => {
    it('should format invoice number with default settings', () => {
      expect(formatInvoiceNumber(1)).toBe('INV-000001');
      expect(formatInvoiceNumber(123)).toBe('INV-000123');
      expect(formatInvoiceNumber(999999)).toBe('INV-999999');
    });

    it('should use custom prefix', () => {
      expect(formatInvoiceNumber(42, 'BILL')).toBe('BILL-000042');
      expect(formatInvoiceNumber(42, 'MED')).toBe('MED-000042');
    });

    it('should use custom padding', () => {
      expect(formatInvoiceNumber(42, 'INV', 4)).toBe('INV-0042');
      expect(formatInvoiceNumber(42, 'INV', 8)).toBe('INV-00000042');
    });

    it('should handle large numbers', () => {
      expect(formatInvoiceNumber(1234567, 'INV', 6)).toBe('INV-1234567');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => formatInvoiceNumber(-1)).toThrow('Sequence number cannot be negative');
      expect(() => formatInvoiceNumber(1, 'INV', 0)).toThrow('Pad length must be at least 1');
    });
  });

  describe('Complex Medical Billing Scenarios', () => {
    it('should handle complex multi-service invoice with insurance', () => {
      // Create a realistic medical invoice
      const lineItems: InvoiceLineItem[] = [
        { id: '1', description: 'Office Visit Level 3', cptCode: '99213', quantity: 1, unitPrice: 150.00 },
        { id: '2', description: 'EKG', cptCode: '93000', quantity: 1, unitPrice: 75.00 },
        { id: '3', description: 'Blood Test Panel', cptCode: '80053', quantity: 1, unitPrice: 125.00 },
        { id: '4', description: 'Flu Vaccine', cptCode: '90658', quantity: 1, unitPrice: 45.00, tax: 0.08 }
      ];

      const invoice = calculateInvoiceTotal(lineItems);
      expect(invoice.total).toBe(398.60); // 395 + 3.60 tax

      // Apply insurance
      const insurance: InsuranceAdjustment = {
        insuranceId: 'bcbs-123',
        coveragePercent: 0.80,
        coverageAmount: 0,
        deductible: 100,
        copay: 25
      };

      const coverage = applyInsuranceCoverage(invoice.total, insurance);
      expect(coverage.deductibleApplied).toBe(100.00);
      expect(coverage.coveredAmount).toBe(238.88); // 80% of (398.60 - 100)
      expect(coverage.patientResponsibility).toBe(184.72); // 398.60 - 238.88 + 25
    });

    it('should handle Medicare/Medicaid dual coverage scenario', () => {
      const invoiceTotal = 2500.00;

      const medicare: InsuranceAdjustment = {
        insuranceId: 'medicare',
        coveragePercent: 0.80,
        coverageAmount: 0,
        deductible: 250
      };

      const medicaid: InsuranceAdjustment = {
        insuranceId: 'medicaid',
        coveragePercent: 1.00, // Covers remaining
        coverageAmount: 0
      };

      const result = calculatePatientResponsibility(invoiceTotal, medicare, medicaid);
      
      expect(result.primaryCoverage).toBe(1800.00); // 80% of (2500 - 250)
      expect(result.secondaryCoverage).toBe(700.00); // 100% of remaining
      expect(result.patientResponsibility).toBe(0); // Fully covered
    });
  });
});