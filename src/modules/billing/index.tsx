import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  FileText, 
  DollarSign, 
  CreditCard, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

// Placeholder components for billing features
const InvoicesList = () => (
  <div className="space-y-6">
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Invoices</h2>
      <p className="text-gray-500">Invoice management functionality coming soon...</p>
    </div>
  </div>
);

const PaymentsList = () => (
  <div className="space-y-6">
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Payments</h2>
      <p className="text-gray-500">Payment processing functionality coming soon...</p>
    </div>
  </div>
);

const CreditsManagement = () => (
  <div className="space-y-6">
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Account Credits</h2>
      <p className="text-gray-500">Credit management functionality coming soon...</p>
    </div>
  </div>
);

const DisputesQueue = () => (
  <div className="space-y-6">
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Disputes</h2>
      <p className="text-gray-500">Dispute management functionality coming soon...</p>
    </div>
  </div>
);

const BillingDashboard = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Open Invoices</dt>
              <dd className="text-lg font-semibold text-gray-900">0</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
              <dd className="text-lg font-semibold text-gray-900">$0.00</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Pending Disputes</dt>
              <dd className="text-lg font-semibold text-gray-900">0</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Collection Rate</dt>
              <dd className="text-lg font-semibold text-gray-900">0%</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
      <p className="text-gray-500">No recent billing activity</p>
    </div>
  </div>
);

export const BillingModule: React.FC = () => {
  return (
    <Routes>
      <Route index element={<BillingDashboard />} />
      <Route path="invoices" element={<InvoicesList />} />
      <Route path="payments" element={<PaymentsList />} />
      <Route path="credits" element={<CreditsManagement />} />
      <Route path="disputes" element={<DisputesQueue />} />
      <Route path="*" element={<Navigate to="/billing" replace />} />
    </Routes>
  );
};

export default BillingModule;