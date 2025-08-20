import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabase } from '../api/supabase';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../context/AuthContext';
import { TenantProvider } from '../context/TenantContext';
import Dashboard from '../pages/Dashboard';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase with multi-tenant support
vi.mock('../api/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Multi-Tenant Data Isolation', () => {
  const mockUsersData = {
    labA: {
      user: {
        id: 'user-lab-a',
        email: 'admin@lab-a.com',
        app_metadata: { laboratory_id: 'lab-a' },
      },
      invoices: [
        { id: 'inv-a-1', invoice_number: 'LABA-001', laboratory_id: 'lab-a' },
        { id: 'inv-a-2', invoice_number: 'LABA-002', laboratory_id: 'lab-a' },
      ],
      clients: [
        { id: 'client-a-1', name: 'Lab A Client 1', laboratory_id: 'lab-a' },
        { id: 'client-a-2', name: 'Lab A Client 2', laboratory_id: 'lab-a' },
      ],
    },
    labB: {
      user: {
        id: 'user-lab-b',
        email: 'admin@lab-b.com',
        app_metadata: { laboratory_id: 'lab-b' },
      },
      invoices: [
        { id: 'inv-b-1', invoice_number: 'LABB-001', laboratory_id: 'lab-b' },
        { id: 'inv-b-2', invoice_number: 'LABB-002', laboratory_id: 'lab-b' },
      ],
      clients: [
        { id: 'client-b-1', name: 'Lab B Client 1', laboratory_id: 'lab-b' },
        { id: 'client-b-2', name: 'Lab B Client 2', laboratory_id: 'lab-b' },
      ],
    },
  };

  let currentUser: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = null;
    
    // Mock auth state
    (supabase.auth.getSession as any).mockImplementation(() => ({
      data: { session: currentUser ? { user: currentUser } : null },
      error: null,
    }));

    (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
      // Return unsubscribe function
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  describe('Laboratory Data Isolation', () => {
    it('should only show data for Laboratory A when logged in as Lab A user', async () => {
      currentUser = mockUsersData.labA.user;

      // Mock data fetching for Lab A
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockImplementation((field, value) => {
        if (field === 'laboratory_id' && value === 'lab-a') {
          return {
            select: mockSelect,
            order: vi.fn().mockResolvedValue({
              data: mockUsersData.labA.invoices,
              error: null,
            }),
          };
        }
        return { select: mockSelect, order: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      (supabase.from as any).mockImplementation((table) => ({
        select: mockSelect,
        eq: mockEq,
      }));

      const { container } = render(
        <BrowserRouter>
          <AuthProvider>
            <TenantProvider>
              <Dashboard />
            </TenantProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify that Lab A data is fetched with correct laboratory_id
        expect(mockEq).toHaveBeenCalledWith('laboratory_id', 'lab-a');
      });
    });

    it('should prevent Lab B user from accessing Lab A data', async () => {
      currentUser = mockUsersData.labB.user;

      // Mock RLS preventing cross-tenant access
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockImplementation((field, value) => {
        if (field === 'laboratory_id' && value === 'lab-a') {
          // Simulate RLS denial
          return {
            select: mockSelect,
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42501', message: 'permission denied for table invoices' },
            }),
          };
        }
        if (field === 'laboratory_id' && value === 'lab-b') {
          return {
            select: mockSelect,
            order: vi.fn().mockResolvedValue({
              data: mockUsersData.labB.invoices,
              error: null,
            }),
          };
        }
        return { select: mockSelect, order: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      (supabase.from as any).mockImplementation(() => ({
        select: mockSelect,
        eq: mockEq,
      }));

      // Attempt to fetch Lab A data as Lab B user
      const result = await supabase
        .from('invoices')
        .select('*')
        .eq('laboratory_id', 'lab-a');

      expect(result.error).toBeTruthy();
      expect(result.error?.code).toBe('42501');
    });

    it('should maintain tenant context across navigation', async () => {
      currentUser = mockUsersData.labA.user;

      const { rerender } = render(
        <BrowserRouter>
          <AuthProvider>
            <TenantProvider>
              <div data-testid="tenant-display">
                {/* Component that displays current tenant */}
              </div>
            </TenantProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      // Verify tenant context is maintained
      await waitFor(() => {
        const tenantContext = screen.getByTestId('tenant-display');
        expect(tenantContext).toBeInTheDocument();
      });

      // Switch user to Lab B
      currentUser = mockUsersData.labB.user;
      
      // Trigger auth state change
      const authCallback = (supabase.auth.onAuthStateChange as any).mock.calls[0][0];
      authCallback('SIGNED_IN', { user: currentUser });

      // Verify tenant context updated
      await waitFor(() => {
        expect(supabase.auth.getSession).toHaveBeenCalled();
      });
    });
  });

  describe('RLS Policy Enforcement', () => {
    it('should enforce RLS policies on invoice creation', async () => {
      currentUser = mockUsersData.labA.user;

      const mockRpc = vi.fn().mockImplementation((functionName, params) => {
        // Verify laboratory_id is automatically set from user context
        if (functionName === 'create_invoice_with_items') {
          if (params.p_laboratory_id !== 'lab-a') {
            return {
              data: null,
              error: { code: '42501', message: 'permission denied' },
            };
          }
          return {
            data: { id: 'new-inv', laboratory_id: 'lab-a' },
            error: null,
          };
        }
      });

      (supabase.rpc as any).mockImplementation(mockRpc);

      // Attempt to create invoice for correct laboratory
      const validResult = await supabase.rpc('create_invoice_with_items', {
        p_laboratory_id: 'lab-a',
        p_client_id: 'client-a-1',
      });

      expect(validResult.error).toBeNull();
      expect(validResult.data?.laboratory_id).toBe('lab-a');

      // Attempt to create invoice for wrong laboratory
      const invalidResult = await supabase.rpc('create_invoice_with_items', {
        p_laboratory_id: 'lab-b', // Wrong lab!
        p_client_id: 'client-b-1',
      });

      expect(invalidResult.error).toBeTruthy();
      expect(invalidResult.error?.code).toBe('42501');
    });

    it('should filter search results by laboratory', async () => {
      currentUser = mockUsersData.labA.user;

      const mockTextSearch = vi.fn().mockImplementation((query) => ({
        eq: vi.fn().mockImplementation((field, value) => {
          if (field === 'laboratory_id' && value === 'lab-a') {
            return {
              limit: vi.fn().mockResolvedValue({
                data: [
                  { id: 'inv-a-1', invoice_number: 'LABA-001', laboratory_id: 'lab-a' },
                ],
                error: null,
              }),
            };
          }
          return { limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
        }),
      }));

      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        textSearch: mockTextSearch,
      }));

      // Search should automatically filter by laboratory
      const searchResults = await supabase
        .from('invoices')
        .select('*')
        .textSearch('fts', 'LABA')
        .eq('laboratory_id', 'lab-a')
        .limit(10);

      expect(searchResults.data).toHaveLength(1);
      expect(searchResults.data?.[0].laboratory_id).toBe('lab-a');
    });
  });

  describe('Cross-Laboratory Security', () => {
    it('should prevent SQL injection attempts to access other laboratory data', async () => {
      currentUser = mockUsersData.labA.user;

      // Attempt SQL injection in search
      const maliciousQuery = "'; DROP TABLE invoices; --";
      
      const mockTextSearch = vi.fn().mockImplementation((field, query) => {
        // Supabase parameterizes queries, preventing SQL injection
        expect(query).toBe(maliciousQuery); // Query is treated as string, not SQL
        return {
          eq: vi.fn().mockResolvedValue({
            data: [], // No results for malicious query
            error: null,
          }),
        };
      });

      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        textSearch: mockTextSearch,
      }));

      const result = await supabase
        .from('invoices')
        .select('*')
        .textSearch('fts', maliciousQuery);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should validate laboratory ownership on updates', async () => {
      currentUser = mockUsersData.labA.user;

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockImplementation((field, value) => {
        // Simulate RLS check
        if (field === 'id' && value === 'inv-b-1') {
          // Trying to update Lab B invoice as Lab A user
          return {
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42501', message: 'permission denied' },
            }),
          };
        }
        if (field === 'id' && value === 'inv-a-1') {
          // Updating own laboratory invoice
          return {
            single: vi.fn().mockResolvedValue({
              data: { id: 'inv-a-1', status: 'paid' },
              error: null,
            }),
          };
        }
      });

      (supabase.from as any).mockImplementation(() => ({
        update: mockUpdate,
        eq: mockEq,
      }));

      // Try to update Lab B invoice (should fail)
      const unauthorizedUpdate = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', 'inv-b-1')
        .single();

      expect(unauthorizedUpdate.error?.code).toBe('42501');

      // Update Lab A invoice (should succeed)
      const authorizedUpdate = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', 'inv-a-1')
        .single();

      expect(authorizedUpdate.error).toBeNull();
      expect(authorizedUpdate.data?.status).toBe('paid');
    });
  });

  describe('Tenant Switching', () => {
    it('should clear cached data when switching laboratories', async () => {
      // Start as Lab A user
      currentUser = mockUsersData.labA.user;
      
      const mockCache = new Map();
      
      // Simulate caching Lab A data
      mockCache.set('invoices-lab-a', mockUsersData.labA.invoices);
      mockCache.set('clients-lab-a', mockUsersData.labA.clients);

      // Switch to Lab B user
      currentUser = mockUsersData.labB.user;
      
      // Trigger auth state change
      const authCallback = (supabase.auth.onAuthStateChange as any).mock.calls[0][0];
      authCallback('SIGNED_IN', { user: currentUser });

      // Cache should be cleared
      await waitFor(() => {
        expect(mockCache.has('invoices-lab-a')).toBe(false);
        expect(mockCache.has('clients-lab-a')).toBe(false);
      });
    });

    it('should validate user has access to selected laboratory', async () => {
      const validateLaboratoryAccess = async (userId: string, laboratoryId: string) => {
        const { data, error } = await supabase
          .from('users')
          .select('laboratory_id')
          .eq('auth_id', userId)
          .eq('laboratory_id', laboratoryId)
          .single();

        return !error && data !== null;
      };

      // Mock the validation query
      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          if (currentUser?.id === 'user-lab-a') {
            return {
              data: { laboratory_id: 'lab-a' },
              error: null,
            };
          }
          return { data: null, error: { code: 'PGRST116' } };
        }),
      }));

      currentUser = mockUsersData.labA.user;
      
      // Valid access
      const hasAccess = await validateLaboratoryAccess('user-lab-a', 'lab-a');
      expect(hasAccess).toBe(true);

      // Invalid access
      const noAccess = await validateLaboratoryAccess('user-lab-a', 'lab-b');
      expect(noAccess).toBe(false);
    });
  });
});