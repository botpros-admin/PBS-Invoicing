import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  FileText,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  ClipboardList,
  MessageSquare,
  CreditCard
} from 'lucide-react';

// Time period type
type TimePeriod = 'today' | '7d' | '30d' | '60d' | '90d';

// Dashboard stats interface
interface DashboardStats {
  period: string;
  revenue: number;
  invoices_created: number;
  pending_payments: number;
  overdue: {
    total: number;
    breakdown: {
      '0-30': number;
      '31-60': number;
      '61-90': number;
      '90+': number;
    };
  };
  collection_rate: number;
  avg_days_to_payment: number;
  disputes: {
    total_open: number;
    breakdown: {
      '1_day': number;
      '1_week': number;
      '30_days': number;
      '60_days': number;
      '90+': number;
    };
  };
  unposted_payments: {
    total: number;
    breakdown: {
      '7_days': number;
      '30_days': number;
      '90+': number;
    };
  };
}

// Time period selector component - Modern Dropdown
const TimePeriodSelector: React.FC<{
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  periods: TimePeriod[];
}> = ({ value, onChange, periods }) => {
  const labels: Record<TimePeriod, string> = {
    today: 'Today',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '60d': 'Last 60 Days',
    '90d': 'Last 90 Days',
  };

  return (
    <div className="mt-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TimePeriod)}
        className="w-auto px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        {periods.map((period) => (
          <option key={period} value={period}>
            {labels[period]}
          </option>
        ))}
      </select>
    </div>
  );
};

// Overdue breakdown selector component - Modern Dropdown
const OverdueBreakdownSelector: React.FC<{
  value: string;
  onChange: (bucket: string) => void;
  breakdown: { '0-30': number; '31-60': number; '61-90': number; '90+': number };
}> = ({ value, onChange, breakdown }) => {
  const buckets = [
    { key: 'total', label: 'Total Overdue' },
    { key: '0-30', label: '0-30 Days' },
    { key: '31-60', label: '31-60 Days' },
    { key: '61-90', label: '61-90 Days' },
    { key: '90+', label: '90+ Days' },
  ];

  return (
    <div className="mt-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-auto px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
      >
        {buckets.map((bucket) => (
          <option key={bucket.key} value={bucket.key}>
            {bucket.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Disputes breakdown selector component - Modern Dropdown
const DisputesBreakdownSelector: React.FC<{
  value: string;
  onChange: (bucket: string) => void;
  breakdown: { '1_day': number; '1_week': number; '30_days': number; '60_days': number; '90+': number };
}> = ({ value, onChange, breakdown }) => {
  const buckets = [
    { key: 'total', label: 'All Open' },
    { key: '1_day', label: '< 1 Day' },
    { key: '1_week', label: '< 1 Week' },
    { key: '30_days', label: '< 30 Days' },
    { key: '60_days', label: '< 60 Days' },
    { key: '90+', label: '90+ Days' },
  ];

  return (
    <div className="mt-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-auto px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
      >
        {buckets.map((bucket) => (
          <option key={bucket.key} value={bucket.key}>
            {bucket.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Unposted payments breakdown selector component - Modern Dropdown
const UnpostedBreakdownSelector: React.FC<{
  value: string;
  onChange: (bucket: string) => void;
  breakdown: { '7_days': number; '30_days': number; '90+': number };
}> = ({ value, onChange, breakdown }) => {
  const buckets = [
    { key: 'total', label: 'All Unposted' },
    { key: '7_days', label: '< 7 Days' },
    { key: '30_days', label: '< 30 Days' },
    { key: '90+', label: '90+ Days' },
  ];

  return (
    <div className="mt-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-auto px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
      >
        {buckets.map((bucket) => (
          <option key={bucket.key} value={bucket.key}>
            {bucket.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const BillingDashboard: React.FC = () => {
  // State management
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today'); // Shared for Revenue, Invoices, Pending Payments, Collection Rate, Avg Days
  const [overdueBucket, setOverdueBucket] = useState<string>('total');
  const [disputesBucket, setDisputesBucket] = useState<string>('total');
  const [unpostedBucket, setUnpostedBucket] = useState<string>('total');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard stats from API
  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pbs_invoicing_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/dashboard/stats?period=${timePeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Log any error from backend but still use the data (which will have zeros)
        if (data.error) {
          console.warn('Dashboard API warning:', data.error, data.message);
        }
        setStats(data);
      } else {
        console.error('Failed to fetch dashboard stats:', response.status);
        // Set default empty stats
        setStats({
          period: timePeriod,
          revenue: 0,
          invoices_created: 0,
          pending_payments: 0,
          overdue: { total: 0, breakdown: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } },
          collection_rate: 0,
          avg_days_to_payment: 0,
          disputes: { total_open: 0, breakdown: { '1_day': 0, '1_week': 0, '30_days': 0, '60_days': 0, '90+': 0 } },
          unposted_payments: { total: 0, breakdown: { '7_days': 0, '30_days': 0, '90+': 0 } }
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Set default empty stats on error
      setStats({
        period: timePeriod,
        revenue: 0,
        invoices_created: 0,
        pending_payments: 0,
        overdue: { total: 0, breakdown: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } },
        collection_rate: 0,
        avg_days_to_payment: 0,
        disputes: { total_open: 0, breakdown: { '1_day': 0, '1_week': 0, '30_days': 0, '60_days': 0, '90+': 0 } },
        unposted_payments: { total: 0, breakdown: { '7_days': 0, '30_days': 0, '90+': 0 } }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timePeriod]);

  // Calculate selected overdue amount
  const getOverdueAmount = () => {
    if (!stats) return 0;
    if (overdueBucket === 'total') return stats.overdue.total;
    return stats.overdue.breakdown[overdueBucket as keyof typeof stats.overdue.breakdown];
  };

  // Calculate selected disputes count
  const getDisputesCount = () => {
    if (!stats) return 0;
    if (disputesBucket === 'total') return stats.disputes.total_open;
    return stats.disputes.breakdown[disputesBucket as keyof typeof stats.disputes.breakdown];
  };

  // Calculate selected unposted payments count
  const getUnpostedCount = () => {
    if (!stats) return 0;
    if (unpostedBucket === 'total') return stats.unposted_payments.total;
    return stats.unposted_payments.breakdown[unpostedBucket as keyof typeof stats.unposted_payments.breakdown];
  };

  // Sample data for bottom sections (would come from API)
  const recentActivity = [
    { id: 1, type: 'invoice', action: 'Invoice #INV-2024-001 created', time: '5 min ago', status: 'success' },
    { id: 2, type: 'payment', action: 'Payment received for INV-2023-998', time: '15 min ago', status: 'success' },
    { id: 3, type: 'overdue', action: 'Invoice #INV-2023-945 is overdue', time: '1 hour ago', status: 'warning' },
    { id: 4, type: 'lab', action: 'Lab results imported for Patient #12345', time: '2 hours ago', status: 'info' },
  ];

  const outstandingInvoices = [
    { id: 1, invoiceNumber: 'INV-2024-001', client: 'ABC Clinic', amount: 5678.90, daysOverdue: 0 },
    { id: 2, invoiceNumber: 'INV-2023-998', client: 'XYZ Lab', amount: 3456.78, daysOverdue: 5 },
    { id: 3, invoiceNumber: 'INV-2023-945', client: 'Medical Center', amount: 8901.23, daysOverdue: 15 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Failed to load dashboard data</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid - 8 Cards (4 rows x 2 cols on mobile, 3 cols on tablet, 4 cols on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Revenue */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <TimePeriodSelector
                value={timePeriod}
                onChange={setTimePeriod}
                periods={['today', '7d', '30d', '60d', '90d']}
              />
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* 2. Invoices Created */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Invoices Created</p>
              <p className="text-2xl font-bold text-gray-900">{stats.invoices_created}</p>
              <TimePeriodSelector
                value={timePeriod}
                onChange={setTimePeriod}
                periods={['today', '7d', '30d', '60d', '90d']}
              />
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* 3. Pending Payments */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending_payments}</p>
              <TimePeriodSelector
                value={timePeriod}
                onChange={setTimePeriod}
                periods={['today', '7d', '30d', '60d', '90d']}
              />
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        {/* 4. Overdue Amount */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Overdue Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                ${getOverdueAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <OverdueBreakdownSelector
                value={overdueBucket}
                onChange={setOverdueBucket}
                breakdown={stats.overdue.breakdown}
              />
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* 5. Collection Rate */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Collection Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.collection_rate.toFixed(1)}%
              </p>
              <TimePeriodSelector
                value={timePeriod}
                onChange={setTimePeriod}
                periods={['today', '7d', '30d', '60d', '90d']}
              />
            </div>
            <div className="bg-teal-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        {/* 6. Avg Days to Payment */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Avg Days to Payment</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avg_days_to_payment}</p>
              <TimePeriodSelector
                value={timePeriod}
                onChange={setTimePeriod}
                periods={['today', '7d', '30d', '60d', '90d']}
              />
            </div>
            <div className="bg-sky-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-sky-600" />
            </div>
          </div>
        </div>

        {/* 7. Open Disputes */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Open Disputes</p>
              <p className="text-2xl font-bold text-gray-900">{getDisputesCount()}</p>
              <DisputesBreakdownSelector
                value={disputesBucket}
                onChange={setDisputesBucket}
                breakdown={stats.disputes.breakdown}
              />
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <MessageSquare className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* 8. Unposted Payments */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Unposted Payments</p>
              <p className="text-2xl font-bold text-gray-900">{getUnpostedCount()}</p>
              <UnpostedBreakdownSelector
                value={unpostedBucket}
                onChange={setUnpostedBucket}
                breakdown={stats.unposted_payments.breakdown}
              />
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'success' ? 'bg-green-100' :
                    activity.status === 'warning' ? 'bg-yellow-100' :
                    'bg-blue-100'
                  }`}>
                    {activity.type === 'invoice' ? <FileText className="w-4 h-4 text-gray-600" /> :
                     activity.type === 'payment' ? <DollarSign className="w-4 h-4 text-gray-600" /> :
                     activity.type === 'overdue' ? <AlertCircle className="w-4 h-4 text-gray-600" /> :
                     <CheckCircle className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Outstanding Invoices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Outstanding Invoices</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {outstandingInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-600">{invoice.client}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">${invoice.amount.toLocaleString()}</p>
                    {invoice.daysOverdue > 0 && (
                      <p className="text-xs text-red-600">{invoice.daysOverdue} days overdue</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Billing Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-center">
            <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">Create Invoice</span>
          </button>
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-center">
            <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">Record Payment</span>
          </button>
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-center">
            <ClipboardList className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">CPT Lookup</span>
          </button>
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-center">
            <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">View Overdue</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingDashboard;
