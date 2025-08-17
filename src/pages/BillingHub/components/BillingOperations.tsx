import React, { useState } from 'react';
import {
  Settings,
  Upload,
  Download,
  FileText,
  Database,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

const BillingOperations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'settings' | 'audit'>('import');

  const recentImports = [
    { id: 1, fileName: 'patient_data_jan_2024.csv', records: 234, status: 'success', date: '2024-01-26 10:30 AM' },
    { id: 2, fileName: 'lab_results_batch_15.xlsx', records: 89, status: 'success', date: '2024-01-26 09:15 AM' },
    { id: 3, fileName: 'insurance_updates.csv', records: 156, status: 'warning', date: '2024-01-25 04:45 PM' }
  ];

  const auditLogs = [
    { id: 1, action: 'Invoice Created', user: 'John Smith', details: 'INV-2024-001 for ABC Clinic', time: '10 min ago' },
    { id: 2, action: 'Payment Recorded', user: 'Jane Doe', details: '$5,678.90 from XYZ Lab', time: '1 hour ago' },
    { id: 3, action: 'CPT Code Updated', user: 'Admin', details: 'Updated pricing for CPT 99213', time: '2 hours ago' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Billing Operations</h2>
            <p className="text-sm text-gray-600 mt-1">
              Import, export, and configure billing settings
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('import')}
              className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'import'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Import Data
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'export'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Billing Settings
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'audit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Audit Trail
            </button>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Import Widget */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Billing Data</h3>
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Supports CSV, XLSX, and XLS files up to 10MB
              </p>
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Select Files
              </button>
            </div>

            {/* Quick Import Templates */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Import Templates</h4>
              <div className="grid grid-cols-3 gap-3">
                <button className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
                  <FileText className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900">Patient Data</p>
                  <p className="text-xs text-gray-500">Demographics & Insurance</p>
                </button>
                <button className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
                  <Database className="w-5 h-5 text-green-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900">Lab Results</p>
                  <p className="text-xs text-gray-500">Test results for billing</p>
                </button>
                <button className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
                  <TrendingUp className="w-5 h-5 text-purple-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900">Historical Invoices</p>
                  <p className="text-xs text-gray-500">Past billing records</p>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Imports */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Imports</h3>
            <div className="space-y-3">
              {recentImports.map((importItem) => (
                <div key={importItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {importItem.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{importItem.fileName}</p>
                      <p className="text-xs text-gray-500">{importItem.records} records • {importItem.date}</p>
                    </div>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-800">View Details</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Billing Data</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>All Invoices</option>
                <option>Payments</option>
                <option>Outstanding Balances</option>
                <option>Lab Billing Report</option>
                <option>CPT Code Usage</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <div className="flex space-x-3">
                <label className="flex items-center">
                  <input type="radio" name="format" defaultChecked className="mr-2" />
                  <span className="text-sm">CSV</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="format" className="mr-2" />
                  <span className="text-sm">Excel</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="format" className="mr-2" />
                  <span className="text-sm">PDF</span>
                </label>
              </div>
            </div>

            <button className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </button>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Configuration</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Invoice Settings</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Auto-generate invoice numbers</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Send invoice reminders</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Enable partial payments</span>
                  <input type="checkbox" className="rounded" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment Settings</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Default payment terms</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Net 30</option>
                    <option>Net 15</option>
                    <option>Due on Receipt</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Auto-match payments to invoices</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
              </div>
            </div>

            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Save Settings
            </button>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Audit Trail</h3>
          
          <div className="space-y-4">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    <span className="text-xs text-gray-500">{log.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                  <p className="text-xs text-gray-500 mt-1">by {log.user}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800">
            View Full Audit History
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-semibold text-yellow-900">Import Data Now in Billing Hub</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Import functionality has been moved from Settings to the Billing Hub for easier access. 
              You can now import patient data, lab results, and billing records directly where you need them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingOperations;