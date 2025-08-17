import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Database,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

const DataImport: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<any>(null);

  const importSources = [
    {
      id: 'csv',
      name: 'CSV/Excel Files',
      icon: FileSpreadsheet,
      description: 'Import from spreadsheet files',
      supported: ['.csv', '.xlsx', '.xls'],
      color: 'green'
    },
    {
      id: 'hl7',
      name: 'HL7 Messages',
      icon: FileText,
      description: 'Import HL7 formatted data',
      supported: ['.hl7', '.txt'],
      color: 'blue'
    },
    {
      id: 'database',
      name: 'Database Connection',
      icon: Database,
      description: 'Direct database import',
      supported: ['MySQL', 'PostgreSQL', 'MSSQL'],
      color: 'purple'
    },
    {
      id: 'api',
      name: 'API Integration',
      icon: ArrowRight,
      description: 'Import via REST API',
      supported: ['JSON', 'XML'],
      color: 'orange'
    }
  ];

  const recentImports = [
    {
      id: 1,
      source: 'CSV',
      fileName: 'patients_jan_2024.csv',
      records: 156,
      status: 'success',
      date: '2024-01-20 14:32',
      duration: '2m 15s'
    },
    {
      id: 2,
      source: 'HL7',
      fileName: 'lab_results_batch.hl7',
      records: 423,
      status: 'success',
      date: '2024-01-19 09:15',
      duration: '5m 42s'
    },
    {
      id: 3,
      source: 'API',
      fileName: 'insurance_sync',
      records: 89,
      status: 'warning',
      date: '2024-01-18 16:45',
      duration: '1m 28s'
    },
    {
      id: 4,
      source: 'Database',
      fileName: 'legacy_migration',
      records: 2341,
      status: 'failed',
      date: '2024-01-17 11:20',
      duration: '12m 03s'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Source Selection */}
      {!selectedSource && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Import Source</h3>
          <div className="grid grid-cols-2 gap-4">
            {importSources.map((source) => (
              <button
                key={source.id}
                onClick={() => setSelectedSource(source.id)}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-start">
                  <div className={`p-3 rounded-lg bg-${source.color}-50 mr-4`}>
                    <source.icon className={`w-6 h-6 text-${source.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900">{source.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{source.description}</p>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Supported formats:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {source.supported.map((format) => (
                          <span key={format} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {format}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CSV Import Interface */}
      {selectedSource === 'csv' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Import from CSV/Excel</h3>
            <button
              onClick={() => setSelectedSource(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          </div>

          <div className="space-y-6">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your file here, or click to browse
              </p>
              <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Select File
              </button>
              <p className="text-xs text-gray-500 mt-4">
                Maximum file size: 50MB | Supported: CSV, XLSX, XLS
              </p>
            </div>

            {/* Mapping Configuration */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Field Mapping</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">CSV Column</label>
                    <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option>patient_name</option>
                      <option>dob</option>
                      <option>insurance_id</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Maps To</label>
                    <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option>Patient Name</option>
                      <option>Date of Birth</option>
                      <option>Insurance ID</option>
                    </select>
                  </div>
                </div>
                <button className="mt-3 text-sm text-blue-600 hover:text-blue-800">
                  + Add mapping
                </button>
              </div>
            </div>

            {/* Import Options */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Import Options</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm text-gray-700">Skip duplicate records</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm text-gray-700">Validate data before import</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm text-gray-700">Update existing records</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm text-gray-700">Create backup before import</span>
                </label>
              </div>
            </div>

            {/* Progress Bar */}
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

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedSource(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Validate & Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validationResults && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Results</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-xs text-green-700">Valid Records</p>
              <p className="text-2xl font-bold text-green-900">142</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-xs text-yellow-700">Warnings</p>
              <p className="text-2xl font-bold text-yellow-900">8</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs text-red-700">Errors</p>
              <p className="text-2xl font-bold text-red-900">2</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start p-2 bg-yellow-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Missing Insurance Information</p>
                <p className="text-xs text-yellow-700">8 records have no insurance provider specified</p>
              </div>
            </div>
            <div className="flex items-start p-2 bg-red-50 rounded-lg">
              <XCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2" />
              <div>
                <p className="text-sm font-medium text-red-900">Invalid Date Format</p>
                <p className="text-xs text-red-700">2 records have DOB in incorrect format</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Import History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Imports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File/Connection</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Records</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentImports.map((importItem) => (
                <tr key={importItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{importItem.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{importItem.fileName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{importItem.records}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      {getStatusIcon(importItem.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">{importItem.duration}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{importItem.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button className="text-blue-600 hover:text-blue-800">View Log</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataImport;