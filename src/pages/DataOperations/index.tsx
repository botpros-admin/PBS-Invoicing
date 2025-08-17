import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { 
  Upload,
  Download,
  Database,
  RefreshCw,
  FileSpreadsheet,
  Settings,
  Shield,
  AlertCircle
} from 'lucide-react';

// Data Operations Components
import DataImport from './components/DataImport';
import DataExport from './components/DataExport';
import DataSync from './components/DataSync';
import DataMaintenance from './components/DataMaintenance';

const DataOperations: React.FC = () => {
  const tabs = [
    { 
      path: '', 
      label: 'Data Import', 
      icon: Upload, 
      component: DataImport,
      description: 'Bulk import data from external sources'
    },
    { 
      path: 'export', 
      label: 'Data Export', 
      icon: Download, 
      component: DataExport,
      description: 'Export data for reporting and backup'
    },
    { 
      path: 'sync', 
      label: 'Data Sync', 
      icon: RefreshCw, 
      component: DataSync,
      description: 'Synchronize with external systems'
    },
    { 
      path: 'maintenance', 
      label: 'Data Maintenance', 
      icon: Database, 
      component: DataMaintenance,
      description: 'Clean, validate, and maintain data integrity'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Operations</h1>
            <p className="text-gray-600 mt-1">Import, export, and manage your billing data</p>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4 mr-2 text-gray-600" />
              Settings
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Database className="w-4 h-4 mr-2" />
              Run Backup
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-700">System Status</p>
            <p className="text-lg font-bold text-green-900">Operational</p>
            <p className="text-xs text-green-600 mt-1">All systems running</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-700">Last Import</p>
            <p className="text-lg font-bold text-blue-900">2 hrs ago</p>
            <p className="text-xs text-blue-600 mt-1">156 records</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <p className="text-xs text-purple-700">Last Export</p>
            <p className="text-lg font-bold text-purple-900">Yesterday</p>
            <p className="text-xs text-purple-600 mt-1">3,847 records</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <p className="text-xs text-amber-700">Data Integrity</p>
            <p className="text-lg font-bold text-amber-900">99.8%</p>
            <p className="text-xs text-amber-600 mt-1">23 warnings</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/data${tab.path ? '/' + tab.path : ''}`}
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
            <Route index element={<DataImport />} />
            <Route path="export/*" element={<DataExport />} />
            <Route path="sync/*" element={<DataSync />} />
            <Route path="maintenance/*" element={<DataMaintenance />} />
            <Route path="*" element={<Navigate to="/data" replace />} />
          </Routes>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Data Security</h4>
            <p className="text-sm text-blue-700 mt-1">
              All data operations are encrypted and logged for HIPAA compliance. 
              Regular backups are performed automatically every 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataOperations;