import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MessageSquare,
  Clock,
  Check,
  X,
  FileText,
  User,
  Calendar,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
  Reply,
  DollarSign,
  Building,
  Tag,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useNotifications } from '../../context/NotificationContext';
import { useTenant } from '../../context/TenantContext';
import { auditLogger } from '../../utils/security/auditLogger';

interface Dispute {
  id: string;
  invoice_id: string;
  invoice_number: string;
  line_item_id?: string;
  clinic_id: string;
  clinic_name: string;
  patient_name?: string;
  accession_number?: string;
  cpt_code?: string;
  amount: number;
  reason: string;
  status: 'open' | 'under_review' | 'resolved' | 'rejected' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  created_by: string;
  assigned_to?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution?: string;
  messages?: DisputeMessage[];
  source: 'internal' | 'portal';
}

interface DisputeMessage {
  id: string;
  dispute_id: string;
  message: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'admin' | 'clinic';
  created_at: string;
  attachments?: string[];
}

interface DisputeStats {
  total_open: number;
  total_under_review: number;
  total_resolved: number;
  total_amount_disputed: number;
  average_resolution_time: number;
  disputes_by_reason: Record<string, number>;
}

const DisputeManagement: React.FC = () => {
  const { addNotification } = useNotifications();
  const { currentTenant } = useTenant();
  
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [stats, setStats] = useState<DisputeStats>({
    total_open: 0,
    total_under_review: 0,
    total_resolved: 0,
    total_amount_disputed: 0,
    average_resolution_time: 0,
    disputes_by_reason: {}
  });
  
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'under_review' | 'resolved'>('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDisputes, setExpandedDisputes] = useState<Set<string>>(new Set());
  const [showResponseModal, setShowResponseModal] = useState(false);
  
  // Response form
  const [responseForm, setResponseForm] = useState({
    message: '',
    resolution_action: 'under_review' as 'under_review' | 'resolved' | 'rejected',
    credit_amount: 0,
    re_invoice: false
  });

  // Common dispute reasons for quick selection
  const disputeReasons = [
    'Incorrect CPT code',
    'Duplicate charge',
    'Service not rendered',
    'Incorrect price',
    'Patient not found',
    'Insurance already paid',
    'Wrong date of service',
    'Incorrect quantity',
    'Clinical documentation missing',
    'Other'
  ];

  useEffect(() => {
    if (currentTenant?.id) {
      fetchDisputes();
      fetchStats();
    }
  }, [currentTenant, filter]);

  const fetchDisputes = async () => {
    if (!currentTenant?.id) return;

    try {
      setLoading(true);

      let query = supabase
        .from('disputes')
        .select(`
          *,
          invoices(invoice_number),
          clients!fk_invoices_client(name),
          invoice_line_items(
            patient_first_name,
            patient_last_name,
            accession_number,
            cpt_code,
            total_price
          ),
          dispute_messages(
            id,
            message,
            sender_id,
            sender_type,
            created_at,
            users(name)
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        if (filter === 'open') {
          query = query.in('status', ['open', 'under_review']);
        } else {
          query = query.eq('status', filter);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedDisputes = data?.map(dispute => ({
        ...dispute,
        invoice_number: dispute.invoices?.invoice_number || '',
        clinic_name: dispute.clients?.name || '',
        patient_name: dispute.invoice_line_items ? 
          `${dispute.invoice_line_items.patient_first_name} ${dispute.invoice_line_items.patient_last_name}` : '',
        accession_number: dispute.invoice_line_items?.accession_number || '',
        cpt_code: dispute.invoice_line_items?.cpt_code || '',
        amount: dispute.invoice_line_items?.total_price || dispute.amount,
        messages: dispute.dispute_messages || []
      })) || [];

      setDisputes(formattedDisputes);

      // Log access
      await auditLogger.log({
        action: 'view',
        resource_type: 'dispute',
        description: 'Viewed dispute management dashboard'
      });

    } catch (error) {
      console.error('Error fetching disputes:', error);
      addNotification('error', 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_dispute_stats', {
        p_tenant_id: currentTenant.id
      });

      if (error) throw error;
      if (data) setStats(data);

    } catch (error) {
      console.error('Error fetching dispute stats:', error);
    }
  };

  const handleRespond = async () => {
    if (!selectedDispute || !responseForm.message) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Add message to dispute
      const { error: messageError } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: selectedDispute.id,
          message: responseForm.message,
          sender_id: user?.id,
          sender_type: 'admin'
        });

      if (messageError) throw messageError;

      // Update dispute status
      const updateData: any = {
        status: responseForm.resolution_action,
        assigned_to: user?.id
      };

      if (responseForm.resolution_action === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
        updateData.resolution = responseForm.message;
      }

      const { error: updateError } = await supabase
        .from('disputes')
        .update(updateData)
        .eq('id', selectedDispute.id);

      if (updateError) throw updateError;

      // Handle credit if applicable
      if (responseForm.resolution_action === 'resolved' && responseForm.credit_amount > 0) {
        const { error: creditError } = await supabase
          .from('credits')
          .insert({
            clinic_id: selectedDispute.clinic_id,
            amount: responseForm.credit_amount,
            original_amount: responseForm.credit_amount,
            reason: `Dispute resolution: ${selectedDispute.reason}`,
            source_type: 'adjustment',
            dispute_id: selectedDispute.id,
            tenant_id: currentTenant?.id,
            created_by: user?.id,
            status: 'available'
          });

        if (creditError) throw creditError;
      }

      // Handle re-invoicing if needed
      if (responseForm.re_invoice && selectedDispute.line_item_id) {
        // Mark the disputed line item for re-invoicing
        const { error: reInvoiceError } = await supabase
          .from('invoice_line_items')
          .update({ 
            needs_reinvoice: true,
            dispute_resolved: true 
          })
          .eq('id', selectedDispute.line_item_id);

        if (reInvoiceError) throw reInvoiceError;
      }

      // Log the response
      await auditLogger.log({
        action: 'update',
        resource_type: 'dispute',
        resource_id: selectedDispute.id,
        description: `Responded to dispute: ${responseForm.resolution_action}`,
        metadata: responseForm
      });

      addNotification('success', 'Dispute response sent successfully');
      setShowResponseModal(false);
      setResponseForm({
        message: '',
        resolution_action: 'under_review',
        credit_amount: 0,
        re_invoice: false
      });
      setSelectedDispute(null);
      fetchDisputes();
      fetchStats();

    } catch (error) {
      console.error('Error responding to dispute:', error);
      addNotification('error', 'Failed to send response');
    }
  };

  const toggleDispute = (disputeId: string) => {
    const newExpanded = new Set(expandedDisputes);
    if (newExpanded.has(disputeId)) {
      newExpanded.delete(disputeId);
    } else {
      newExpanded.add(disputeId);
    }
    setExpandedDisputes(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusIcon = (status: Dispute['status']) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'under_review':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: Dispute['status']) => {
    const badges: Record<string, string> = {
      open: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority: Dispute['priority']) => {
    const badges: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[priority]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const filteredDisputes = disputes.filter(dispute =>
    dispute.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.clinic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.accession_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dispute Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage and resolve payment disputes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.total_open}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Under Review</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total_under_review}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.total_resolved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Disputed</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.total_amount_disputed)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Resolution</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.average_resolution_time} days
              </p>
            </div>
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search disputes..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-80"
            />
          </div>
          
          <div className="flex space-x-2">
            {(['all', 'open', 'under_review', 'resolved'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Disputes List */}
      <div className="bg-white rounded-lg shadow">
        {filteredDisputes.map(dispute => (
          <div key={dispute.id} className="border-b last:border-0">
            {/* Dispute Header */}
            <div
              className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => toggleDispute(dispute.id)}
            >
              <div className="flex items-center space-x-3">
                <button className="p-1">
                  {expandedDisputes.has(dispute.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {getStatusIcon(dispute.status)}
                <div>
                  <div className="flex items-center space-x-3">
                    <p className="font-medium text-gray-900">
                      Invoice #{dispute.invoice_number}
                    </p>
                    {getStatusBadge(dispute.status)}
                    {getPriorityBadge(dispute.priority)}
                    {dispute.source === 'portal' && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                        Portal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Building className="h-3 w-3" />
                      <span>{dispute.clinic_name}</span>
                    </span>
                    {dispute.patient_name && (
                      <span className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{dispute.patient_name}</span>
                      </span>
                    )}
                    {dispute.cpt_code && (
                      <span className="flex items-center space-x-1">
                        <Tag className="h-3 w-3" />
                        <span>{dispute.cpt_code}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(dispute.amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(dispute.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDispute(dispute);
                    setShowResponseModal(true);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                >
                  <Reply className="h-4 w-4" />
                  <span>Respond</span>
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedDisputes.has(dispute.id) && (
              <div className="bg-gray-50 px-6 py-4 border-t">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Dispute Reason</p>
                    <p className="text-sm text-gray-900 mt-1">{dispute.reason}</p>
                  </div>
                  {dispute.accession_number && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Accession Number</p>
                      <p className="text-sm text-gray-900 mt-1">{dispute.accession_number}</p>
                    </div>
                  )}
                </div>

                {/* Messages */}
                {dispute.messages && dispute.messages.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Communication History</h4>
                    <div className="space-y-2">
                      {dispute.messages.map(message => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.sender_type === 'admin'
                              ? 'bg-blue-50 ml-8'
                              : 'bg-white border border-gray-200 mr-8'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-gray-700">
                              {message.sender_name} ({message.sender_type})
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-900">{message.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dispute.resolution && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Resolution</p>
                    <p className="text-sm text-green-700 mt-1">{dispute.resolution}</p>
                    {dispute.resolved_at && (
                      <p className="text-xs text-green-600 mt-2">
                        Resolved on {new Date(dispute.resolved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredDisputes.length === 0 && !loading && (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No disputes found</p>
          </div>
        )}
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px]">
            <h3 className="text-lg font-semibold mb-4">Respond to Dispute</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Invoice:</strong> #{selectedDispute.invoice_number}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Clinic:</strong> {selectedDispute.clinic_name}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Amount:</strong> {formatCurrency(selectedDispute.amount)}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Reason:</strong> {selectedDispute.reason}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Response Message *
                </label>
                <textarea
                  value={responseForm.message}
                  onChange={(e) => setResponseForm({ ...responseForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={4}
                  placeholder="Enter your response to the dispute..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action *
                </label>
                <select
                  value={responseForm.resolution_action}
                  onChange={(e) => setResponseForm({ 
                    ...responseForm, 
                    resolution_action: e.target.value as any 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="under_review">Mark as Under Review</option>
                  <option value="resolved">Resolve Dispute</option>
                  <option value="rejected">Reject Dispute</option>
                </select>
              </div>

              {responseForm.resolution_action === 'resolved' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit Amount (if applicable)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={responseForm.credit_amount}
                      onChange={(e) => setResponseForm({ 
                        ...responseForm, 
                        credit_amount: parseFloat(e.target.value) || 0 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>

                  {selectedDispute.line_item_id && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="re_invoice"
                        checked={responseForm.re_invoice}
                        onChange={(e) => setResponseForm({ 
                          ...responseForm, 
                          re_invoice: e.target.checked 
                        })}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor="re_invoice" className="ml-2 text-sm text-gray-700">
                        Re-invoice this line item after resolution
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedDispute(null);
                  setResponseForm({
                    message: '',
                    resolution_action: 'under_review',
                    credit_amount: 0,
                    re_invoice: false
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={!responseForm.message}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Send Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeManagement;