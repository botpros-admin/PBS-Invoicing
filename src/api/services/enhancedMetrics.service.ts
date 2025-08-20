import { supabase } from '../supabase';
import { DateRange } from '../../types';

// Helper function to get date range
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

export interface EnhancedMetrics {
  collectionRate: number;
  avgInvoiceValue: number;
  daysOutstanding: number;
  disputeRate: number;
  monthlyGrowth: number;
  clientCount: number;
  newClients: number;
  avgPaymentTime: number;
}

export async function fetchEnhancedMetrics(dateRange: DateRange = '30days'): Promise<EnhancedMetrics> {
  try {
    const { startDate, endDate } = getDateRangeValues(dateRange);
    
    // Fetch invoices for the period
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    // Calculate Collection Rate
    const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
    const totalPaid = invoices?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    // Calculate Average Invoice Value
    const avgInvoiceValue = invoices?.length ? totalInvoiced / invoices.length : 0;

    // Calculate Days Sales Outstanding (simplified)
    const unpaidAmount = totalInvoiced - totalPaid;
    const dailyRevenue = totalInvoiced / 30; // Assuming 30 day period
    const daysOutstanding = dailyRevenue > 0 ? unpaidAmount / dailyRevenue : 0;

    // Calculate Dispute Rate
    const disputedCount = invoices?.filter(inv => inv.status === 'disputed').length || 0;
    const disputeRate = invoices?.length ? (disputedCount / invoices.length) * 100 : 0;

    // Calculate Monthly Growth (compare to previous period)
    const previousStart = new Date(startDate);
    previousStart.setMonth(previousStart.getMonth() - 1);
    const previousEnd = new Date(endDate);
    previousEnd.setMonth(previousEnd.getMonth() - 1);

    const { data: previousInvoices } = await supabase
      .from('invoices')
      .select('total_amount')
      .gte('created_at', previousStart.toISOString().split('T')[0])
      .lte('created_at', previousEnd.toISOString().split('T')[0]);

    const previousTotal = previousInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
    const monthlyGrowth = previousTotal > 0 ? ((totalInvoiced - previousTotal) / previousTotal) * 100 : 0;

    // Get unique client count
    const uniqueClients = new Set(invoices?.map(inv => inv.client_id).filter(id => id));
    const clientCount = uniqueClients.size;

    // Get new clients (first invoice in this period)
    const { data: allTimeClients } = await supabase
      .from('invoices')
      .select('client_id, created_at')
      .lt('created_at', startDate)
      .order('created_at', { ascending: true });

    const existingClients = new Set(allTimeClients?.map(inv => inv.client_id).filter(id => id));
    const newClientsSet = new Set([...uniqueClients].filter(id => !existingClients.has(id)));
    const newClients = newClientsSet.size;

    // Calculate average payment time (days between invoice and payment)
    const paidInvoices = invoices?.filter(inv => inv.status === 'paid' && inv.paid_date);
    let avgPaymentTime = 0;
    if (paidInvoices?.length) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        const created = new Date(inv.created_at);
        const paid = new Date(inv.paid_date);
        const days = Math.floor((paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgPaymentTime = totalDays / paidInvoices.length;
    }

    return {
      collectionRate,
      avgInvoiceValue,
      daysOutstanding,
      disputeRate,
      monthlyGrowth,
      clientCount,
      newClients,
      avgPaymentTime
    };
    
  } catch (error) {
    throw error;
  }
}

export interface RecentInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  status: string;
  created_at: string;
  due_date: string;
}

export async function fetchRecentInvoices(limit: number = 10): Promise<RecentInvoice[]> {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        status,
        created_at,
        due_date,
        client_id,
        clients!inner(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return invoices?.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      client_name: inv.clients?.name || 'Unknown',
      amount: inv.total_amount || 0,
      status: inv.status,
      created_at: inv.created_at,
      due_date: inv.due_date
    })) || [];
    
  } catch (error) {
    throw error;
  }
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  invoiceCount: number;
}

export async function fetchRevenueTrend(dateRange: DateRange = '30days'): Promise<RevenueTrend[]> {
  try {
    const { startDate, endDate } = getDateRangeValues(dateRange);
    
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('created_at, total_amount')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const trendMap = new Map<string, { revenue: number; count: number }>();
    
    invoices?.forEach(inv => {
      const date = inv.created_at.split('T')[0];
      const existing = trendMap.get(date) || { revenue: 0, count: 0 };
      trendMap.set(date, {
        revenue: existing.revenue + (inv.total_amount || 0),
        count: existing.count + 1
      });
    });

    // Convert to array and fill missing dates
    const trends: RevenueTrend[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const data = trendMap.get(dateStr) || { revenue: 0, count: 0 };
      trends.push({
        date: dateStr,
        revenue: data.revenue,
        invoiceCount: data.count
      });
      current.setDate(current.getDate() + 1);
    }

    return trends;
    
  } catch (error) {
    throw error;
  }
}