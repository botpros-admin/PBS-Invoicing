import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  Trash2,
  Archive
} from 'lucide-react';

const PatientOperations: React.FC = () => {
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const operations = [
    {
      id: 'import',
      title: 'Import Patients',
      description: 'Bulk import patient records from CSV or Excel',
      icon: Upload,
      action: 'Import',
      color: 'blue'
    },
    {
      id: 'export',
      title: 'Export Patient Data',
      description: 'Export patient records for reporting or backup',
      icon: Download,
      action: 'Export',
      color: 'green'
    },
    {
      id: 'merge',
      title: 'Merge Duplicates',
      description: 'Find and merge duplicate patient records',
      icon: Users,
      action: 'Find Duplicates',
      color: 'purple'
    },
    {
      id: 'archive',
      title: 'Archive Inactive',
      description: 'Archive patients with no activity in 24+ months',
      icon: Archive,
      action: 'Archive',
      color: 'gray'
    }
  ];

  const recentOperations = [
    {
      id: 1,
      type: 'Import',
      fileName: 'patients_jan_2024.csv',
      records: 156,
      status: 'completed',
      date: '2024-01-20 14:32',
      user: 'admin@email.com'
    },
    {
      id: 2,
      type: 'Export',
      fileName: 'insurance_report.xlsx',
      records: 847,
      status: 'completed',
      date: '2024-01-19 09:15',
      user: 'billing@email.com'
    },
    {
      id: 3,
      type: 'Merge',
      fileName: 'duplicate_cleanup',
      records: 23,
      status: 'completed',
      date: '2024-01-18 16:45',
      user: 'admin@email.com'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {operations.map((op) => (
          <div
            key={op.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setActiveOperation(op.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className={`p-3 rounded-lg bg-${op.color}-50 mr-4`}>
                  <op.icon className={`w-6 h-6 text-${op.color}-600`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{op.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{op.description}</p>
                </div>
              </div>
              <button
                className={`px-3 py-1.5 bg-${op.color}-600 text-white text-sm rounded-lg hover:bg-${op.color}-700 transition-colors`}
              >
                {op.action}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Import Section (shown when activeOperation === 'import') */}
      {activeOperation === 'import' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Patient Records</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop your CSV or Excel file here, or click to browse
            </p>
            <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Select File
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Import Format Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• First row must contain column headers</li>
                <li>• Required fields: First Name, Last Name, DOB, Phone</li>
                <li>• Optional fields: Email, Insurance, Policy Number</li>
                <li>• Date format: MM/DD/YYYY</li>
                <li>• Maximum 10,000 records per import</li>
              </ul>
            </div>

            {uploadProgress > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Importing...</span>
                  <span className="text-sm text-gray-600">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => setActiveOperation(null)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Start Import
            </button>
          </div>
        </div>
      )}

      {/* Export Section (shown when activeOperation === 'export') */}
      {activeOperation === 'export' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Patient Data</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
              <div className="grid grid-cols-3 gap-3">
                <button className="p-3 border-2 border-blue-600 rounded-lg bg-blue-50">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <span className="text-sm font-medium text-blue-600">Excel</span>
                </button>
                <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <FileText className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                  <span className="text-sm text-gray-600">CSV</span>
                </button>
                <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <FileText className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                  <span className="text-sm text-gray-600">PDF</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Include Fields</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm text-gray-700">Basic Information (Name, DOB, Contact)</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm text-gray-700">Insurance Information</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm text-gray-700">Visit History</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm text-gray-700">Billing Information</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setActiveOperation(null)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </button>
          </div>
        </div>
      )}

      {/* Recent Operations History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Operations</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File/Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOperations.map((operation) => (
                <tr key={operation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{operation.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{operation.fileName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{operation.records}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(operation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{operation.date}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{operation.user}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      View Log
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Integrity Check */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <Database className="w-5 h-5 text-amber-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900">Data Integrity Check</h4>
            <p className="text-sm text-amber-700 mt-1">
              Last integrity check: January 15, 2024. 23 duplicate records found and flagged for review.
            </p>
            <button className="mt-2 text-sm font-medium text-amber-900 hover:text-amber-800">
              Run Check Now →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientOperations;