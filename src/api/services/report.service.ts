/**
 * Report Service
 * 
 * This service provides data fetching and processing functionality for reports, 
 * including AR aging, status distribution, and client performance.
 */

import { supabase } from '../supabase';
import { executeDbQuery } from '../../utils/dataFetching';
import { AgingBucket, ReportData, InvoiceStatus } from '../../types'; // Import InvoiceStatus if needed for mapping
import { addDays } from 'date-fns'; // Removed unused date-fns imports (differenceInDays)

// Date range types for reports
export type DateRangeOption = '7days' | '30days' | '90days' | 'ytd' | 'custom';

// Date filter object
export interface DateFilter {
  fromDate: string; // ISO date string
  toDate: string;   // ISO date string
}

/**
 * Convert a date range option to actual from/to dates
 * 
 * @param dateRange The selected date range option
 * @param customDateFrom Custom from date (for custom range)
 * @param customDateTo Custom to date (for custom range)
 * @returns DateFilter with fromDate and toDate as ISO strings
 */
export function parseDateRange(
  dateRange: DateRangeOption, 
  customDateFrom?: string, 
  customDateTo?: string
): DateFilter {
  const now = new Date();
  let fromDate = new Date();

  switch (dateRange) {
    case '7days':
      fromDate = addDays(now, -7);
      break;
    case '30days':
      fromDate = addDays(now, -30);
      break;
    case '90days':
      fromDate = addDays(now, -90);
      break;
    case 'ytd':
      fromDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
      break;
    case 'custom':
      if (customDateFrom && customDateTo) {
        return {
          fromDate: new Date(customDateFrom).toISOString(),
          toDate: new Date(customDateTo).toISOString()
        };
      }
      // Fall back to 30 days if custom dates are invalid
      fromDate = addDays(now, -30);
      break;
  }

  return {
    fromDate: fromDate.toISOString(),
    toDate: now.toISOString()
  };
}

/**
 * Get AR aging data grouped into standard buckets
 * 
 * @param dateFilter Date range to filter invoices
 * @returns Promise with an array of aging buckets
 */
export async function getAgingReport(dateFilter: DateFilter): Promise<AgingBucket[]> {
  return executeDbQuery(async () => {
    const { fromDate, toDate } = dateFilter; // Use dateFilter again

    // Use the database function for aging report calculation
    const { data, error } = await supabase
      .rpc('get_aging_report', { // Call the correct function name
        from_date: fromDate,
        to_date: toDate
      });

    if (error) throw error;
    if (!data || data.length === 0) {
      return [];
    }

    // The RPC returns {label, value, count} directly
    // No need for client-side calculation anymore
    return data.map((bucket: { label: string; value: number; count: number }) => ({
      label: bucket.label,
      value: bucket.value,
      count: bucket.count
    }));

    /* // Remove client-side calculation logic
    const today = new Date();
    const typedData = data as { id: number; total: number; amount_paid: number; date_due: string; status: string }[];

    const current = typedData.filter(invoice =>
      new Date(invoice.date_due) >= today
    ).reduce((acc, inv) => ({ value: acc.value + (inv.total - inv.amount_paid), count: acc.count + 1 }), { value: 0, count: 0 });

    const days1to30 = typedData.filter(invoice => {
      const dueDate = new Date(invoice.date_due);
      const diffDays = differenceInDays(today, dueDate);
      return dueDate < today && diffDays <= 30;
    }).reduce((acc, inv) => ({ value: acc.value + (inv.total - inv.amount_paid), count: acc.count + 1 }), { value: 0, count: 0 });

    const days31to60 = typedData.filter(invoice => {
      const dueDate = new Date(invoice.date_due);
      const diffDays = differenceInDays(today, dueDate);
      return diffDays > 30 && diffDays <= 60;
    }).reduce((acc, inv) => ({ value: acc.value + (inv.total - inv.amount_paid), count: acc.count + 1 }), { value: 0, count: 0 });

    const days61to90 = typedData.filter(invoice => {
      const dueDate = new Date(invoice.date_due);
      const diffDays = differenceInDays(today, dueDate);
      return diffDays > 60 && diffDays <= 90;
    }).reduce((acc, inv) => ({ value: acc.value + (inv.total - inv.amount_paid), count: acc.count + 1 }), { value: 0, count: 0 });

    const over90 = typedData.filter(invoice => {
      const dueDate = new Date(invoice.date_due);
      const diffDays = differenceInDays(today, dueDate);
      return diffDays > 90;
    }).reduce((acc, inv) => ({ value: acc.value + (inv.total - inv.amount_paid), count: acc.count + 1 }), { value: 0, count: 0 });


    // Return the properly formatted aging buckets
    return [
      { label: 'Current', value: current.value, count: current.count },
      { label: '1-30 Days', value: days1to30.value, count: days1to30.count },
      { label: '31-60 Days', value: days31to60.value, count: days31to60.count },
      { label: '61-90 Days', value: days61to90.value, count: days61to90.count },
      { label: 'Over 90 Days', value: over90.value, count: over90.count }
    ]; */
  });
}

/**
 * Get invoice status distribution data
 * 
 * @param dateFilter Date range to filter invoices
 * @returns Promise with status distribution data
 */
