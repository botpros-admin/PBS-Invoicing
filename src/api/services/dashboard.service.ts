/**
 * Dashboard Service
 * 
 * Provides data for dashboard widgets, statistics, and charts.
 * Implements proper filtering and access control to ensure HIPAA compliance.
 */

import { supabase, handleSupabaseError } from '../client';
import { DateRange } from '../../types';

/**
 * Convert a date range string to start and end dates
 */
function getDateRangeValues(dateRange: DateRange): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  let startDate: string;

  switch (dateRange) {
    case '7days': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      startDate = sevenDaysAgo.toISOString().split('T')[0];
      break;
    }
    case '30days': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      break;
    }
    case '90days': {
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 90);
      startDate = ninetyDaysAgo.toISOString().split('T')[0];
      break;
    }
    case 'ytd': {
      startDate = `${today.getFullYear()}-01-01`;
      break;
    }
    default: {
      const defaultRange = new Date(today);
      defaultRange.setDate(today.getDate() - 30);
      startDate = defaultRange.toISOString().split('T')[0];
    }
  }

  return { startDate, endDate };
}

/**
 * Get dashboard statistics
 */
export interface DashboardStat {
  id: string;
  title: string;
  value: number;
  change: number;
  dataSource: string;
  aggregation: string;
  calculation: string;
  link: string;
}

export async function getDashboardStats(dateRange: DateRange = '30days'): Promise<DashboardStat[]> {
  try {
    const { startDate, endDate } = getDateRangeValues(dateRange);
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);

    // Fetch current period data
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, total_amount, status, paid_amount, due_date, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (invoicesError) throw invoicesError;

    // Fetch previous period data for comparison
    const { data: previousInvoicesData, error: previousInvoicesError } = await supabase
      .from('invoices')
      .select('id, total_amount, status, paid_amount, due_date, created_at')
      .gte('created_at', previousStartDate.toISOString().split('T')[0])
      .lte('created_at', previousEndDate.toISOString().split('T')[0]);

    if (previousInvoicesError) throw previousInvoicesError;

    // Calculate statistics
    const totalInvoiced = invoicesData.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
    const previousTotalInvoiced = previousInvoicesData.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
    const totalInvoicedChange = previousTotalInvoiced ? ((totalInvoiced - previousTotalInvoiced) / previousTotalInvoiced) * 100 : 0;

    const totalPaid = invoicesData.reduce((sum, invoice) => sum + (invoice.paid_amount || 0), 0);
    const previousTotalPaid = previousInvoicesData.reduce((sum, invoice) => sum + (invoice.paid_amount || 0), 0);
    const totalPaidChange = previousTotalPaid ? ((totalPaid - previousTotalPaid) / previousTotalPaid) * 100 : 0;

    const outstandingBalance = totalInvoiced - totalPaid;
    const previousOutstandingBalance = previousTotalInvoiced - previousTotalPaid;
    const outstandingBalanceChange = previousOutstandingBalance ? ((outstandingBalance - previousOutstandingBalance) / previousOutstandingBalance) * 100 : 0;

    const overdueInvoices = invoicesData.filter(invoice => 
      new Date(invoice.due_date) < new Date() && 
      invoice.status !== 'paid' && 
      invoice.total_amount > invoice.paid_amount
    ).length;
    const previousOverdueInvoices = previousInvoicesData.filter(invoice => 
      new Date(invoice.due_date) < previousEndDate && 
      invoice.status !== 'paid' && 
      invoice.total_amount > invoice.paid_amount
    ).length;
    const overdueInvoicesChange = previousOverdueInvoices ? ((overdueInvoices - previousOverdueInvoices) / previousOverdueInvoices) * 100 : 0;

    return [
      {
        id: 'total-invoiced',
        title: 'Total Invoiced',
        value: totalInvoiced,
        change: totalInvoicedChange,
        dataSource: 'invoices',
        aggregation: 'sum',
        calculation: 'total',
        link: '/invoices'
      },
      {
        id: 'total-paid',
        title: 'Total Paid',
        value: totalPaid,
        change: totalPaidChange,
        dataSource: 'invoices',
        aggregation: 'sum',
        calculation: 'paid',
        link: '/invoices?status=paid'
      },
      {
        id: 'outstanding-balance',
        title: 'Outstanding Balance',
        value: outstandingBalance,
        change: outstandingBalanceChange,
        dataSource: 'invoices',
        aggregation: 'sum',
        calculation: 'balance',
        link: '/invoices?status=outstanding'
      },
      {
        id: 'overdue-invoices',
        title: 'Overdue Invoices',
        value: overdueInvoices,
        change: overdueInvoicesChange,
        dataSource: 'invoices',
        aggregation: 'count',
        calculation: 'overdue',
        link: '/invoices?status=overdue'
      }
    ];
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    handleSupabaseError(error, 'Dashboard Stats');
    throw error;
  }
}

