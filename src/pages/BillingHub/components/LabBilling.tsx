import React, { useState } from 'react';
import {
  Beaker,
  FileText,
  ArrowRight,
  CheckCircle,
  Clock,
  Upload,
  Search,
  Plus
} from 'lucide-react';

const LabBilling: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Sample lab test data
  const labTests = [
    {
      id: 1,
      testCode: 'CBC001',
      testName: 'Complete Blood Count',
      patientName: 'John Doe',
      patientId: 'P12345',
      orderDate: '2024-01-26',
      status: 'completed',
      billable: true,
      cptCode: '85025',
      price: 45.00
    },
    {
      id: 2,
      testCode: 'LIPID002',
      testName: 'Lipid Panel',
      patientName: 'Jane Smith',
      patientId: 'P12346',
      orderDate: '2024-01-26',
      status: 'completed',
      billable: true,
      cptCode: '80061',
      price: 65.00
    },
    {
      id: 3,
      testCode: 'TSH003',
      testName: 'Thyroid Stimulating Hormone',
      patientName: 'Bob Johnson',
      patientId: 'P12347',
      orderDate: '2024-01-25',
      status: 'pending',
      billable: false,
      cptCode: '84443',
      price: 55.00
    }
  ];

  const getStatusBadge = (status: string) => {
    return status === 'completed' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Completed
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Lab Billing Integration</h2>
            <p className="text-sm text-gray-600 mt-1">
              Convert lab results directly into billable invoices
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Upload className="w-4 h-4 mr-2 text-gray-600" />
              Import Results
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Add Lab Test
            </button>
          </div>
        </div>

        {/* Workflow Visual */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Beaker className="w-5 h-5 text-blue-600" />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">Lab Results</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">Auto CPT Mapping</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">Invoice Created</span>
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
            placeholder="Search lab tests by code, patient, or test name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lab Tests Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPT Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {labTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{test.testName}</p>
                      <p className="text-xs text-gray-500">Code: {test.testCode}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm text-gray-900">{test.patientName}</p>
                      <p className="text-xs text-gray-500">ID: {test.patientId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                      {test.cptCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-semibold text-gray-900">
                      ${test.price.toFixed(2)}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(test.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {test.status === 'completed' && !test.billable ? (
                      <button className="inline-flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                        <FileText className="w-3 h-3 mr-1" />
                        Create Invoice
                      </button>
                    ) : test.billable ? (
                      <span className="text-xs text-green-600">Invoiced</span>
                    ) : (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
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

      {/* Batch Actions */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Batch Actions</h3>
            <p className="text-sm text-gray-600 mt-1">
              Select multiple completed tests to create invoices in bulk
            </p>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <FileText className="w-4 h-4 mr-2" />
            Batch Create Invoices
          </button>
        </div>
      </div>

      {/* Integration Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600">Tests Today</p>
          <p className="text-2xl font-bold text-gray-900">47</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600">Auto-Billed</p>
          <p className="text-2xl font-bold text-green-600">38</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600">Revenue Generated</p>
          <p className="text-2xl font-bold text-blue-600">$2,435</p>
        </div>
      </div>
    </div>
  );
};

export default LabBilling;