export async function getStatusDistribution(dateFilter: DateFilter): Promise<{ name: string; value: number; color: string }[]> {
  return executeDbQuery(async () => {
    const { fromDate, toDate } = dateFilter;

    // Use the database function for status distribution calculation
    const { data, error } = await supabase
      .rpc('get_status_distribution', {
        from_date: fromDate,
        to_date: toDate
      });

    if (error) throw error;
    if (!data || data.length === 0) {
      return [];
    }

    // Return the properly formatted status distribution data
    return data.map((status: { name: string; value: number; color: string }) => ({
      name: status.name,
      value: status.value,
      color: status.color
    }));
  });
}

/**
 * Client performance data type
 */
export interface ClientPerformance {
  id: string;
  name: string;
  clinic: string;
  invoiceCount: number;
  totalValue: number;
  disputeRate: number;
  avgDaysToPayment: number;
}

/**
 * Get client performance data
 * 
 * @param dateFilter Date range to filter data
 * @returns Promise with client performance data
 */
export async function getClientPerformance(dateFilter: DateFilter): Promise<ClientPerformance[]> {
  return executeDbQuery(async () => {
    const { fromDate, toDate } = dateFilter;

    // Use the database function for client performance calculation
    const { data, error } = await supabase
      .rpc('get_client_performance', {
        from_date: fromDate,
        to_date: toDate
      });

    if (error) throw error;
    if (!data || data.length === 0) {
      return [];
    }

    // Return the properly formatted client performance data
    return data.map((client: { 
      id: string; 
      name: string; 
      clinic: string;
      invoice_count: number;
      total_value: number;
      dispute_rate: number;
      avg_days_to_payment: number;
    }) => ({
      id: client.id,
      name: client.name,
      clinic: client.clinic,
      invoiceCount: client.invoice_count,
      totalValue: client.total_value,
      disputeRate: client.dispute_rate,
      avgDaysToPayment: client.avg_days_to_payment
    }));
  });
}

/**
 * CPT code data type
 */
export interface CptCodeData {
  code: string;
  description: string;
  count: number;
  value: number;
}

/**
 * Get top CPT codes by usage
 * 
 * @param dateFilter Date range to filter data
 * @param limit Maximum number of CPT codes to return
 * @returns Promise with CPT code data
 */
export async function getTopCptCodes(dateFilter: DateFilter, limit: number = 10): Promise<CptCodeData[]> {
  return executeDbQuery(async () => {
    const { fromDate, toDate } = dateFilter;

    // Use the database function for top CPT codes calculation
    const { data, error } = await supabase
      .rpc('get_top_cpt_codes', {
        from_date: fromDate,
        to_date: toDate,
        limit_count: limit
      });

    if (error) throw error;
    if (!data || data.length === 0) {
      return [];
    }

    // Return the properly formatted CPT code data
    return data.map((cptCode: { code: string; description: string; count: number; value: number }) => ({
      code: cptCode.code,
      description: cptCode.description,
      count: cptCode.count,
      value: cptCode.value
    }));
  });
}

/**
 * Monthly trend data type
 */
export interface MonthlyTrend {
  month: string;
  invoiced: number;
  collected: number;
}

/**
 * Get monthly trends data
 * 
 * @param dateFilter Date range to filter data
 * @returns Promise with monthly trends data
 */
export async function getMonthlyTrends(dateFilter: DateFilter): Promise<MonthlyTrend[]> {
  return executeDbQuery(async () => {
    const { fromDate, toDate } = dateFilter;

    // Use the database function for monthly trends calculation
    const { data, error } = await supabase
      .rpc('get_monthly_trends', {
        from_date: fromDate,
        to_date: toDate
      });

    if (error) throw error;
    if (!data || data.length === 0) {
      return [];
    }

    // Return the properly formatted monthly trends data
    return data.map((trend: { month: string; invoiced: number; collected: number }) => ({
      month: trend.month,
      invoiced: trend.invoiced,
      collected: trend.collected
    }));
  });
}

/**
 * Get comprehensive report data for all sections
 * 
 * @param dateFilter Date range to filter data
 * @returns Promise with complete report data
 */
export async function getCompleteReportData(dateFilter: DateFilter): Promise<ReportData> {
  return executeDbQuery(async () => {
    const { fromDate, toDate } = dateFilter;

    // Use the combined database function that returns all report data at once
    const { data, error } = await supabase
      .rpc('get_complete_report_data', {
        from_date: fromDate,
        to_date: toDate
      });

    if (error) throw error;
    if (!data) {
      return {
        agingBuckets: [],
        statusDistribution: [],
        clientPerformance: []
      };
    }

    // Map status data to the format expected by ReportData
    // Ensure the status name maps correctly to the InvoiceStatus enum/type
    const statusDistribution = (data.statusDistribution || []).map((status: { name: string; value: number }) => ({
      status: status.name.toLowerCase() as InvoiceStatus, // Cast to expected type
      count: status.value, // Assuming value represents count here based on context
      value: status.value  // Assuming value also represents the value for the chart
    }));

    // Map client performance data to the format expected by ReportData
    const mappedClientPerformance = (data.clientPerformance || []).map((client: {
      id: string;
      name: string;
      clinic: string;
      invoice_count: number;
      total_value: number;
      dispute_rate: number;
      avg_days_to_payment: number;
    }) => ({
      clientId: client.id,
      clientName: client.name,
      invoiceCount: client.invoice_count,
      totalValue: client.total_value,
      disputeRate: client.dispute_rate,
      avgDaysToPayment: client.avg_days_to_payment
    }));
    
    return {
      agingBuckets: data.agingBuckets || [],
      statusDistribution,
      clientPerformance: mappedClientPerformance
    };
  });
}
