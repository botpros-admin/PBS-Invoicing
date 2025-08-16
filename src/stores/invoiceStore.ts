import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '../api/supabase';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name?: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  description?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  _optimistic?: boolean;
}

interface InvoiceFilters {
  status?: string;
  dateRange?: 'week' | 'month' | 'quarter' | 'year' | 'all';
  clientId?: string;
  searchTerm?: string;
}

interface InvoiceState {
  // State
  invoices: Invoice[];
  filters: InvoiceFilters;
  loading: boolean;
  error: string | null;
  selectedInvoice: Invoice | null;
  
  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
  
  // Actions
  fetchInvoices: (organizationId: string) => Promise<void>;
  fetchInvoiceById: (id: string) => Promise<Invoice | null>;
  createInvoice: (data: Partial<Invoice>) => Promise<Invoice | null>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  
  // Filter actions
  setFilter: (filter: Partial<InvoiceFilters>) => void;
  clearFilters: () => void;
  
  // Pagination actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // Optimistic updates
  optimisticUpdate: (id: string, data: Partial<Invoice>) => void;
  revertOptimistic: (id: string) => void;
  
  // Selection
  selectInvoice: (invoice: Invoice | null) => void;
  
  // Utilities
  reset: () => void;
}

const initialFilters: InvoiceFilters = {
  status: 'all',
  dateRange: 'month',
  searchTerm: ''
};

export const useInvoiceStore = create<InvoiceState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        invoices: [],
        filters: initialFilters,
        loading: false,
        error: null,
        selectedInvoice: null,
        page: 1,
        pageSize: 20,
        totalCount: 0,
        hasMore: false,
        
        // Fetch invoices with filters and pagination
        fetchInvoices: async (organizationId: string) => {
          set((state) => {
            state.loading = true;
            state.error = null;
          });
          
          try {
            const { filters, page, pageSize } = get();
            let query = supabase
              .from('invoices')
              .select('*, clients!inner(name)', { count: 'exact' })
              .eq('organization_id', organizationId)
              .order('created_at', { ascending: false });
            
            // Apply filters
            if (filters.status && filters.status !== 'all') {
              query = query.eq('status', filters.status);
            }
            
            if (filters.clientId) {
              query = query.eq('client_id', filters.clientId);
            }
            
            if (filters.searchTerm) {
              query = query.or(`invoice_number.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
            }
            
            // Apply date range filter
            if (filters.dateRange && filters.dateRange !== 'all') {
              const now = new Date();
              let startDate: Date;
              
              switch (filters.dateRange) {
                case 'week':
                  startDate = new Date(now.setDate(now.getDate() - 7));
                  break;
                case 'month':
                  startDate = new Date(now.setMonth(now.getMonth() - 1));
                  break;
                case 'quarter':
                  startDate = new Date(now.setMonth(now.getMonth() - 3));
                  break;
                case 'year':
                  startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                  break;
                default:
                  startDate = new Date(0);
              }
              
              query = query.gte('created_at', startDate.toISOString());
            }
            
            // Apply pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);
            
            const { data, error, count } = await query;
            
            if (error) throw error;
            
            // Map client names
            const invoicesWithClientNames = data?.map(invoice => ({
              ...invoice,
              client_name: invoice.clients?.name
            })) || [];
            
            set((state) => {
              state.invoices = invoicesWithClientNames;
              state.totalCount = count || 0;
              state.hasMore = (count || 0) > page * pageSize;
              state.loading = false;
            });
          } catch (err: any) {
            set((state) => {
              state.error = err.message;
              state.loading = false;
            });
          }
        },
        
        // Fetch single invoice
        fetchInvoiceById: async (id: string) => {
          try {
            const { data, error } = await supabase
              .from('invoices')
              .select('*, clients!inner(name), invoice_items!fk_invoice_items_invoice(*)')
              .eq('id', id)
              .single();
            
            if (error) throw error;
            
            const invoiceWithClientName = {
              ...data,
              client_name: data.clients?.name
            };
            
            set((state) => {
              state.selectedInvoice = invoiceWithClientName;
            });
            
            return invoiceWithClientName;
          } catch (err: any) {
            set((state) => {
              state.error = err.message;
            });
            return null;
          }
        },
        
        // Create invoice
        createInvoice: async (data: Partial<Invoice>) => {
          try {
            const { data: newInvoice, error } = await supabase
              .from('invoices')
              .insert(data)
              .select()
              .single();
            
            if (error) throw error;
            
            set((state) => {
              state.invoices.unshift(newInvoice);
              state.totalCount += 1;
            });
            
            return newInvoice;
          } catch (err: any) {
            set((state) => {
              state.error = err.message;
            });
            return null;
          }
        },
        
        // Update invoice with optimistic update
        updateInvoice: async (id: string, data: Partial<Invoice>) => {
          // Optimistic update
          get().optimisticUpdate(id, data);
          
          try {
            const { error } = await supabase
              .from('invoices')
              .update(data)
              .eq('id', id);
            
            if (error) throw error;
            
            // Remove optimistic flag on success
            set((state) => {
              const invoice = state.invoices.find(inv => inv.id === id);
              if (invoice && invoice._optimistic) {
                delete invoice._optimistic;
              }
            });
          } catch (err: any) {
            // Revert on error
            get().revertOptimistic(id);
            set((state) => {
              state.error = err.message;
            });
          }
        },
        
        // Delete invoice
        deleteInvoice: async (id: string) => {
          try {
            const { error } = await supabase
              .from('invoices')
              .delete()
              .eq('id', id);
            
            if (error) throw error;
            
            set((state) => {
              state.invoices = state.invoices.filter(inv => inv.id !== id);
              state.totalCount -= 1;
              if (state.selectedInvoice?.id === id) {
                state.selectedInvoice = null;
              }
            });
          } catch (err: any) {
            set((state) => {
              state.error = err.message;
            });
          }
        },
        
        // Filter actions
        setFilter: (filter: Partial<InvoiceFilters>) => {
          set((state) => {
            state.filters = { ...state.filters, ...filter };
            state.page = 1; // Reset to first page when filters change
          });
        },
        
        clearFilters: () => {
          set((state) => {
            state.filters = initialFilters;
            state.page = 1;
          });
        },
        
        // Pagination actions
        setPage: (page: number) => {
          set((state) => {
            state.page = page;
          });
        },
        
        setPageSize: (size: number) => {
          set((state) => {
            state.pageSize = size;
            state.page = 1; // Reset to first page when page size changes
          });
        },
        
        // Optimistic updates
        optimisticUpdate: (id: string, data: Partial<Invoice>) => {
          set((state) => {
            const invoice = state.invoices.find(inv => inv.id === id);
            if (invoice) {
              Object.assign(invoice, data);
              invoice._optimistic = true;
            }
          });
        },
        
        revertOptimistic: (id: string) => {
          // In a real app, you'd store the previous state
          // For now, we'll just refetch
          const { organizationId } = get().invoices[0] || {};
          if (organizationId) {
            get().fetchInvoices(organizationId);
          }
        },
        
        // Selection
        selectInvoice: (invoice: Invoice | null) => {
          set((state) => {
            state.selectedInvoice = invoice;
          });
        },
        
        // Reset store
        reset: () => {
          set((state) => {
            state.invoices = [];
            state.filters = initialFilters;
            state.loading = false;
            state.error = null;
            state.selectedInvoice = null;
            state.page = 1;
            state.pageSize = 20;
            state.totalCount = 0;
            state.hasMore = false;
          });
        }
      })),
      {
        name: 'invoice-storage',
        partialize: (state) => ({ 
          filters: state.filters,
          pageSize: state.pageSize
        })
      }
    )
  )
);