/**
 * Get aging report data
 */
export interface AgingBucket {
  label: string;
  value: number;
}

// Define an explicit type for the data returned by the RPC function
// based on its RETURNS TABLE definition
interface AgingOverviewData {
  id: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
}

export async function getAgingOverview(): Promise<AgingBucket[]> {
  try {
    const today = new Date();
    
    // Get all outstanding invoices by calling the RPC function
    const { data, error } = await supabase.rpc('get_aging_overview_data');
    
    if (error) throw error;
    if (!data) return [];

    // Cast the returned data to our defined type
    const typedData = data as AgingOverviewData[];
    
    // Calculate aging buckets using the typed data
    const current = typedData.filter((invoice: AgingOverviewData) =>
      new Date(invoice.due_date) >= today
    ).reduce((sum: number, invoice: AgingOverviewData) => sum + (invoice.total_amount - invoice.paid_amount), 0);
    
    const days1to30 = typedData.filter((invoice: AgingOverviewData) => {
      const dueDate = new Date(invoice.due_date);
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return dueDate < today && diffDays <= 30;
    }).reduce((sum: number, invoice: AgingOverviewData) => sum + (invoice.total_amount - invoice.paid_amount), 0);
    
    const days31to60 = typedData.filter((invoice: AgingOverviewData) => {
      const dueDate = new Date(invoice.due_date);
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 30 && diffDays <= 60;
    }).reduce((sum: number, invoice: AgingOverviewData) => sum + (invoice.total_amount - invoice.paid_amount), 0);
    
    const days61to90 = typedData.filter((invoice: AgingOverviewData) => {
      const dueDate = new Date(invoice.due_date);
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 60 && diffDays <= 90;
    }).reduce((sum: number, invoice: AgingOverviewData) => sum + (invoice.total_amount - invoice.paid_amount), 0);
    
    const over90 = typedData.filter((invoice: AgingOverviewData) => {
      const dueDate = new Date(invoice.due_date);
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 90;
    }).reduce((sum: number, invoice: AgingOverviewData) => sum + (invoice.total_amount - invoice.paid_amount), 0);
    
    return [
      { label: 'Current', value: current },
      { label: '1-30 Days', value: days1to30 },
      { label: '31-60 Days', value: days31to60 },
      { label: '61-90 Days', value: days61to90 },
      { label: 'Over 90 Days', value: over90 }
    ];
  } catch (error) {
    console.error('Failed to fetch aging overview:', error);
    handleSupabaseError(error, 'Aging Overview');
    throw error;
  }
}

/**
 * Get invoice status distribution
 */
export interface StatusDistribution {
  name: string;
  value: number;
}

