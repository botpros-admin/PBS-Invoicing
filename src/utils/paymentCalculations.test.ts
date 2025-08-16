/**
 * Payment Calculations Test Suite
 * CRITICAL: These tests ensure financial accuracy
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePaymentAmount,
  applyDiscounts,
  calculateTax,
  splitPayments,
  calculateInsuranceCoverage,
  calculateCopay,
  validatePaymentAmount,
  roundCurrency
} from './paymentCalculations';

describe('Payment Calculations - CRITICAL FINANCIAL LOGIC', () => {
  
  describe('calculatePaymentAmount', () => {
    it('should calculate payment with no tax correctly', () => {
      expect(calculatePaymentAmount(100, 0)).toBe(100);
      expect(calculatePaymentAmount(99.99, 0)).toBe(99.99);
    });

    it('should calculate payment with tax correctly', () => {
      expect(calculatePaymentAmount(100, 0.10)).toBe(110);
      expect(calculatePaymentAmount(100, 0.0825)).toBe(108.25);
    });

    it('should handle edge case amounts', () => {
      expect(calculatePaymentAmount(0, 0.10)).toBe(0);
      expect(calculatePaymentAmount(0.01, 0.10)).toBe(0.01);
      expect(calculatePaymentAmount(999999.99, 0.10)).toBe(1099999.99);
    });

    it('should round to 2 decimal places', () => {
      expect(calculatePaymentAmount(10.005, 0)).toBe(10.01);
      expect(calculatePaymentAmount(10.004, 0)).toBe(10);
      expect(calculatePaymentAmount(100, 0.175)).toBe(117.5);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculatePaymentAmount(NaN, 0)).toThrow('Invalid base amount');
      expect(() => calculatePaymentAmount(-1, 0)).toThrow('Base amount cannot be negative');
      expect(() => calculatePaymentAmount(100, -0.1)).toThrow('Tax rate must be between 0 and 1');
      expect(() => calculatePaymentAmount(100, 1.5)).toThrow('Tax rate must be between 0 and 1');
    });
  });

  describe('applyDiscounts', () => {
    it('should apply percentage discount correctly', () => {
      expect(applyDiscounts(100, 0.10)).toBe(90);
      expect(applyDiscounts(100, 0.25)).toBe(75);
      expect(applyDiscounts(100, 0)).toBe(100);
      expect(applyDiscounts(100, 1)).toBe(0);
    });

    it('should apply fixed amount discount correctly', () => {
      expect(applyDiscounts(100, undefined, 10)).toBe(90);
      expect(applyDiscounts(100, undefined, 150)).toBe(0);
      expect(applyDiscounts(50, undefined, 50)).toBe(0);
    });

    it('should apply both percentage and fixed discounts in order', () => {
      // 100 * 0.9 = 90, then 90 - 10 = 80
      expect(applyDiscounts(100, 0.10, 10)).toBe(80);
      // 100 * 0.5 = 50, then 50 - 25 = 25
      expect(applyDiscounts(100, 0.50, 25)).toBe(25);
    });

    it('should never return negative amounts', () => {
      expect(applyDiscounts(10, undefined, 20)).toBe(0);
      expect(applyDiscounts(10, 0.5, 20)).toBe(0);
    });

    it('should handle rounding correctly', () => {
      expect(applyDiscounts(33.33, 0.10)).toBe(30);
      expect(applyDiscounts(10.005, 0)).toBe(10.01);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => applyDiscounts(-10, 0.1)).toThrow('Invalid amount');
      expect(() => applyDiscounts(NaN, 0.1)).toThrow('Invalid amount');
      expect(() => applyDiscounts(100, -0.1)).toThrow('Discount percentage must be between 0 and 1');
      expect(() => applyDiscounts(100, 1.5)).toThrow('Discount percentage must be between 0 and 1');
      expect(() => applyDiscounts(100, undefined, -10)).toThrow('Discount amount cannot be negative');
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax correctly', () => {
      expect(calculateTax(100, 0.10)).toBe(10);
      expect(calculateTax(100, 0.0825)).toBe(8.25);
      expect(calculateTax(0, 0.10)).toBe(0);
    });

    it('should handle rounding correctly', () => {
      expect(calculateTax(10.10, 0.175)).toBe(1.77);
      expect(calculateTax(33.33, 0.10)).toBe(3.33);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateTax(-100, 0.1)).toThrow('Invalid amount');
      expect(() => calculateTax(NaN, 0.1)).toThrow('Invalid amount');
      expect(() => calculateTax(100, -0.1)).toThrow('Tax rate must be between 0 and 1');
      expect(() => calculateTax(100, 1.1)).toThrow('Tax rate must be between 0 and 1');
      expect(() => calculateTax(100, NaN)).toThrow('Tax rate must be between 0 and 1');
    });
  });

  describe('splitPayments - CRITICAL FOR MULTI-PAYER BILLING', () => {
    it('should split payments correctly with all payers', () => {
      const result = splitPayments({
        totalAmount: 1000,
        primaryInsurance: 700,
        secondaryInsurance: 200,
        patientResponsibility: 100
      });
      
      expect(result.primaryInsurance).toBe(700);
      expect(result.secondaryInsurance).toBe(200);
      expect(result.patientResponsibility).toBe(100);
      expect(result.total).toBe(1000);
    });

    it('should calculate patient responsibility when not provided', () => {
      const result = splitPayments({
        totalAmount: 1000,
        primaryInsurance: 700,
        secondaryInsurance: 200
      });
      
      expect(result.patientResponsibility).toBe(100);
    });

    it('should handle when insurance exceeds total', () => {
      const result = splitPayments({
        totalAmount: 500,
        primaryInsurance: 600,
        secondaryInsurance: 200
      });
      
      expect(result.primaryInsurance).toBe(500);
      expect(result.secondaryInsurance).toBe(0);
      expect(result.patientResponsibility).toBe(0);
    });

    it('should handle partial secondary coverage', () => {
      const result = splitPayments({
        totalAmount: 800,
        primaryInsurance: 600,
        secondaryInsurance: 300
      });
      
      expect(result.primaryInsurance).toBe(600);
      expect(result.secondaryInsurance).toBe(200);
      expect(result.patientResponsibility).toBe(0);
    });

    it('should handle zero amounts', () => {
      const result = splitPayments({
        totalAmount: 0,
        primaryInsurance: 0,
        secondaryInsurance: 0
      });
      
      expect(result.primaryInsurance).toBe(0);
      expect(result.secondaryInsurance).toBe(0);
      expect(result.patientResponsibility).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should throw error for negative amounts', () => {
      expect(() => splitPayments({ totalAmount: -100 })).toThrow('Total amount cannot be negative');
      expect(() => splitPayments({ 
        totalAmount: 100, 
        primaryInsurance: -50 
      })).toThrow('Split amounts cannot be negative');
    });
  });

  describe('calculateInsuranceCoverage - INSURANCE CLAIM ACCURACY', () => {
    it('should calculate basic coverage correctly', () => {
      expect(calculateInsuranceCoverage(1000, 0.80, 0)).toBe(800);
      expect(calculateInsuranceCoverage(1000, 0.70, 0)).toBe(700);
      expect(calculateInsuranceCoverage(1000, 1, 0)).toBe(1000);
    });

    it('should apply deductible before coverage', () => {
      // $1000 - $200 deductible = $800, then 80% = $640
      expect(calculateInsuranceCoverage(1000, 0.80, 200)).toBe(640);
      // Deductible exceeds amount
      expect(calculateInsuranceCoverage(100, 0.80, 200)).toBe(0);
    });

    it('should apply maximum coverage limit', () => {
      expect(calculateInsuranceCoverage(1000, 0.80, 0, 500)).toBe(500);
      expect(calculateInsuranceCoverage(1000, 0.80, 0, 1000)).toBe(800);
    });

    it('should handle complex scenarios', () => {
      // $5000 - $500 deductible = $4500, 80% = $3600, max $3000 = $3000
      expect(calculateInsuranceCoverage(5000, 0.80, 500, 3000)).toBe(3000);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateInsuranceCoverage(-100, 0.8, 0)).toThrow('Invalid input parameters');
      expect(() => calculateInsuranceCoverage(100, -0.1, 0)).toThrow('Invalid input parameters');
      expect(() => calculateInsuranceCoverage(100, 1.1, 0)).toThrow('Invalid input parameters');
      expect(() => calculateInsuranceCoverage(100, 0.8, -100)).toThrow('Invalid input parameters');
    });
  });

  describe('calculateCopay', () => {
    it('should calculate copay correctly', () => {
      expect(calculateCopay(100, 20)).toBe(20);
      expect(calculateCopay(100, 0)).toBe(0);
    });

    it('should not exceed total amount', () => {
      expect(calculateCopay(15, 20)).toBe(15);
      expect(calculateCopay(20, 20)).toBe(20);
    });

    it('should handle decimal amounts', () => {
      expect(calculateCopay(100.50, 25.75)).toBe(25.75);
      expect(calculateCopay(10.25, 20.50)).toBe(10.25);
    });

    it('should throw error for negative amounts', () => {
      expect(() => calculateCopay(-100, 20)).toThrow('Amounts cannot be negative');
      expect(() => calculateCopay(100, -20)).toThrow('Amounts cannot be negative');
    });
  });

  describe('validatePaymentAmount - INPUT VALIDATION', () => {
    it('should validate correct amounts', () => {
      expect(validatePaymentAmount(100)).toBe(true);
      expect(validatePaymentAmount(0)).toBe(true);
      expect(validatePaymentAmount(99.99)).toBe(true);
      expect(validatePaymentAmount(0.01)).toBe(true);
      expect(validatePaymentAmount(999999999.99)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validatePaymentAmount(-1)).toBe(false);
      expect(validatePaymentAmount(NaN)).toBe(false);
      expect(validatePaymentAmount(Infinity)).toBe(false);
      expect(validatePaymentAmount(1000000000)).toBe(false);
    });

    it('should reject amounts with too many decimal places', () => {
      expect(validatePaymentAmount(10.999)).toBe(false);
      expect(validatePaymentAmount(10.9999)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validatePaymentAmount(0.00)).toBe(true);
      expect(validatePaymentAmount(999999999.00)).toBe(true);
    });
  });

  describe('roundCurrency - PREVENT FLOATING POINT ERRORS', () => {
    it('should round to 2 decimal places', () => {
      expect(roundCurrency(10.005)).toBe(10.01);
      expect(roundCurrency(10.004)).toBe(10);
      expect(roundCurrency(10.125)).toBe(10.13);
      expect(roundCurrency(10.124)).toBe(10.12);
    });

    it('should handle banker\'s rounding (round half to even)', () => {
      expect(roundCurrency(10.005)).toBe(10.01);
      expect(roundCurrency(10.015)).toBe(10.02);
      expect(roundCurrency(10.025)).toBe(10.03);
    });

    it('should handle edge cases', () => {
      expect(roundCurrency(0)).toBe(0);
      expect(roundCurrency(0.001)).toBe(0);
      expect(roundCurrency(0.009)).toBe(0.01);
    });

    it('should handle negative numbers', () => {
      expect(roundCurrency(-10.005)).toBe(-10.01);
      expect(roundCurrency(-10.004)).toBe(-10);
    });

    it('should throw error for invalid input', () => {
      expect(() => roundCurrency(NaN)).toThrow('Invalid amount');
    });
  });

  describe('Financial Calculation Edge Cases - PREVENT MONEY LOSS', () => {
    it('should handle JavaScript floating point precision issues', () => {
      // Classic JS floating point issue: 0.1 + 0.2 = 0.30000000000000004
      const amount1 = calculatePaymentAmount(0.1, 0);
      const amount2 = calculatePaymentAmount(0.2, 0);
      expect(roundCurrency(amount1 + amount2)).toBe(0.30);
    });

    it('should handle very small amounts correctly', () => {
      expect(calculatePaymentAmount(0.01, 0.10)).toBe(0.01);
      expect(applyDiscounts(0.01, 0.50)).toBe(0.01);
      expect(calculateTax(0.01, 0.10)).toBe(0);
    });

    it('should handle very large amounts without overflow', () => {
      const largeAmount = 999999999.99;
      expect(validatePaymentAmount(largeAmount)).toBe(true);
      expect(calculatePaymentAmount(largeAmount, 0)).toBe(largeAmount);
    });

    it('should maintain precision through multiple operations', () => {
      let amount = 100.00;
      amount = calculatePaymentAmount(amount, 0.0825); // Add tax
      amount = applyDiscounts(amount, 0.10); // Apply 10% discount
      amount = roundCurrency(amount); // Final rounding
      expect(amount).toBe(97.43); // (100 * 1.0825) * 0.9 = 97.425 → 97.43
    });
  });
});