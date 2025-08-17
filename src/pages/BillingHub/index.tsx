import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { 
  FileText, 
  DollarSign, 
  ClipboardList,
  Beaker,
  TrendingUp,
  Settings as SettingsIcon,
  Upload,
  Download,
  Search,
  Plus
} from 'lucide-react';

// Sub-components (to be imported)
import BillingDashboard from './components/BillingDashboard';
import InvoiceManagement from './components/InvoiceManagement';
import PaymentProcessing from './components/PaymentProcessing';
import CPTManagement from './components/CPTManagement';
import LabBilling from './components/LabBilling';
import BillingOperations from './components/BillingOperations';

const BillingHub: React.FC = () => {
  const tabs = [
    { 
      path: '', 
      label: 'Dashboard', 
      icon: TrendingUp, 
      component: BillingDashboard,
      description: 'Billing overview and quick actions'
    },
    { 
      path: 'invoices', 
      label: 'Invoices', 
      icon: FileText, 
      component: InvoiceManagement,
      description: 'Create and manage invoices'
    },
    { 
      path: 'payments', 
      label: 'Payments', 
      icon: DollarSign, 
      component: PaymentProcessing,
      description: 'Process and track payments'
    },
    { 
      path: 'cpt', 
      label: 'CPT & Pricing', 
      icon: ClipboardList, 
      component: CPTManagement,
      description: 'CPT codes and service pricing'
    },
    { 
      path: 'lab-billing', 
      label: 'Lab Billing', 
      icon: Beaker, 
      component: LabBilling,
      description: 'Lab test billing integration'
    },
    { 
      path: 'operations', 
      label: 'Operations', 
      icon: SettingsIcon, 
      component: BillingOperations,
      description: 'Import, export, and settings'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing Hub</h1>
            <p className="text-gray-600 mt-1">Unified billing workspace for invoices, payments, and CPT management</p>
          </div>
          <div className="flex space-x-3">
            {/* Quick Actions */}
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Quick Invoice
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <DollarSign className="w-4 h-4 mr-2" />
              Record Payment
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search invoices, payments, CPT codes, or patients..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/billing${tab.path ? '/' + tab.path : ''}`}
                end={tab.path === ''}
                className={({ isActive }) =>
                  `py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <div className="flex items-center">
                  <tab.icon className="w-4 h-4 mr-2" />
                  <span>{tab.label}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
        
        {/* Content Area */}
        <div className="p-6">
          <Routes>
            <Route index element={<BillingDashboard />} />
            <Route path="invoices/*" element={<InvoiceManagement />} />
            <Route path="payments/*" element={<PaymentProcessing />} />
            <Route path="cpt/*" element={<CPTManagement />} />
            <Route path="lab-billing/*" element={<LabBilling />} />
            <Route path="operations/*" element={<BillingOperations />} />
            <Route path="*" element={<Navigate to="/billing" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default BillingHub;