import React, { useState } from 'react';
import {
  DollarSign,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Link as LinkIcon,
  Search,
  Filter,
  Download
} from 'lucide-react';

const PaymentProcessing: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Sample payment data with invoice correlation
  const payments = [
    {
      id: 1,
      paymentId: 'PAY-2024-001',
      invoiceNumber: 'INV-2024-003',
      client: 'Medical Center',
      amount: 8901.23,
      method: 'ACH',
      status: 'completed',
      date: '2024-01-25',
      autoMatched: true
    },
    {
      id: 2,
      paymentId: 'PAY-2024-002',
      invoiceNumber: 'INV-2024-002',
      client: 'XYZ Laboratory',
      amount: 3456.78,
      method: 'Credit Card',
      status: 'pending',
      date: '2024-01-26',
      autoMatched: true
    },
    {
      id: 3,
      paymentId: 'PAY-2024-003',
      invoiceNumber: null,
      client: 'ABC Clinic',
      amount: 5678.90,
      method: 'Check',
      status: 'processing',
      date: '2024-01-26',
      autoMatched: false
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Processing
          </span>
        );
      default:
        return null;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'Credit Card':
        return <CreditCard className="w-4 h-4 text-gray-600" />;
      case 'ACH':
        return <DollarSign className="w-4 h-4 text-gray-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payment Processing</h2>
            <p className="text-sm text-gray-600 mt-1">
              Process and track payments with automatic invoice correlation
            </p>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <DollarSign className="w-4 h-4 mr-2" />
            Record Payment
          </button>
        </div>

        {/* Auto-Match Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600">Auto-Matched Today</p>
                <p className="text-lg font-semibold text-blue-900">12 / 15</p>
              </div>
              <LinkIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600">Processed Today</p>
                <p className="text-lg font-semibold text-green-900">$45,678</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-600">Pending Review</p>
                <p className="text-lg font-semibold text-yellow-900">3</p>
              </div>
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search payments by ID, invoice number, or client..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Link
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{payment.paymentId}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.invoiceNumber ? (
                      <div className="flex items-center">
                        <LinkIcon className="w-3 h-3 mr-1 text-blue-600" />
                        <a href="#" className="text-sm text-blue-600 hover:text-blue-800">
                          {payment.invoiceNumber}
                        </a>
                        {payment.autoMatched && (
                          <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                            Auto
                          </span>
                        )}
                      </div>
                    ) : (
                      <button className="text-sm text-yellow-600 hover:text-yellow-800">
                        Link Invoice
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{payment.client}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-semibold text-gray-900">
                      ${payment.amount.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getMethodIcon(payment.method)}
                      <span className="ml-2 text-sm text-gray-900">{payment.method}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{payment.date}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-Correlation Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <LinkIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Automatic Invoice Correlation</h4>
            <p className="text-sm text-blue-700 mt-1">
              Payments are automatically matched to invoices based on amount, client, and reference numbers. 
              80% of payments are now auto-matched, saving 5 minutes per payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentProcessing;