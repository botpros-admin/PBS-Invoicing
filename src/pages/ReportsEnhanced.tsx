/**
 * Enhanced Reports Page
 * 
 * The THREE CRITICAL REPORTS Ashley actually needs
 * No vanity dashboards, just working documents
 */

import React, { useState } from 'react';
import { 
  FileText,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { PaymentReconciliationReport } from '../components/reports/PaymentReconciliationReport';
import { AgingReport } from '../components/reports/AgingReport';
import { MonthlySummaryReport } from '../components/reports/MonthlySummaryReport';

type ReportType = 'reconciliation' | 'aging' | 'monthly';

export const ReportsEnhanced: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('reconciliation');
  
  const reportTabs = [
    {
      id: 'reconciliation' as ReportType,
      name: 'Payment Reconciliation',
      description: 'Track payment allocations',
      icon: DollarSign,
      color: 'blue'
    },
    {
      id: 'aging' as ReportType,
      name: 'Aging Report',
      description: 'Outstanding invoice aging',
      icon: Clock,
      color: 'yellow'
    },
    {
      id: 'monthly' as ReportType,
      name: 'Monthly Summary',
      description: 'High-level metrics',
      icon: TrendingUp,
      color: 'green'
    }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="mt-2 text-sm text-gray-600">
            Working reports for reconciliation, collection, and summary - all exportable to Excel
          </p>
        </div>
        
        {/* Report Tabs */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeReport === tab.id;
              const colorClasses = {
                blue: {
                  active: 'bg-blue-600 text-white',
                  inactive: 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-200'
                },
                yellow: {
                  active: 'bg-yellow-600 text-white',
                  inactive: 'bg-white text-gray-700 hover:bg-yellow-50 border-2 border-gray-200'
                },
                green: {
                  active: 'bg-green-600 text-white',
                  inactive: 'bg-white text-gray-700 hover:bg-green-50 border-2 border-gray-200'
                }
              };
              
              const colors = colorClasses[tab.color as keyof typeof colorClasses];
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveReport(tab.id)}
                  className={`p-6 rounded-lg transition-all ${
                    isActive ? colors.active : colors.inactive
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-2" />
                        <span className="font-medium">{tab.name}</span>
                      </div>
                      <p className={`text-sm mt-1 ${isActive ? 'text-white/90' : 'text-gray-500'}`}>
                        {tab.description}
                      </p>
                    </div>
                    {isActive && (
                      <div className="ml-4">
                        <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Active Report */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeReport === 'reconciliation' && <PaymentReconciliationReport />}
          {activeReport === 'aging' && <AgingReport />}
          {activeReport === 'monthly' && <MonthlySummaryReport />}
        </div>
        
        {/* Help Text */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">About These Reports</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• <strong>Payment Reconciliation:</strong> Shows which payments are allocated to which invoices, highlights unallocated amounts</p>
            <p>• <strong>Aging Report:</strong> Lists outstanding invoices by age (30/60/90/120+ days) for collection prioritization</p>
            <p>• <strong>Monthly Summary:</strong> High-level view of billing, collections, and outstanding balances by month</p>
            <p className="pt-2 font-medium">All reports export to Excel/CSV for offline work and further analysis.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsEnhanced;