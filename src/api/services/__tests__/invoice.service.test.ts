import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoiceService } from '../invoice.service';
import { supabase } from '../../supabase';

// Mock Supabase
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('InvoiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const mockInvoice = {
        id: 'inv-123',
        invoice_number: 'INV-2024-001',
        client_id: 'client-123',
        laboratory_id: 'lab-123',
        total_amount: 1000,
        status: 'draft',
        created_at: '2024-01-01',
      };

      const mockLineItems = [
        {
          id: 'item-1',
          description: 'Test Service',
          quantity: 1,
          unit_price: 1000,
          total_price: 1000,
        },
      ];

      // Mock the RPC call for invoice creation
      const mockRpc = vi.fn().mockResolvedValue({
        data: mockInvoice,
        error: null,
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      // Mock the from chain for line items
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockLineItems,
        error: null,
      });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
      });

      const invoiceData = {
        client_id: 'client-123',
        laboratory_id: 'lab-123',
        line_items: mockLineItems,
        total_amount: 1000,
        tax_amount: 0,
        discount_amount: 0,
        notes: 'Test invoice',
      };

      const result = await invoiceService.createInvoice(invoiceData);

      expect(result).toBeDefined();
      expect(mockRpc).toHaveBeenCalledWith('create_invoice_with_items', expect.objectContaining({
        p_client_id: 'client-123',
        p_laboratory_id: 'lab-123',
      }));
    });

    it('should handle invoice creation errors', async () => {
      const mockError = { message: 'Database error', code: 'P0001' };
      
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });
      (supabase.rpc as any).mockImplementation(mockRpc);

      const invoiceData = {
        client_id: 'client-123',
        laboratory_id: 'lab-123',
        line_items: [],
        total_amount: 0,
      };

      await expect(invoiceService.createInvoice(invoiceData)).rejects.toThrow();
    });

    it('should validate required fields before creation', async () => {
      const invalidInvoiceData = {
        // Missing required fields
        line_items: [],
        total_amount: 0,
      };

      await expect(invoiceService.createInvoice(invalidInvoiceData as any)).rejects.toThrow();
    });
  });

  describe('getInvoices', () => {
    it('should fetch invoices with filters', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoice_number: 'INV-001',
          client_name: 'Test Client',
          total_amount: 1000,
          status: 'paid',
        },
        {
          id: 'inv-2',
          invoice_number: 'INV-002',
          client_name: 'Test Client 2',
          total_amount: 2000,
          status: 'pending',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockInvoices,
          error: null,
          count: 2,
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const filters = {
        status: 'pending',
        laboratory_id: 'lab-123',
        date_from: '2024-01-01',
        date_to: '2024-12-31',
      };

      const result = await invoiceService.getInvoices(filters);

      expect(result.data).toEqual(mockInvoices);
      expect(result.count).toBe(2);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'pending');
      expect(mockQuery.eq).toHaveBeenCalledWith('laboratory_id', 'lab-123');
    });

    it('should handle pagination correctly', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 100,
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await invoiceService.getInvoices({ page: 2, pageSize: 20 });

      expect(mockQuery.range).toHaveBeenCalledWith(20, 39); // Page 2 with 20 items
    });
  });

  describe('updateInvoice', () => {
    it('should update invoice status', async () => {
      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'inv-123', status: 'paid' },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockUpdate);

      const result = await invoiceService.updateInvoiceStatus('inv-123', 'paid');

      expect(result.status).toBe('paid');
      expect(mockUpdate.update).toHaveBeenCalledWith({ status: 'paid' });
      expect(mockUpdate.eq).toHaveBeenCalledWith('id', 'inv-123');
    });

    it('should handle optimistic locking for concurrent updates', async () => {
      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23P01', message: 'Could not serialize access' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockUpdate);

      await expect(
        invoiceService.updateInvoiceStatus('inv-123', 'paid')
      ).rejects.toThrow('Could not serialize access');
    });
  });

  describe('deleteInvoice', () => {
    it('should only allow deletion of draft invoices', async () => {
      // First, fetch the invoice to check status
      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'inv-123', status: 'paid' },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSelect);

      await expect(invoiceService.deleteInvoice('inv-123')).rejects.toThrow(
        'Cannot delete non-draft invoice'
      );
    });

    it('should successfully delete draft invoice', async () => {
      // Mock fetching draft invoice
      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'inv-123', status: 'draft' },
          error: null,
        }),
      };

      // Mock deletion
      const mockDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockDelete);

      const result = await invoiceService.deleteInvoice('inv-123');

      expect(result).toBe(true);
      expect(mockDelete.delete).toHaveBeenCalled();
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('should calculate totals correctly with tax and discount', () => {
      const lineItems = [
        { quantity: 2, unit_price: 100, total_price: 200 },
        { quantity: 1, unit_price: 50, total_price: 50 },
      ];

      const totals = invoiceService.calculateTotals(lineItems, {
        taxRate: 0.1, // 10%
        discountAmount: 25,
      });

      expect(totals.subtotal).toBe(250);
      expect(totals.taxAmount).toBe(22.5); // (250 - 25) * 0.1
      expect(totals.discountAmount).toBe(25);
      expect(totals.totalAmount).toBe(247.5); // 250 - 25 + 22.5
    });

    it('should handle percentage-based discounts', () => {
      const lineItems = [
        { quantity: 1, unit_price: 100, total_price: 100 },
      ];

      const totals = invoiceService.calculateTotals(lineItems, {
        discountPercentage: 0.2, // 20%
      });

      expect(totals.subtotal).toBe(100);
      expect(totals.discountAmount).toBe(20);
      expect(totals.totalAmount).toBe(80);
    });
  });

  describe('validateInvoiceData', () => {
    it('should validate required fields', () => {
      const invalidData = {
        client_id: '',
        line_items: [],
      };

      const validation = invoiceService.validateInvoiceData(invalidData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Client ID is required');
      expect(validation.errors).toContain('At least one line item is required');
    });

    it('should validate line item data', () => {
      const invalidData = {
        client_id: 'client-123',
        line_items: [
          {
            description: '',
            quantity: -1,
            unit_price: 0,
          },
        ],
      };

      const validation = invoiceService.validateInvoiceData(invalidData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Line item description is required');
      expect(validation.errors).toContain('Quantity must be positive');
      expect(validation.errors).toContain('Unit price must be positive');
    });

    it('should pass validation for valid data', () => {
      const validData = {
        client_id: 'client-123',
        laboratory_id: 'lab-123',
        line_items: [
          {
            description: 'Test Service',
            quantity: 1,
            unit_price: 100,
          },
        ],
      };

      const validation = invoiceService.validateInvoiceData(validData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});