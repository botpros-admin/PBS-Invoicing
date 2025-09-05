import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Plus,
  Search,
  ChevronDown,
  User,
  Calendar,
  DollarSign,
  FileText,
  Send,
  Paperclip,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Loader2,
  Eye,
  Edit2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  DisputeService,
  Dispute,
  DisputeMessage,
  DisputeStatus,
  DisputePriority,
  DisputeCategory,
  DisputeStats
} from '../../services/disputes/DisputeService';
import { useTenant } from '../../context/TenantContext';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

interface CreateDisputeForm {
  invoice_id?: string;
  invoice_item_id?: string;
  client_id?: string;
  disputed_amount: number;
  reason_category: DisputeCategory;
  reason_details: string;
  priority: DisputePriority;
}

export const DisputeTicketingSystem: React.FC = () => {
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '' as DisputeStatus | '',
    priority: '' as DisputePriority | '',
    assigned_to_me: false
  });
  const [sortBy, setSortBy] = useState<'created_at' | 'priority' | 'disputed_amount'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [createForm, setCreateForm] = useState<CreateDisputeForm>({
    disputed_amount: 0,
    reason_category: 'other',
    reason_details: '',
    priority: 'normal'
  });

  const service = useMemo(
    () => currentOrganization ? new DisputeService(currentOrganization.id) : null,
    [currentOrganization]
  );

  useEffect(() => {
    if (service) {
      loadDisputes();
      loadStats();
    }
  }, [service, filters, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    if (selectedDispute && service) {
      loadMessages(selectedDispute.id);
    }
  }, [selectedDispute, service]);

  const loadDisputes = async () => {
    if (!service) return;

    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder
      };

      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assigned_to_me && user) params.assigned_to = user.id;

      const result = await service.getDisputes(params);
      setDisputes(result.data);
    } catch (error) {
      console.error('Failed to load disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!service) return;

    try {
      const statsData = await service.getDisputeStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadMessages = async (disputeId: string) => {
    if (!service) return;

    setMessageLoading(true);
    try {
      const msgs = await service.getMessages(disputeId);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setMessageLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!service || !user) return;

    try {
      const dispute = await service.createDispute({
        ...createForm,
        created_by: user.id
      });
      
      setShowCreateForm(false);
      setCreateForm({
        disputed_amount: 0,
        reason_category: 'other',
        reason_details: '',
        priority: 'normal'
      });
      
      loadDisputes();
      loadStats();
      
      alert('Dispute ticket created successfully');
    } catch (error) {
      console.error('Failed to create dispute:', error);
      alert('Failed to create dispute ticket');
    }
  };

  const handleSendMessage = async () => {
    if (!service || !selectedDispute || !user || !newMessage.trim()) return;

    try {
      await service.addMessage(selectedDispute.id, user.id, newMessage);
      setNewMessage('');
      loadMessages(selectedDispute.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleUpdateStatus = async (disputeId: string, status: DisputeStatus) => {
    if (!service) return;

    try {
      const resolution = status === 'resolved' || status === 'rejected'
        ? prompt('Enter resolution details:')
        : undefined;

      await service.updateDisputeStatus(disputeId, status, resolution || undefined);
      loadDisputes();
      loadStats();
      
      if (selectedDispute?.id === disputeId) {
        setSelectedDispute(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update dispute status');
    }
  };

  const handleAssignDispute = async (disputeId: string) => {
    if (!service || !user) return;

    try {
      await service.assignDispute(disputeId, user.id);
      loadDisputes();
      alert('Dispute assigned to you');
    } catch (error) {
      console.error('Failed to assign dispute:', error);
      alert('Failed to assign dispute');
    }
  };

  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'in_review': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'escalated': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityIcon = (priority: DisputePriority) => {
    switch (priority) {
      case 'urgent': return <ArrowUp className="h-4 w-4 text-red-500" />;
      case 'high': return <ArrowUp className="h-4 w-4 text-orange-500" />;
      case 'normal': return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
      case 'low': return <ArrowDown className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Dispute List */}
      <div className="w-1/3 border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Dispute Tickets</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Dispute
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
                <p className="text-xs text-gray-500">Open</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.in_review}</p>
                <p className="text-xs text-gray-500">In Review</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                <p className="text-xs text-gray-500">Resolved</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as DisputeStatus | '' }))}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_review">In Review</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
                <option value="escalated">Escalated</option>
              </select>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as DisputePriority | '' }))}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
              >
                <option value="">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={filters.assigned_to_me}
                onChange={(e) => setFilters(prev => ({ ...prev, assigned_to_me: e.target.checked }))}
                className="mr-2"
              />
              Assigned to me
            </label>
          </div>
        </div>

        {/* Dispute List */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 220px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  onClick={() => setSelectedDispute(dispute)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedDispute?.id === dispute.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      {getPriorityIcon(dispute.priority)}
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {dispute.dispute_number}
                      </span>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(dispute.status)}`}>
                      {dispute.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1 line-clamp-2">
                    {dispute.reason_details}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatCurrency(dispute.disputed_amount)}</span>
                    <span>{new Date(dispute.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Dispute Details */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedDispute ? (
          <>
            {/* Dispute Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedDispute.dispute_number}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Created {new Date(selectedDispute.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedDispute.status)}`}>
                    {selectedDispute.status}
                  </span>
                  {selectedDispute.status === 'open' && (
                    <button
                      onClick={() => handleAssignDispute(selectedDispute.id)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                    >
                      Assign to Me
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Disputed Amount</p>
                  <p className="text-lg font-medium text-gray-900">
                    {formatCurrency(selectedDispute.disputed_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedDispute.reason_category}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Priority</p>
                  <div className="flex items-center">
                    {getPriorityIcon(selectedDispute.priority)}
                    <span className="ml-1 text-sm font-medium text-gray-900">
                      {selectedDispute.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Reason</p>
                <p className="text-sm text-gray-600">{selectedDispute.reason_details}</p>
              </div>

              {/* Status Actions */}
              {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'rejected' && (
                <div className="flex gap-2 mt-4">
                  {selectedDispute.status === 'open' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedDispute.id, 'in_review')}
                      className="px-3 py-1 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200"
                    >
                      Start Review
                    </button>
                  )}
                  {selectedDispute.status === 'in_review' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedDispute.id, 'resolved')}
                        className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedDispute.id, 'rejected')}
                        className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedDispute.id, 'escalated')}
                        className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200"
                      >
                        Escalate
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messageLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {message.user?.name || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{message.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a dispute to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Dispute Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Dispute Ticket</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disputed Amount
                </label>
                <input
                  type="number"
                  value={createForm.disputed_amount}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, disputed_amount: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={createForm.reason_category}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, reason_category: e.target.value as DisputeCategory }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="pricing">Pricing</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="invalid_cpt">Invalid CPT</option>
                  <option value="patient_info">Patient Info</option>
                  <option value="coverage">Coverage</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, priority: e.target.value as DisputePriority }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason Details
                </label>
                <textarea
                  value={createForm.reason_details}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, reason_details: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Describe the dispute..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDispute}
                disabled={!createForm.reason_details || createForm.disputed_amount <= 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeTicketingSystem;