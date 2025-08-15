import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Building2, 
  Users, 
  DollarSign, 
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  TrendingUp,
  Clock
} from 'lucide-react';
import { supabase } from '../api/supabase';
import Modal from '../components/Modal';
import { useNotifications } from '../context/NotificationContext';

interface Lab {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  contact_person: string;
  status: 'active' | 'inactive' | 'suspended';
  daily_volume_target: number;
  processing_type: 'standard' | 'pgx' | 'both';
  medicare_provider_number?: string;
  clia_number?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

interface LabStats {
  labId: string;
  totalInvoices: number;
  totalRevenue: number;
  avgDailyVolume: number;
  pendingInvoices: number;
  overdueAmount: number;
  lastActivityDate: string;
}

const Labs: React.FC = () => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [labStats, setLabStats] = useState<Record<string, LabStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { addNotification } = useNotifications();

  const [formData, setFormData] = useState<Partial<Lab>>({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    contact_person: '',
    status: 'active',
    daily_volume_target: 100,
    processing_type: 'standard',
    medicare_provider_number: '',
    clia_number: ''
  });

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    try {
      setIsLoading(true);
      
      // For now, we'll fetch unique clients as "labs" since labs table doesn't exist yet
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;

      // Transform clients to lab format
      const labsData: Lab[] = clients?.map((client, index) => ({
        id: client.id,
        name: client.name,
        code: `LAB${String(index + 1).padStart(3, '0')}`,
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zip: client.zip_code || '',
        phone: client.phone || '',
        email: client.email || '',
        contact_person: client.contact_person || '',
        status: 'active' as const,
        daily_volume_target: 100,
        processing_type: 'standard' as const,
        medicare_provider_number: '',
        clia_number: '',
        created_at: client.created_at,
        updated_at: client.updated_at,
        organization_id: client.organization_id
      })) || [];

      setLabs(labsData);

      // Fetch stats for each lab
      const statsPromises = labsData.map(lab => fetchLabStats(lab.id));
      const stats = await Promise.all(statsPromises);
      const statsMap: Record<string, LabStats> = {};
      stats.forEach((stat, index) => {
        if (stat) statsMap[labsData[index].id] = stat;
      });
      setLabStats(statsMap);

    } catch (error) {
      console.error('Error fetching labs:', error);
      addNotification({
        type: 'error',
        message: 'Failed to fetch labs'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLabStats = async (labId: string): Promise<LabStats | null> => {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', labId);

      if (error) throw error;

      const totalInvoices = invoices?.length || 0;
      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
      const pendingInvoices = invoices?.filter(inv => inv.status === 'sent').length || 0;
      const overdueAmount = invoices
        ?.filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

      // Calculate average daily volume (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentInvoices = invoices?.filter(inv => 
        new Date(inv.created_at) > thirtyDaysAgo
      ) || [];
      const avgDailyVolume = recentInvoices.length / 30;

      const lastActivityDate = invoices && invoices.length > 0
        ? invoices.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0].created_at
        : new Date().toISOString();

      return {
        labId,
        totalInvoices,
        totalRevenue,
        avgDailyVolume,
        pendingInvoices,
        overdueAmount,
        lastActivityDate
      };
    } catch (error) {
      console.error('Error fetching lab stats:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingLab) {
        // Update existing lab (client)
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zip,
            phone: formData.phone,
            email: formData.email,
            contact_person: formData.contact_person,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLab.id);

        if (error) throw error;

        addNotification({
          type: 'success',
          message: 'Lab updated successfully'
        });
      } else {
        // Create new lab (client)
        const { error } = await supabase
          .from('clients')
          .insert({
            name: formData.name,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zip,
            phone: formData.phone,
            email: formData.email,
            contact_person: formData.contact_person,
            status: 'active'
          });

        if (error) throw error;

        addNotification({
          type: 'success',
          message: 'Lab created successfully'
        });
      }

      setShowModal(false);
      setEditingLab(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        email: '',
        contact_person: '',
        status: 'active',
        daily_volume_target: 100,
        processing_type: 'standard',
        medicare_provider_number: '',
        clia_number: ''
      });
      fetchLabs();
    } catch (error) {
      console.error('Error saving lab:', error);
      addNotification({
        type: 'error',
        message: 'Failed to save lab'
      });
    }
  };

  const handleEdit = (lab: Lab) => {
    setEditingLab(lab);
    setFormData(lab);
    setShowModal(true);
  };

  const handleDelete = async (labId: string) => {
    if (!confirm('Are you sure you want to delete this lab?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', labId);

      if (error) throw error;

      addNotification({
        type: 'success',
        message: 'Lab deleted successfully'
      });
      fetchLabs();
    } catch (error) {
      console.error('Error deleting lab:', error);
      addNotification({
        type: 'error',
        message: 'Failed to delete lab'
      });
    }
  };

  const filteredLabs = labs.filter(lab =>
    lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lab Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage {labs.length} active labs processing {Object.values(labStats).reduce((sum, stat) => sum + stat.avgDailyVolume, 0).toFixed(0)} samples daily
            </p>
          </div>
          <button
            onClick={() => {
              setEditingLab(null);
              setFormData({
                name: '',
                code: '',
                address: '',
                city: '',
                state: '',
                zip: '',
                phone: '',
                email: '',
                contact_person: '',
                status: 'active',
                daily_volume_target: 100,
                processing_type: 'standard',
                medicare_provider_number: '',
                clia_number: ''
              });
              setShowModal(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Lab
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search labs by name, code, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Labs</p>
              <p className="text-2xl font-bold text-gray-900">{labs.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Labs</p>
              <p className="text-2xl font-bold text-green-600">
                {labs.filter(l => l.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(Object.values(labStats).reduce((sum, stat) => sum + stat.totalRevenue, 0))}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Daily Volume</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(labStats).reduce((sum, stat) => sum + stat.avgDailyVolume, 0).toFixed(0)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Labs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lab Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLabs.map((lab) => {
              const stats = labStats[lab.id];
              return (
                <tr key={lab.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{lab.name}</div>
                      <div className="text-sm text-gray-500">{lab.code}</div>
                      {lab.contact_person && (
                        <div className="text-xs text-gray-400 flex items-center mt-1">
                          <Users className="h-3 w-3 mr-1" />
                          {lab.contact_person}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lab.city}, {lab.state}</div>
                    <div className="text-sm text-gray-500">{lab.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-1 text-gray-400" />
                        {stats?.totalInvoices || 0} invoices
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {stats?.avgDailyVolume.toFixed(1) || 0}/day
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(stats?.totalRevenue || 0)}
                    </div>
                    {stats?.overdueAmount && stats.overdueAmount > 0 && (
                      <div className="text-xs text-red-600 flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {formatCurrency(stats.overdueAmount)} overdue
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      lab.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : lab.status === 'suspended'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {lab.status}
                    </span>
                    {stats?.lastActivityDate && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(stats.lastActivityDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(lab)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(lab.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingLab(null);
        }}
        title={editingLab ? 'Edit Lab' : 'Add New Lab'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Lab Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lab Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="LAB001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ZIP</label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Person</label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Lab['status'] })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Processing Type</label>
              <select
                value={formData.processing_type}
                onChange={(e) => setFormData({ ...formData, processing_type: e.target.value as Lab['processing_type'] })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="standard">Standard</option>
                <option value="pgx">PGX Only</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Daily Volume Target</label>
              <input
                type="number"
                value={formData.daily_volume_target}
                onChange={(e) => setFormData({ ...formData, daily_volume_target: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Medicare Provider #</label>
              <input
                type="text"
                value={formData.medicare_provider_number}
                onChange={(e) => setFormData({ ...formData, medicare_provider_number: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CLIA #</label>
              <input
                type="text"
                value={formData.clia_number}
                onChange={(e) => setFormData({ ...formData, clia_number: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingLab(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {editingLab ? 'Update Lab' : 'Create Lab'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Labs;