import React from 'react';
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
  ClipboardList
} from 'lucide-react';

const BillingDashboard: React.FC = () => {
  // Sample data - would come from API
  const stats = {
    todayRevenue: 45678.90,
    todayInvoices: 23,
    pendingPayments: 15,
    overdueAmount: 12345.67,
    collectionRate: 87.5,
    avgDaysToPayment: 18
  };

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

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.todayRevenue.toLocaleString()}</p>
              <div className="flex items-center mt-2 text-green-600">
                <ArrowUp className="w-4 h-4 mr-1" />
                <span className="text-sm">12% from yesterday</span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Today's Invoices */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Invoices Created Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayInvoices}</p>
              <div className="flex items-center mt-2 text-blue-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm">On track for target</span>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
              <div className="flex items-center mt-2 text-yellow-600">
                <Clock className="w-4 h-4 mr-1" />
                <span className="text-sm">Awaiting processing</span>
              </div>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue Amount</p>
              <p className="text-2xl font-bold text-gray-900">${stats.overdueAmount.toLocaleString()}</p>
              <div className="flex items-center mt-2 text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Requires attention</span>
              </div>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Collection Rate */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Collection Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.collectionRate}%</p>
              <div className="flex items-center mt-2 text-green-600">
                <ArrowUp className="w-4 h-4 mr-1" />
                <span className="text-sm">Above target</span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Avg Days to Payment */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Days to Payment</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgDaysToPayment}</p>
              <div className="flex items-center mt-2 text-blue-600">
                <ArrowDown className="w-4 h-4 mr-1" />
                <span className="text-sm">Improving</span>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
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