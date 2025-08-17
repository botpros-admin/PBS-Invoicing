import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';

const ClientDashboard: React.FC = () => {
  // Sample data - would come from API
  const metrics = [
    {
      label: 'Total Claims This Month',
      value: '1,247',
      change: '+12%',
      trend: 'up',
      icon: FileText,
      color: 'blue'
    },
    {
      label: 'Claims Approved',
      value: '892',
      percentage: '71.5%',
      trend: 'up',
      icon: CheckCircle,
      color: 'green'
    },
    {
      label: 'Outstanding Balance',
      value: '$45,892.50',
      change: '-8%',
      trend: 'down',
      icon: DollarSign,
      color: 'red'
    },
    {
      label: 'Avg. Processing Time',
      value: '3.2 days',
      change: '-0.5 days',
      trend: 'down',
      icon: Clock,
      color: 'purple'
    }
  ];

  const recentClaims = [
    { id: 'CLM-2024-001', patient: 'John Doe', amount: '$1,250', status: 'approved', date: '2024-01-22' },
    { id: 'CLM-2024-002', patient: 'Jane Smith', amount: '$850', status: 'pending', date: '2024-01-22' },
    { id: 'CLM-2024-003', patient: 'Lab Test Batch', amount: '$3,400', status: 'processing', date: '2024-01-21' },
    { id: 'CLM-2024-004', patient: 'Robert Johnson', amount: '$450', status: 'denied', date: '2024-01-21' },
    { id: 'CLM-2024-005', patient: 'Specimen Analysis', amount: '$2,100', status: 'approved', date: '2024-01-20' }
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      denied: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Real-time overview of your claims and billing</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <metric.icon className={`w-8 h-8 text-${metric.color}-500`} />
              {metric.trend && (
                <div className={`flex items-center text-sm ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                  {metric.change}
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            <p className="text-sm text-gray-600 mt-1">{metric.label}</p>
            {metric.percentage && (
              <p className="text-xs text-gray-500 mt-1">{metric.percentage} of total</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Claims */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Claims</h2>
              <a href="/client-portal/claims" className="text-sm text-blue-600 hover:text-blue-700">
                View all →
              </a>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {recentClaims.map((claim) => (
              <div key={claim.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{claim.id}</p>
                    <p className="text-sm text-gray-600">{claim.patient}</p>
                    <p className="text-xs text-gray-500 mt-1">{claim.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{claim.amount}</p>
                    {getStatusBadge(claim.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Summary */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Billing Summary</h2>
              <a href="/client-portal/billing" className="text-sm text-blue-600 hover:text-blue-700">
                Manage billing →
              </a>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Balance</span>
                <span className="text-lg font-semibold text-gray-900">$45,892.50</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Past Due (30+ days)</span>
                <span className="text-lg font-semibold text-red-600">$12,450.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Due This Week</span>
                <span className="text-lg font-semibold text-yellow-600">$8,200.00</span>
              </div>
              <div className="pt-4 border-t">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Make Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Claims Processing Performance</h2>
          <div className="flex items-center space-x-4 text-sm">
            <span className="flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Approved
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
              Pending
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
              Denied
            </span>
          </div>
        </div>
        
        {/* Simple bar chart visualization */}
        <div className="h-64 flex items-end justify-between space-x-2">
          {[65, 78, 82, 71, 89, 76, 92].map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gray-200 rounded-t" style={{ height: `${value * 2}px` }}>
                <div className="bg-green-500 rounded-t" style={{ height: `${value * 1.4}px` }}></div>
              </div>
              <span className="text-xs text-gray-600 mt-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              New Prior Authorization Requirements
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Starting February 1st, certain high-cost procedures will require prior authorization. 
              <a href="#" className="ml-1 underline">Learn more</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;