export async function getStatusDistribution(dateRange: DateRange = '30days'): Promise<StatusDistribution[]> {
  try {
    const { startDate, endDate } = getDateRangeValues(dateRange);
    
    // Get all invoices in the date range
    const { data, error } = await supabase
      .from('invoices')
      .select('id, status')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (error) throw error;
    if (!data) return [];
    
    // Count invoices by status
    const statusCounts: Record<string, number> = {
      'draft': 0,
      'sent': 0,
      'paid': 0,
      'overdue': 0,
      'disputed': 0
    };
    
    // Count each status
    data.forEach(invoice => {
      const status = invoice.status || 'draft';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    // Convert to percentage with proper capitalization
    const total = data.length;
    const statusDistribution: StatusDistribution[] = Object.entries(statusCounts).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
      value: total > 0 ? Math.round((count / total) * 100) : 0
    }));
    
    return statusDistribution;
  } catch (error) {
    console.error('Failed to fetch status distribution:', error);
    handleSupabaseError(error, 'Status Distribution');
    throw error;
  }
}

/**
 * Get top clients by revenue
 */
export interface TopClient {
  id: string;
  name: string;
  invoiceCount: number;
  totalValue: number;
  disputeRate: number;
}

export async function getTopClientsByRevenue(dateRange: DateRange = '30days', limit: number = 5): Promise<TopClient[]> {
  try {
    const { startDate, endDate } = getDateRangeValues(dateRange);
    
    // Get invoices with client info in the date range
    // Use explicit foreign key hint to avoid PGRST201 error
    const { data, error } = await supabase
      .from('invoices')
      .select('id, total_amount, status, client_id, client:clients!fk_invoices_client(id, name)')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (error) throw error;
    if (!data) return [];
    
    // Group by client and calculate metrics
    const clientMap: Record<string, {
      id: string;
      name: string;
      invoices: { id: string; total: number; status: string }[]; // Typed invoices array
      totalValue: number;
      disputedInvoices: number;
    }> = {};
    
    // Define the expected structure for validation (client is now guaranteed by !inner join)
    interface ValidatedInvoice {
      id: string;
      total_amount: number | null;
      status: string | null;
      client_id: string | number; // Changed from clientId
      client: { id: string; name: string }; 
    }

    // Iterate and validate each item before processing
    data.forEach((invoice: unknown) => { // Use 'unknown' for iteration parameter, validate structure inside
      // Robust runtime check using 'in' operator
      if (
        !invoice || typeof invoice !== 'object' ||
        !('client_id' in invoice) || // Check if 'client_id' property exists
        !('client' in invoice) || invoice.client === null || // Explicitly check for null
        typeof invoice.client !== 'object' || Array.isArray(invoice.client) || // Check client object type
        !('id' in invoice.client) || // Check client.id
        !('name' in invoice.client) // Check client.name
      ) {
        console.warn(`Skipping invoice due to missing or invalid data structure:`, invoice);
        return; // Skip if data structure is not as expected
      }

      // If validation passes, we can assume the structure matches ValidatedInvoice
      // Cast invoice to ValidatedInvoice to access properties safely
      const validatedInvoice = invoice as ValidatedInvoice; 
      const clientData = validatedInvoice.client; // client is now guaranteed non-null
      const clientId = validatedInvoice.client_id.toString(); // Changed from clientId
      if (!clientMap[clientId]) {
        clientMap[clientId] = {
          id: clientId,
          name: clientData.name,
          invoices: [],
          totalValue: 0,
          disputedInvoices: 0
        };
      }
      
      clientMap[clientId].invoices.push({
        id: validatedInvoice.id,
        total: validatedInvoice.total_amount || 0,
        status: validatedInvoice.status || 'draft'
      });
      clientMap[clientId].totalValue += validatedInvoice.total_amount || 0;
      if (validatedInvoice.status === 'disputed') {
        clientMap[clientId].disputedInvoices += 1;
      }
    });
    
    // Convert to array and sort by revenue
    const topClients: TopClient[] = Object.values(clientMap)
      .map(client => ({
        id: client.id,
        name: client.name,
        invoiceCount: client.invoices.length,
        totalValue: client.totalValue,
        disputeRate: client.invoices.length > 0
          ? Math.round((client.disputedInvoices / client.invoices.length) * 100)
          : 0
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
    
    return topClients;
  } catch (error) {
    console.error('Failed to fetch top clients:', error);
    handleSupabaseError(error, 'Top Clients');
    throw error;
  }
}
