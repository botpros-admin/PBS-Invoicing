import React, { useState } from 'react';
import {
  Search,
  Filter,
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  MoreVertical,
  FileText,
  TestTube,
  Activity,
  Building2,
  MapPin
} from 'lucide-react';

// Universal service recipient component (works for labs, clinics, facilities)
const ServiceDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');

  // Sample service recipient data (universal structure)
  const serviceRecipients = [
    {
      id: 1,
      identifier: 'SR-2024-001', // Universal ID (MRN for clinics, Specimen ID for labs)
      name: 'John Doe',
      serviceLocation: 'Main Laboratory',
      serviceType: 'laboratory',
      dateOfService: '2024-01-15',
      referringProvider: 'Dr. Smith',
      coverageStatus: 'verified',
      chargeCapture: 125.00,
      encounterStatus: 'completed',
      posCode: '81' // Place of Service code
    },
    {
      id: 2,
      identifier: 'SR-2024-002',
      name: 'Jane Smith',
      serviceLocation: 'North Clinic',
      serviceType: 'clinic',
      dateOfService: '2024-01-20',
      referringProvider: 'Dr. Johnson',
      coverageStatus: 'verified',
      chargeCapture: 0,
      encounterStatus: 'in_progress',
      posCode: '11'
    },
    {
      id: 3,
      identifier: 'SR-2024-003',
      name: 'Robert Johnson',
      serviceLocation: 'West Facility',
      serviceType: 'facility',
      dateOfService: '2023-12-10',
      referringProvider: 'Dr. Brown',
      coverageStatus: 'pending',
      chargeCapture: 450.00,
      encounterStatus: 'pending_review',
      posCode: '31'
    },
    {
      id: 4,
      identifier: 'LAB-2024-0890',
      name: 'Specimen Sample',
      serviceLocation: 'Reference Lab',
      serviceType: 'laboratory',
      dateOfService: '2024-01-22',
      referringProvider: 'Quest Diagnostics',
      coverageStatus: 'verified',
      chargeCapture: 285.00,
      encounterStatus: 'resulted',
      posCode: '81'
    }
  ];

  const getServiceIcon = (type: string) => {
    switch(type) {
      case 'laboratory':
        return <TestTube className="w-4 h-4 text-blue-500" />;
      case 'clinic':
        return <Activity className="w-4 h-4 text-green-500" />;
      case 'facility':
        return <Building2 className="w-4 h-4 text-purple-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      pending_review: 'bg-yellow-100 text-yellow-800',
      resulted: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    );
  };

  const filteredRecipients = serviceRecipients.filter(recipient => {
    const matchesSearch = recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          recipient.identifier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = serviceTypeFilter === 'all' || recipient.serviceType === serviceTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or specimen number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Service Types</option>
            <option value="laboratory">Laboratory</option>
            <option value="clinic">Clinic</option>
            <option value="facility">Facility</option>
          </select>
          
          <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2 text-gray-600" />
            More Filters
          </button>
        </div>
      </div>

      {/* Service Recipients Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Identifier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name / Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                POS Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Referring Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coverage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Encounter Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Charge Capture
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRecipients.map((recipient) => (
              <tr key={recipient.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getServiceIcon(recipient.serviceType)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {recipient.identifier}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {recipient.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        DOS: {recipient.dateOfService}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                    {recipient.serviceLocation}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-600">
                    {recipient.posCode}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {recipient.referringProvider}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Shield className={`w-4 h-4 mr-1 ${
                      recipient.coverageStatus === 'verified' ? 'text-green-500' : 'text-yellow-500'
                    }`} />
                    <span className="text-sm text-gray-900">
                      {recipient.coverageStatus}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(recipient.encounterStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    ${recipient.chargeCapture.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Recipients</p>
              <p className="text-2xl font-semibold text-gray-900">{serviceRecipients.length}</p>
            </div>
            <User className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Coverage Verified</p>
              <p className="text-2xl font-semibold text-green-600">
                {serviceRecipients.filter(r => r.coverageStatus === 'verified').length}
              </p>
            </div>
            <Shield className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {serviceRecipients.filter(r => r.encounterStatus === 'pending_review').length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Charges</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${serviceRecipients.reduce((sum, r) => sum + r.chargeCapture, 0).toFixed(2)}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDirectory;