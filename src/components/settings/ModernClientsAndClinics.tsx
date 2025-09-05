import React, { useState, useEffect } from 'react';
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
  Building,
  Link2,
  X
} from 'lucide-react';
import { getClients, updateClientParent } from '../../api/services/client.service';
import { Client } from '../../types';

interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  patientCount?: number;
  lastActivity?: string;
}

const ModernClientsAndClinics: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const paginatedResponse = await getClients({ page: 1, limit: 100 }); // Fetching up to 100 clients
        setClients(paginatedResponse.data);
      } catch (error) {
        console.error("Failed to fetch clients:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const openModal = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedClient(null);
    setIsModalOpen(false);
  };

  const setParent = async (childId: string, parentId: string | null) => {
    try {
      const updatedClient = await updateClientParent(childId, parentId);
      setClients(clients.map(c => c.id === childId ? updatedClient : c));
      closeModal();
    } catch (error) {
      console.error("Failed to update client parent:", error);
    }
  };

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

  const ParentSelectorModal = () => {
    if (!isModalOpen || !selectedClient) return null;

    const availableParents = clients.filter(c => c.id !== selectedClient.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Set Parent for {selectedClient.name}</h2>
            <button onClick={closeModal} className="p-1 hover:bg-gray-200 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mb-4">
            <label htmlFor="parent-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Parent Client
            </label>
            <select
              id="parent-select"
              className="w-full p-2 border border-gray-300 rounded-lg"
              onChange={(e) => setParent(selectedClient.id, e.target.value || null)}
              defaultValue={selectedClient.parentId || ""}
            >
              <option value="">None</option>
              {availableParents.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ClientCard = ({ client }: { client: Client }) => {
    const parent = client.parentId ? clients.find(c => c.id === client.parentId) : null;
    return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 overflow-hidden group">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              {getTypeIcon(client.type || 'hospital')}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status || 'active')}`}>
                  {client.status ? client.status.charAt(0).toUpperCase() + client.status.slice(1) : 'Active'}
                </span>
                <span className="text-xs text-gray-500 capitalize">{client.type || 'Hospital'}</span>
              </div>
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Parent Info */}
        {parent && (
          <div className="mb-4 p-2 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-center">
            <Link2 className="w-4 h-4 mr-2" />
            Parent: <span className="font-semibold ml-1">{parent.name}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{(client.totalPatients || 0).toLocaleString()}</div>
            <div className="text-xs text-gray-600">Patients</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">${((client.monthlyRevenue || 0) / 1000).toFixed(0)}k</div>
            <div className="text-xs text-gray-600">Monthly Rev.</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-blue-600">{client.clinics?.length || 0}</div>
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
          {client.clinics?.map((clinic) => (
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
            <button onClick={() => openModal(client)} className="text-xs text-gray-600 hover:text-gray-900 font-medium">
              Set Parent
            </button>
            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Manage
            </button>
          </div>
        </div>
      </div>
    </div>
  )};

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ParentSelectorModal />
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
              <div className="text-2xl font-bold text-gray-900">{clients.reduce((acc, client) => acc + (client.clinics?.length || 0), 0)}</div>
              <div className="text-sm text-gray-600">Active Clinics</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{clients.reduce((acc, client) => acc + (client.totalPatients || 0), 0).toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Patients</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">${(clients.reduce((acc, client) => acc + (client.monthlyRevenue || 0), 0) / 1000).toFixed(0)}k</div>
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
                          {getTypeIcon(client.type || 'hospital')}
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
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status || 'active')}`}>
                          {client.status ? client.status.charAt(0).toUpperCase() + client.status.slice(1) : 'Active'}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{client.type || 'Hospital'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.clinics?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(client.totalPatients || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${((client.monthlyRevenue || 0) / 1000).toFixed(0)}k
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.lastActivity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openModal(client)} className="text-gray-600 hover:text-gray-900 mr-3">
                        <Link2 className="w-4 h-4" />
                      </button>
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
