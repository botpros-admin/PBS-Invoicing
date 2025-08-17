import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Clock,
  CheckCircle,
  Package,
  Mail,
  Cloud
} from 'lucide-react';

const DataExport: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState('excel');
  const [selectedData, setSelectedData] = useState<string[]>([]);

  const exportFormats = [
    { id: 'excel', name: 'Excel', icon: FileSpreadsheet, extension: '.xlsx' },
    { id: 'csv', name: 'CSV', icon: FileText, extension: '.csv' },
    { id: 'pdf', name: 'PDF Report', icon: FileText, extension: '.pdf' },
    { id: 'json', name: 'JSON', icon: Package, extension: '.json' }
  ];

  const dataTypes = [
    { id: 'patients', name: 'Patient Records', count: 3847, lastUpdated: '2 hours ago' },
    { id: 'invoices', name: 'Invoices', count: 12453, lastUpdated: '1 hour ago' },
    { id: 'payments', name: 'Payments', count: 9821, lastUpdated: '30 minutes ago' },
    { id: 'insurance', name: 'Insurance Claims', count: 5632, lastUpdated: '3 hours ago' },
    { id: 'lab', name: 'Lab Results', count: 7234, lastUpdated: '1 day ago' },
    { id: 'reports', name: 'Financial Reports', count: 156, lastUpdated: '1 week ago' }
  ];

  const scheduleOptions = [
    { id: 'once', name: 'One-time Export', description: 'Export data immediately' },
    { id: 'daily', name: 'Daily', description: 'Export every day at specified time' },
    { id: 'weekly', name: 'Weekly', description: 'Export every week on selected days' },
    { id: 'monthly', name: 'Monthly', description: 'Export monthly on specified date' }
  ];

  const recentExports = [
    {
      id: 1,
      name: 'Monthly Patient Report',
      format: 'Excel',
      size: '2.4 MB',
      records: 3847,
      date: '2024-01-20 09:00',
      status: 'completed'
    },
    {
      id: 2,
      name: 'Insurance Claims Export',
      format: 'CSV',
      size: '1.8 MB',
      records: 2341,
      date: '2024-01-19 14:30',
      status: 'completed'
    },
    {
      id: 3,
      name: 'Financial Summary',
      format: 'PDF',
      size: '845 KB',
      records: 156,
      date: '2024-01-18 16:00',
      status: 'completed'
    }
  ];

  const toggleDataType = (id: string) => {
    setSelectedData(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure Export</h3>
        
        {/* Data Selection */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Select Data to Export</h4>
          <div className="grid grid-cols-2 gap-3">
            {dataTypes.map((type) => (
              <div
                key={type.id}
                onClick={() => toggleDataType(type.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedData.includes(type.id)
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{type.name}</p>
                    <p className="text-xs text-gray-500">{type.count} records • {type.lastUpdated}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedData.includes(type.id)}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Export Format</h4>
          <div className="grid grid-cols-4 gap-3">
            {exportFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedFormat === format.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <format.icon className={`w-6 h-6 mx-auto mb-1 ${
                  selectedFormat === format.id ? 'text-blue-600' : 'text-gray-600'
                }`} />
                <p className={`text-sm font-medium ${
                  selectedFormat === format.id ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {format.name}
                </p>
                <p className="text-xs text-gray-500">{format.extension}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Date Range</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Export Options</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm text-gray-700">Include column headers</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm text-gray-700">Compress file (ZIP)</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm text-gray-700">Encrypt with password</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm text-gray-700">Include metadata</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Clock className="w-4 h-4 mr-2 text-gray-600" />
            Schedule Export
          </button>
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Preview
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export Now
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Export */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Automated Export</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Schedule Type</h4>
            <div className="space-y-2">
              {scheduleOptions.map((option) => (
                <label key={option.id} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="radio" name="schedule" className="mt-1 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{option.name}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Delivery Method</h4>
            <div className="space-y-3">
              <div className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <Mail className="w-4 h-4 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Email</span>
                </div>
                <input
                  type="email"
                  placeholder="Enter email addresses"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <Cloud className="w-4 h-4 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Cloud Storage</span>
                </div>
                <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                  <option>Select destination</option>
                  <option>Google Drive</option>
                  <option>Dropbox</option>
                  <option>OneDrive</option>
                  <option>S3 Bucket</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Exports */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Exports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Export Name</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Format</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Records</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentExports.map((exportItem) => (
                <tr key={exportItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {exportItem.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {exportItem.format}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                    {exportItem.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {exportItem.records}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {exportItem.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">Download</button>
                    <button className="text-gray-600 hover:text-gray-800">Delete</button>
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

export default DataExport;