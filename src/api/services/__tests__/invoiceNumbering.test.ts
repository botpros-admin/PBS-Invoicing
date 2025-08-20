import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../../supabase';
import { 
  createInvoice, 
  getInvoiceCounterStatus, 
  generateInvoiceNumber,
  resetInvoiceCounter 
} from '../invoice.service';

// Mock Supabase
vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Invoice Numbering System', () => {
  const mockLaboratoryId = 'lab-123';
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default auth mock
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { 
        user: { 
          id: mockUserId,
          app_metadata: { laboratory_id: mockLaboratoryId }
        } 
      },
      error: null
    });
  });

  describe('Invoice Number Generation', () => {
    it('should generate sequential invoice numbers for the same laboratory', async () => {
      // Mock RPC for invoice number generation
      const mockRpc = vi.fn()
        .mockResolvedValueOnce({ data: 'INV-2025-000001', error: null })
        .mockResolvedValueOnce({ data: 'INV-2025-000002', error: null })
        .mockResolvedValueOnce({ data: 'INV-2025-000003', error: null });
      
      (supabase.rpc as any).mockImplementation(mockRpc);
      
      // Generate three invoice numbers
      const num1 = await generateInvoiceNumber(mockLaboratoryId);
      const num2 = await generateInvoiceNumber(mockLaboratoryId);
      const num3 = await generateInvoiceNumber(mockLaboratoryId);
      
      expect(num1).toBe('INV-2025-000001');
      expect(num2).toBe('INV-2025-000002');
      expect(num3).toBe('INV-2025-000003');
      
      // Verify RPC was called with correct parameters
      expect(mockRpc).toHaveBeenCalledWith('get_next_invoice_number', {
        p_laboratory_id: mockLaboratoryId,
        p_prefix: null
      });
      expect(mockRpc).toHaveBeenCalledTimes(3);
    });

    it('should use custom prefix when provided', async () => {
      const customPrefix = 'LAB1';
      
      (supabase.rpc as any).mockResolvedValue({
        data: 'LAB1-2025-000001',
        error: null
      });
      
      const invoiceNumber = await generateInvoiceNumber(mockLaboratoryId, customPrefix);
      
      expect(invoiceNumber).toBe('LAB1-2025-000001');
      expect(supabase.rpc).toHaveBeenCalledWith('get_next_invoice_number', {
        p_laboratory_id: mockLaboratoryId,
        p_prefix: customPrefix
      });
    });

    it('should handle year transitions correctly', async () => {
      // Mock for end of year 2024
      const december2024 = new Date('2024-12-31');
      vi.setSystemTime(december2024);
      
      (supabase.rpc as any).mockResolvedValue({
        data: 'INV-2024-000999',
        error: null
      });
      
      const invoice2024 = await generateInvoiceNumber(mockLaboratoryId);
      expect(invoice2024).toBe('INV-2024-000999');
      
      // Mock for beginning of year 2025
      const january2025 = new Date('2025-01-01');
      vi.setSystemTime(january2025);
      
      (supabase.rpc as any).mockResolvedValue({
        data: 'INV-2025-000001',
        error: null
      });
      
      const invoice2025 = await generateInvoiceNumber(mockLaboratoryId);
      expect(invoice2025).toBe('INV-2025-000001');
      
      vi.useRealTimers();
    });
  });

  describe('Invoice Counter Status', () => {
    it('should return current counter status', async () => {
      const mockStatus = {
        prefix: 'INV',
        year: 2025,
        last_value: 42,
        next_value: 43,
        format_pattern: '{prefix}-{year}-{number:06d}',
        sample_number: 'INV-2025-000043'
      };
      
      // Mock user profile and organization lookups
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { organization_id: mockOrganizationId },
              error: null
            })
          };
        }
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { laboratory_id: mockLaboratoryId },
              error: null
            })
          };
        }
      });
      
      (supabase.rpc as any).mockImplementation(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockStatus,
          error: null
        })
      }));
      
      const status = await getInvoiceCounterStatus();
      
      expect(status).toEqual(mockStatus);
      expect(status.nextValue).toBe(43);
      expect(status.sampleNumber).toBe('INV-2025-000043');
    });

    it('should return default values for new laboratory', async () => {
      // Mock user profile and organization lookups
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { organization_id: mockOrganizationId },
              error: null
            })
          };
        }
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { laboratory_id: mockLaboratoryId },
              error: null
            })
          };
        }
      });
      
      // Return null data (no counter exists)
      (supabase.rpc as any).mockImplementation(() => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }));
      
      const status = await getInvoiceCounterStatus();
      
      expect(status.prefix).toBe('INV');
      expect(status.lastValue).toBe(0);
      expect(status.nextValue).toBe(1);
      expect(status.sampleNumber).toMatch(/^INV-\d{4}-000001$/);
    });
  });

  describe('Invoice Creation with Auto-Numbering', () => {
    it('should create invoice without specifying invoice number', async () => {
      // Mock user profile lookup
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { organization_id: mockOrganizationId },
              error: null
            })
          };
        }
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: mockOrganizationId, laboratory_id: mockLaboratoryId },
              error: null
            })
          };
        }
        if (table === 'invoices') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'inv-123',
                invoice_number: 'INV-2025-000001', // Auto-generated by trigger
                organization_id: mockOrganizationId,
                status: 'draft',
                total: 0
              },
              error: null
            }),
            eq: vi.fn().mockReturnThis()
          };
        }
      });
      
      const invoice = await createInvoice({
        clientId: 'client-123',
        notes: 'Test invoice'
      });
      
      // Verify invoice_number was NOT passed in insert
      const insertCall = (supabase.from as any).mock.calls.find(
        (call: any[]) => call[0] === 'invoices'
      );
      expect(insertCall).toBeDefined();
      
      // The insert data should not include invoice_number
      const insertMock = (supabase.from as any).mock.results.find(
        (result: any) => result.value.insert
      );
      expect(insertMock).toBeDefined();
    });
  });

  describe('Concurrent Invoice Generation', () => {
    it('should handle concurrent requests without duplicates', async () => {
      // Simulate multiple concurrent invoice creations
      const invoiceNumbers = new Set<string>();
      
      // Mock sequential invoice numbers even under concurrent load
      let counter = 1;
      (supabase.rpc as any).mockImplementation(() => {
        const num = counter++;
        return Promise.resolve({
          data: `INV-2025-${String(num).padStart(6, '0')}`,
          error: null
        });
      });
      
      // Create 10 concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        generateInvoiceNumber(mockLaboratoryId)
      );
      
      const results = await Promise.all(promises);
      
      // Add all results to Set
      results.forEach(num => invoiceNumbers.add(num));
      
      // Verify no duplicates (Set size should equal array length)
      expect(invoiceNumbers.size).toBe(10);
      expect(results.length).toBe(10);
      
      // Verify sequential ordering
      const sortedResults = [...results].sort();
      for (let i = 0; i < sortedResults.length - 1; i++) {
        const current = parseInt(sortedResults[i].split('-')[2]);
        const next = parseInt(sortedResults[i + 1].split('-')[2]);
        expect(next).toBe(current + 1);
      }
    });
  });

  describe('Invoice Counter Reset', () => {
    it('should allow admin to reset counter', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: null
      });
      
      await resetInvoiceCounter(mockLaboratoryId, 2025, 100);
      
      expect(supabase.rpc).toHaveBeenCalledWith('reset_invoice_counter', {
        p_laboratory_id: mockLaboratoryId,
        p_year: 2025,
        p_new_value: 100
      });
    });

    it('should throw error for non-admin users', async () => {
      const error = {
        code: '42501',
        message: 'Only admin users can reset invoice counters'
      };
      
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error
      });
      
      await expect(resetInvoiceCounter(mockLaboratoryId, 2025, 0))
        .rejects.toThrow();
    });
  });

  describe('Multi-Laboratory Isolation', () => {
    it('should maintain separate sequences for different laboratories', async () => {
      const labA = 'lab-a';
      const labB = 'lab-b';
      
      // Mock different sequences for different labs
      (supabase.rpc as any).mockImplementation((fnName: string, params: any) => {
        if (params.p_laboratory_id === labA) {
          return Promise.resolve({
            data: 'LABA-2025-000001',
            error: null
          });
        } else if (params.p_laboratory_id === labB) {
          return Promise.resolve({
            data: 'LABB-2025-000001',
            error: null
          });
        }
      });
      
      const invoiceA = await generateInvoiceNumber(labA, 'LABA');
      const invoiceB = await generateInvoiceNumber(labB, 'LABB');
      
      expect(invoiceA).toBe('LABA-2025-000001');
      expect(invoiceB).toBe('LABB-2025-000001');
      
      // Both should have their own sequence starting at 1
      expect(invoiceA).not.toBe(invoiceB);
    });
  });
});