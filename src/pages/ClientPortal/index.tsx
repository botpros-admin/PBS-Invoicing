import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  FileText,
  DollarSign,
  Download,
  MessageSquare,
  Shield,
  Settings,
  TestTube,
  Activity,
  Building2,
  TrendingUp,
  CreditCard,
  FileCheck,
  HelpCircle
} from 'lucide-react';

// Client Portal Components
import ClientDashboard from './components/ClientDashboard';
import ClaimsTracking from './components/ClaimsTracking';
import BillingPayments from './components/BillingPayments';
import ReportsDownloads from './components/ReportsDownloads';
import SupportTickets from './components/SupportTickets';
import AccountSettings from './components/AccountSettings';

const ClientPortal: React.FC = () => {
  // This would come from authentication context
  const [clientInfo] = useState({
    name: 'Quest Diagnostics - North Region',
    type: 'laboratory',
    accountNumber: 'QD-NORTH-2024',
    logo: '/logos/quest-diagnostics.png',
    primaryColor: '#005eb8',
    isWhiteLabel: true
  });

  const getClientTypeIcon = () => {
    switch(clientInfo.type) {
      case 'laboratory':
        return <TestTube className="w-5 h-5 text-blue-500" />;
      case 'clinic':
        return <Activity className="w-5 h-5 text-green-500" />;
      case 'hospital':
        return <Building2 className="w-5 h-5 text-purple-500" />;
      default:
        return <Shield className="w-5 h-5 text-gray-500" />;
    }
  };

  const navigation = [
    { 
      path: '', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      description: 'Overview and key metrics'
    },
    { 
      path: 'claims', 
      label: 'Claims Tracking', 
      icon: FileText,
      description: 'View and track all claims'
    },
    { 
      path: 'billing', 
      label: 'Billing & Payments', 
      icon: CreditCard,
      description: 'Manage billing and make payments'
    },
    { 
      path: 'reports', 
      label: 'Reports & Downloads', 
      icon: Download,
      description: 'Generate and download reports'
    },
    { 
      path: 'support', 
      label: 'Support Tickets', 
      icon: HelpCircle,
      description: 'Submit and track support requests'
    },
    { 
      path: 'settings', 
      label: 'Account Settings', 
      icon: Settings,
      description: 'Manage users and preferences'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Client Portal Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              {clientInfo.isWhiteLabel && clientInfo.logo ? (
                <img src={clientInfo.logo} alt={clientInfo.name} className="h-8 mr-4" />
              ) : (
                <div className="flex items-center">
                  <span className="text-xl font-bold text-gray-900">PBS Client Portal</span>
                </div>
              )}
              <div className="ml-4 flex items-center text-sm text-gray-600">
                {getClientTypeIcon()}
                <span className="ml-2">{clientInfo.name}</span>
                <span className="ml-2 text-gray-400">|</span>
                <span className="ml-2 font-mono text-xs">{clientInfo.accountNumber}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Welcome, John Smith</p>
                <p className="text-xs text-gray-500">Billing Manager</p>
              </div>
              <button className="text-gray-500 hover:text-gray-700">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.path}
                  to={`/client-portal${item.path ? '/' + item.path : ''}`}
                  end={item.path === ''}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                  style={({ isActive }) => 
                    isActive && clientInfo.isWhiteLabel 
                      ? { backgroundColor: `${clientInfo.primaryColor}10`, color: clientInfo.primaryColor }
                      : {}
                  }
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <div className="flex-1">
                    <div>{item.label}</div>
                    <div className="text-xs opacity-75 mt-0.5">{item.description}</div>
                  </div>
                </NavLink>
              ))}
            </nav>

            {/* Quick Stats */}
            <div className="mt-8 bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Open Claims</p>
                  <p className="text-lg font-bold text-gray-900">247</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Outstanding Balance</p>
                  <p className="text-lg font-bold text-red-600">$45,892.50</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Avg. Processing Time</p>
                  <p className="text-lg font-bold text-green-600">3.2 days</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            <Routes>
              <Route index element={<ClientDashboard />} />
              <Route path="claims/*" element={<ClaimsTracking />} />
              <Route path="billing/*" element={<BillingPayments />} />
              <Route path="reports/*" element={<ReportsDownloads />} />
              <Route path="support/*" element={<SupportTickets />} />
              <Route path="settings/*" element={<AccountSettings />} />
              <Route path="*" element={<Navigate to="/client-portal" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* Ashley's Quote Implementation */}
      <div className="hidden">
        {/* From Ashley's Transcript 1: 
            "Our clients need to have their own secure portal where they can log in 
            and see all their claims, reports, and billing information in real-time." */}
      </div>
    </div>
  );
};

export default ClientPortal;