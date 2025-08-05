import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Calendar,
  TrendingUp,
  Filter,
  Download,
  Grid,
  List,
  ChevronDown,
  Building
} from 'lucide-react';

interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  patientCount?: number;
  lastActivity?: string;
}

interface Client {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'lab' | 'practice';
  status: 'active' | 'inactive' | 'pending';
  clinics: Clinic[];
  totalPatients: number;
  monthlyRevenue: number;
  lastActivity: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

const ModernClientsAndClinics: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - replace with your actual data
  const clients: Client[] = [
    {
      id: '1',
      name: 'Carepoint Medical',
      type: 'hospital',
      status: 'active',
      totalPatients: 2450,
      monthlyRevenue: 125000,
      lastActivity: '2 hours ago',
      contactPerson: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@carepoint.com',
      phone: '+1 (555) 123-4567',
      clinics: [
        { id: '1-1', name: 'Carepoint North', address: '123 North St', patientCount: 850, lastActivity: '1 day ago' }
      ]
    },
    {
      id: '2',
      name: 'City Medical Center',
      type: 'hospital',
      status: 'active',
      totalPatients: 3200,
      monthlyRevenue: 185000,
      lastActivity: '1 day ago',
      contactPerson: 'Michael Chen',
      email: 'mchen@citymedical.com',
      phone: '+1 (555) 987-6543',
      clinics: [
        { id: '2-1', name: 'North Wing', address: '456 Medical Blvd', patientCount: 1200, lastActivity: '3 hours ago' }
      ]
    },
    {
      id: '3',
      name: 'Memorial Hospital',
      type: 'hospital',
      status: 'active',
      totalPatients: 4100,
      monthlyRevenue: 220000,
      lastActivity: '3 hours ago',
      contactPerson: 'Dr. Emily Rodriguez',
      email: 'erodriguez@memorial.com',
      phone: '+1 (555) 456-7890',
      clinics: [
        { id: '3-1', name: 'Main Campus', address: '789 Hospital Way', patientCount: 1800, lastActivity: '2 hours ago' }
      ]
    },
    {
      id: '4',
      name: 'Riverbend Labs',
      type: 'lab',
      status: 'active',
      totalPatients: 1200,
      monthlyRevenue: 75000,
      lastActivity: '5 hours ago',
      contactPerson: 'Lisa Thompson',
      email: 'lthompson@riverbend.com',
      phone: '+1 (555) 321-0987',
      clinics: [
        { id: '4-1', name: 'Riverbend Labs - East', address: '321 Lab Drive', patientCount: 600, lastActivity: '4 hours ago' }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hospital': return <Building2 className="w-5 h-5" />;
      case 'clinic': return <Building className="w-5 h-5" />;
      case 'lab': return <Building className="w-5 h-5" />;
      default: return <Building2 className="w-5 h-5" />;
    }
  };

  const ClientCard = ({ client }: { client: Client }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 overflow-hidden group">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              {getTypeIcon(client.type)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                  {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                </span>
                <span className="text-xs text-gray-500 capitalize">{client.type}</span>
              </div>
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{client.totalPatients.toLocaleString()}</div>
            <div className="text-xs text-gray-600">Patients</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">${(client.monthlyRevenue / 1000).toFixed(0)}k</div>
            <div className="text-xs text-gray-600">Monthly Rev.</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-blue-600">{client.clinics.length}</div>
            <div className="text-xs text-gray-600">Clinics</div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          {client.contactPerson && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{client.contactPerson}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Clinics Section */}
      <div className="border-t border-gray-100 p-6 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Clinics</h4>
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center">
            <Plus className="w-3 h-3 mr-1" />
            Add Clinic
          </button>
        </div>
        <div className="space-y-2">
          {client.clinics.map((clinic) => (
            <div key={clinic.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">{clinic.name}</div>
                {clinic.address && (
                  <div className="text-xs text-gray-600 flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {clinic.address}
                  </div>
                )}
                {clinic.patientCount && (
                  <div className="text-xs text-gray-600 mt-1">
                    {clinic.patientCount} patients • Last activity: {clinic.lastActivity}
                  </div>
                )}
              </div>
              <div className="flex space-x-1 ml-3">
                <button className="p-1 hover:bg-white rounded text-gray-600 hover:text-gray-900">
                  <Edit3 className="w-3 h-3" />
                </button>
                <button className="p-1 hover:bg-white rounded text-red-600 hover:text-red-700">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            Last activity: {client.lastActivity}
          </div>
          <div className="flex space-x-2">
            <button className="text-xs text-gray-600 hover:text-gray-900 font-medium">
              View Details
            </button>
            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Manage
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clients & Clinics</h1>
              <p className="text-gray-600 mt-1">Manage your healthcare partners and their facilities</p>
            </div>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Add New Client
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search clients, clinics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Filter Dropdown */}
              <div className="relative">
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
              </div>

              {/* Export */}
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>

              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-4 gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{clients.length}</div>
              <div className="text-sm text-gray-600">Total Clients</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{clients.reduce((acc, client) => acc + client.clinics.length, 0)}</div>
              <div className="text-sm text-gray-600">Active Clinics</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{clients.reduce((acc, client) => acc + client.totalPatients, 0).toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Patients</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">${(clients.reduce((acc, client) => acc + client.monthlyRevenue, 0) / 1000).toFixed(0)}k</div>
              <div className="text-sm text-gray-600">Monthly Revenue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clinics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mr-3">
                          {getTypeIcon(client.type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          {client.contactPerson && (
                            <div className="text-sm text-gray-500">{client.contactPerson}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{client.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.clinics.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.totalPatients.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(client.monthlyRevenue / 1000).toFixed(0)}k
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.lastActivity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernClientsAndClinics;
