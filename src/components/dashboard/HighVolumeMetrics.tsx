import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Users, 
  AlertCircle,
  Zap,
  Package,
  Clock,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../api/supabase';

interface VolumeMetrics {
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

interface LabMetric {
  labId: string;
  labName: string;
  samplesProcessed: number;
  revenue: number;
  status: 'active' | 'delayed' | 'offline';
  lastActivity: string;
}

export const HighVolumeMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<VolumeMetrics>({
    dailyVolume: 0,
    dailyRevenue: 0,
    processingRate: 0,
    activeLabsCount: 0,
    pendingERA: 0,
    avgProcessingTime: 0,
    successRate: 0,
    pgxSamples: 0,
    pgxRevenue: 0,
    pgxProfit: 0
  });

  const [labMetrics, setLabMetrics] = useState<LabMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeUpdates, setRealtimeUpdates] = useState<string[]>([]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    
    // Subscribe to realtime updates
    const subscription = supabase
      .channel('invoice-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'invoices' }, 
        (payload) => {
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Fetch today's invoices
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayInvoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (invoiceError) throw invoiceError;

      // Calculate daily metrics
      const dailyVolume = todayInvoices?.length || 0;
      const dailyRevenue = todayInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
      
      // Calculate PGX specific metrics (identified by service description or CPT code)
      const pgxInvoices = todayInvoices?.filter(inv => 
        inv.description?.toLowerCase().includes('pgx') || 
        inv.cpt_code?.startsWith('81')
      ) || [];
      
      const pgxSamples = pgxInvoices.length;
      const pgxRevenue = pgxSamples * 50; // $50 per sample as per transcript
      const pgxProfit = pgxRevenue - (pgxSamples * 4); // $4 cost per sample

      // Fetch ERA pending count (using 'sent' status as proxy for pending ERA)
      const { count: pendingERACount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent');

      // Fetch active labs from clients table
      const { data: clientsData } = await supabase
        .from('clients')
        .select('name, id');
      
      // Get today's active labs from invoices
      const { data: todayClients } = await supabase
        .from('invoices')
        .select('client_id')
        .gte('created_at', today.toISOString());
      
      const uniqueLabIds = new Set(todayClients?.map(l => l.client_id).filter(id => id));
      const activeLabsCount = uniqueLabIds.size;

      // Calculate processing metrics
      const processingRate = dailyVolume > 0 ? (dailyVolume / 24) : 0; // Per hour
      const successRate = dailyVolume > 0 
        ? ((todayInvoices?.filter(inv => inv.status === 'paid').length || 0) / dailyVolume) * 100 
        : 0;

      // Calculate average processing time (mock for now)
      const avgProcessingTime = 4.5; // minutes

      // Prepare lab-specific metrics
      const labMetricsData: LabMetric[] = [];
      if (clientsData && todayInvoices) {
        // Create a map of client_id to client name
        const clientMap = new Map(clientsData.map(c => [c.id, c.name]));
        
        uniqueLabIds.forEach(labId => {
          if (labId) {
            const labName = clientMap.get(labId) || 'Unknown Lab';
            const labInvoices = todayInvoices.filter(inv => inv.client_id === labId) || [];
            labMetricsData.push({
              labId: labId,
              labName: labName,
              samplesProcessed: labInvoices.length,
              revenue: labInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
              status: labInvoices.length > 0 ? 'active' : 'offline',
              lastActivity: labInvoices[0]?.created_at || new Date().toISOString()
            });
          }
        });
      }

      setMetrics({
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
      });

      setLabMetrics(labMetricsData.sort((a, b) => b.samplesProcessed - a.samplesProcessed));
      
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRealtimeUpdate = (payload: any) => {
    const message = `New ${payload.eventType}: Invoice ${payload.new?.invoice_number || payload.old?.invoice_number}`;
    setRealtimeUpdates(prev => [message, ...prev.slice(0, 4)]);
    
    // Refresh metrics on any change
    fetchMetrics();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Primary Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[120px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 h-[120px] animate-pulse">
              <div className="flex items-center justify-between">
                <div className="w-full">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg w-12 h-12"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* PGX Product Metrics Skeleton */}
        <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg shadow-lg p-6 h-[180px] animate-pulse">
          <div className="h-6 bg-gray-100 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-100 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Lab Performance Table Skeleton */}
        <div className="bg-white rounded-lg shadow h-[400px]">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>
          <div className="p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-4 mb-4">
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* High Volume Alert Banner */}
      {metrics.dailyVolume > 1000 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <p className="text-sm font-medium text-yellow-800">
              High Volume Alert: Processing {formatNumber(metrics.dailyVolume)} samples today
            </p>
          </div>
        </div>
      )}

      {/* Primary Metrics Grid with fixed heights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[120px]">
        {/* Daily Volume */}
        <div className="bg-white rounded-lg shadow p-6 h-[120px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Daily Volume</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(metrics.dailyVolume)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.processingRate.toFixed(1)}/hour
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Daily Revenue */}
        <div className="bg-white rounded-lg shadow p-6 h-[140px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Daily Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.dailyRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Target: $500K
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((metrics.dailyRevenue / 500000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Active Labs */}
        <div className="bg-white rounded-lg shadow p-6 h-[120px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Labs</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.activeLabsCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Target: 11 labs
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Pending ERA */}
        <div className="bg-white rounded-lg shadow p-6 h-[120px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending ERA</p>
              <p className="text-2xl font-bold text-orange-600">
                {metrics.pendingERA}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Requires posting
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* PGX Product Metrics */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white min-h-[180px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            PGX Product Performance
          </h3>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
            High Margin Product
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm opacity-90">Samples Today</p>
            <p className="text-3xl font-bold">{formatNumber(metrics.pgxSamples)}</p>
            <p className="text-xs opacity-75 mt-1">Target: 100-500/day</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Revenue</p>
            <p className="text-3xl font-bold">{formatCurrency(metrics.pgxRevenue)}</p>
            <p className="text-xs opacity-75 mt-1">$50/sample</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Profit</p>
            <p className="text-3xl font-bold">{formatCurrency(metrics.pgxProfit)}</p>
            <p className="text-xs opacity-75 mt-1">92% margin</p>
          </div>
        </div>
      </div>

      {/* Lab Performance Table */}
      <div className="bg-white rounded-lg shadow min-h-[400px]">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lab Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="h-[48px]">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider h-[48px]">
                  Lab Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Samples
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {labMetrics.map((lab) => (
                <tr key={lab.labId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {lab.labName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(lab.samplesProcessed)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(lab.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      lab.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : lab.status === 'delayed'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {lab.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(lab.lastActivity).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Updates Feed */}
      {realtimeUpdates.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Live Updates
          </h4>
          <div className="space-y-1">
            {realtimeUpdates.map((update, index) => (
              <div key={index} className="text-xs text-gray-600 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                {update}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Processing Time</p>
              <p className="text-lg font-bold text-gray-900">
                {metrics.avgProcessingTime.toFixed(1)} min
              </p>
            </div>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Success Rate</p>
              <p className="text-lg font-bold text-gray-900">
                {metrics.successRate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Automation Level</p>
              <p className="text-lg font-bold text-gray-900">67%</p>
            </div>
            <Package className="h-4 w-4 text-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighVolumeMetrics;