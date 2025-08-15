import { supabase } from '../supabase';
import { DateRange } from '../../types';

export interface VolumeMetrics {
  dailyVolume: number;
  dailyRevenue: number;
  processingRate: number;
  activeLabsCount: number;
  pendingERA: number;
  avgProcessingTime: number;
  successRate: number;
  pgxSamples: number;
  pgxRevenue: number;
  pgxProfit: number;
}

export interface LabMetric {
  labId: string;
  labName: string;
  samplesProcessed: number;
  revenue: number;
  status: 'active' | 'delayed' | 'offline';
  lastActivity: string;
}

// Helper to get date range values
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
      // Default to today only for volume metrics
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      startDate = todayStart.toISOString();
    }
  }

  return { startDate, endDate };
}

export const fetchVolumeMetrics = async (dateRange: DateRange = '30days'): Promise<VolumeMetrics> => {
  try {
    const { startDate, endDate } = getDateRangeValues(dateRange);
    
    // For "daily" metrics, we still focus on today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Fetch today's invoices for daily metrics
    const { data: todayInvoices, error: todayError } = await supabase
      .from('invoices')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    if (todayError) throw todayError;
    
    // Fetch period invoices for aggregated metrics
    const { data: periodInvoices, error: periodError } = await supabase
      .from('invoices')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (periodError) throw periodError;

    // Calculate daily metrics (from today)
    const dailyVolume = todayInvoices?.length || 0;
    const dailyRevenue = todayInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    
    // Calculate PGX specific metrics (identified by service description or CPT code)
    const pgxInvoices = todayInvoices?.filter(inv => 
      inv.description?.toLowerCase().includes('pgx') || 
      inv.cpt_code?.startsWith('81')
    ) || [];
    
    const pgxSamples = pgxInvoices.length;
    const pgxRevenue = pgxSamples * 50; // $50 per sample
    const pgxProfit = pgxRevenue - (pgxSamples * 4); // $4 cost per sample

    // Fetch ERA pending count for the period
    const { count: pendingERACount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');

    // Get today's active labs from invoices
    const { data: todayClients } = await supabase
      .from('invoices')
      .select('client_id')
      .gte('created_at', today.toISOString());
    
    const uniqueLabIds = new Set(todayClients?.map(l => l.client_id).filter(id => id));
    const activeLabsCount = uniqueLabIds.size;

    // Calculate processing metrics
    const processingRate = dailyVolume > 0 ? (dailyVolume / 24) : 0; // Per hour
    // Use period data for success rate
    const successRate = periodInvoices?.length > 0 
      ? ((periodInvoices?.filter(inv => inv.status === 'paid').length || 0) / periodInvoices.length) * 100 
      : 0;

    // Average processing time (mock for now)
    const avgProcessingTime = 4.5; // minutes

    return {
      dailyVolume,
      dailyRevenue,
      processingRate,
      activeLabsCount,
      pendingERA: pendingERACount || 0,
      avgProcessingTime,
      successRate,
      pgxSamples,
      pgxRevenue,
      pgxProfit
    };
    
  } catch (error) {
    console.error('Error fetching volume metrics:', error);
    throw error;
  }
};

export const fetchLabMetrics = async (dateRange: DateRange = '30days'): Promise<LabMetric[]> => {
  try {
    const { startDate, endDate } = getDateRangeValues(dateRange);
    
    // For lab metrics, use today for "active" status but period for aggregates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: periodInvoices } = await supabase
      .from('invoices')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');

    // Fetch active labs from clients table
    const { data: clientsData } = await supabase
      .from('clients')
      .select('name, id');
    
    const { data: periodClients } = await supabase
      .from('invoices')
      .select('client_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');
    
    const uniqueLabIds = new Set(periodClients?.map(l => l.client_id).filter(id => id));

    // Prepare lab-specific metrics
    const labMetricsData: LabMetric[] = [];
    if (clientsData && periodInvoices) {
      const clientMap = new Map(clientsData.map(c => [c.id, c.name]));
      
      uniqueLabIds.forEach(labId => {
        if (labId) {
          const labName = clientMap.get(labId) || 'Unknown Lab';
          const labInvoices = periodInvoices.filter(inv => inv.client_id === labId) || [];
          // Check if lab had activity today for status
          const todayActivity = labInvoices.some(inv => 
            new Date(inv.created_at) >= today
          );
          labMetricsData.push({
            labId: labId,
            labName: labName,
            samplesProcessed: labInvoices.length,
            revenue: labInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
            status: todayActivity ? 'active' : labInvoices.length > 0 ? 'delayed' : 'offline',
            lastActivity: labInvoices[0]?.created_at || new Date().toISOString()
          });
        }
      });
    }

    return labMetricsData.sort((a, b) => b.samplesProcessed - a.samplesProcessed);
    
  } catch (error) {
    console.error('Error fetching lab metrics:', error);
    throw error;
  }
};