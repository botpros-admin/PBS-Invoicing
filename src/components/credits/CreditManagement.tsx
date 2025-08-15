import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  RefreshCw,
  History,
  AlertCircle,
  Check,
  X,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useNotifications } from '../../context/NotificationContext';
import { useTenant } from '../../context/TenantContext';
import { auditLogger } from '../../utils/security/auditLogger';

interface Credit {
  id: string;
  clinic_id: string;
  clinic_name: string;
  amount: number;
  original_amount: number;
  reason: string;
  source_type: 'overpayment' | 'refund' | 'adjustment' | 'manual';
  source_payment_id?: string;
  status: 'available' | 'partial' | 'applied' | 'expired';
  created_at: string;
  created_by: string;
  applied_at?: string;
  expires_at?: string;
  notes?: string;
  applications?: CreditApplication[];
}

interface CreditApplication {
  id: string;
  credit_id: string;
  invoice_id: string;
  invoice_number: string;
  line_item_id?: string;
  amount: number;
  applied_at: string;
  applied_by: string;
  auto_applied: boolean;
}

interface CreditBalance {
  clinic_id: string;
  clinic_name: string;
  total_credits: number;
  available_credits: number;
  pending_applications: number;
}

const CreditManagement: React.FC = () => {
  const { addNotification } = useNotifications();
  const { currentTenant } = useTenant();
  
  const [credits, setCredits] = useState<Credit[]>([]);
  const [creditBalances, setCreditBalances] = useState<CreditBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'applied'>('all');
  
  // Form state for creating credits
  const [creditForm, setCreditForm] = useState({
    clinic_id: '',
    amount: 0,
    reason: '',
    source_type: 'manual' as Credit['source_type'],
    notes: '',
    expires_at: ''
  });

  useEffect(() => {
    if (currentTenant?.id) {
      fetchCredits();
      fetchCreditBalances();
    }
  }, [currentTenant, filter]);

  const fetchCredits = async () => {
    if (!currentTenant?.id) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('credits')
        .select(`
          *,
          clients!clinic_id(name),
          credit_applications(
            id,
            invoice_id,
            line_item_id,
            amount,
            applied_at,
            invoices(invoice_number)
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedCredits = data?.map(credit => ({
        ...credit,
        clinic_name: credit.clients?.name || 'Unknown',
        applications: credit.credit_applications || []
      })) || [];

      setCredits(formattedCredits);

      // Log access
      await auditLogger.log({
        action: 'view',
        resource_type: 'credit',
        description: `Viewed credit management dashboard`
      });

    } catch (error) {
      console.error('Error fetching credits:', error);
      addNotification('error', 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditBalances = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_credit_balances', {
        p_tenant_id: currentTenant.id
      });

      if (error) throw error;
      setCreditBalances(data || []);

    } catch (error) {
      console.error('Error fetching credit balances:', error);
    }
  };

  const handleCreateCredit = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('credits')
        .insert({
          ...creditForm,
          tenant_id: currentTenant.id,
          created_by: user?.id,
          original_amount: creditForm.amount,
          status: 'available'
        });

      if (error) throw error;

      // Log creation
      await auditLogger.log({
        action: 'create',
        resource_type: 'credit',
        description: `Created credit of $${creditForm.amount} for clinic`,
        metadata: creditForm
      });

      addNotification('success', 'Credit created successfully');
      setShowCreateModal(false);
      setCreditForm({
        clinic_id: '',
        amount: 0,
        reason: '',
        source_type: 'manual',
        notes: '',
        expires_at: ''
      });
      fetchCredits();
      fetchCreditBalances();

    } catch (error) {
      console.error('Error creating credit:', error);
      addNotification('error', 'Failed to create credit');
    }
  };

  const handleAutoApplyCredits = async () => {
    if (!currentTenant?.id) return;

    try {
      setLoading(true);

      // Call RPC function to auto-apply credits
      const { data, error } = await supabase.rpc('auto_apply_credits', {
        p_tenant_id: currentTenant.id
      });

      if (error) throw error;

      // Log the auto-application
      await auditLogger.log({
        action: 'update',
        resource_type: 'credit',
        description: `Auto-applied credits: ${data.credits_applied} credits to ${data.invoices_affected} invoices`,
        metadata: data
      });

      addNotification('success', 
        `Applied ${data.credits_applied} credits to ${data.invoices_affected} invoices`
      );

      fetchCredits();
      fetchCreditBalances();

    } catch (error) {
      console.error('Error auto-applying credits:', error);
      addNotification('error', 'Failed to auto-apply credits');
    } finally {
      setLoading(false);
    }
  };

  const handleManualApplication = async (
    creditId: string, 
    invoiceId: string, 
    amount: number
  ) => {
    if (!currentTenant?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Apply credit to invoice
      const { error } = await supabase.rpc('apply_credit_to_invoice', {
        p_credit_id: creditId,
        p_invoice_id: invoiceId,
        p_amount: amount,
        p_user_id: user?.id
      });

      if (error) throw error;

      // Log application
      await auditLogger.log({
        action: 'update',
        resource_type: 'credit',
        resource_id: creditId,
        description: `Manually applied $${amount} credit to invoice ${invoiceId}`,
        metadata: { credit_id: creditId, invoice_id: invoiceId, amount }
      });

      addNotification('success', 'Credit applied successfully');
      setShowApplicationModal(false);
      fetchCredits();

    } catch (error) {
      console.error('Error applying credit:', error);
      addNotification('error', 'Failed to apply credit');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getSourceIcon = (sourceType: Credit['source_type']) => {
    switch (sourceType) {
      case 'overpayment':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'refund':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'adjustment':
        return <FileText className="h-4 w-4 text-yellow-600" />;
      case 'manual':
        return <Plus className="h-4 w-4 text-gray-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: Credit['status']) => {
    const badges = {
      available: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      applied: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Credit Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage overpayments, refunds, and credit applications
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleAutoApplyCredits}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Auto-Apply Credits</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Credit</span>
          </button>
        </div>
      </div>

      {/* Credit Balances Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {creditBalances.slice(0, 3).map(balance => (
          <div key={balance.clinic_id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">{balance.clinic_name}</h3>
              <CreditCard className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(balance.available_credits)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Total: {formatCurrency(balance.total_credits)}
            </p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        {(['all', 'available', 'applied'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              filter === status
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Credits Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinic</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {credits.map(credit => (
              <tr key={credit.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {credit.clinic_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>
                    <p className="font-medium">{formatCurrency(credit.amount)}</p>
                    {credit.amount < credit.original_amount && (
                      <p className="text-xs text-gray-500">
                        of {formatCurrency(credit.original_amount)}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center space-x-2">
                    {getSourceIcon(credit.source_type)}
                    <span className="text-gray-600">
                      {credit.source_type.charAt(0).toUpperCase() + credit.source_type.slice(1)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {credit.reason}
                </td>
                <td className="px-6 py-4 text-sm">
                  {getStatusBadge(credit.status)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(credit.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center space-x-2">
                    {credit.status === 'available' && (
                      <button
                        onClick={() => {
                          setSelectedCredit(credit);
                          setShowApplicationModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                        title="Apply Credit"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedCredit(credit);
                        // Show history modal
                      }}
                      className="text-gray-600 hover:text-gray-700"
                      title="View History"
                    >
                      <History className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {credits.length === 0 && !loading && (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No credits found</p>
          </div>
        )}
      </div>

      {/* Create Credit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">Create Credit</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic *
                </label>
                <select
                  value={creditForm.clinic_id}
                  onChange={(e) => setCreditForm({ ...creditForm, clinic_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a clinic</option>
                  {/* Populate with clinics */}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={creditForm.amount}
                  onChange={(e) => setCreditForm({ ...creditForm, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Type *
                </label>
                <select
                  value={creditForm.source_type}
                  onChange={(e) => setCreditForm({ ...creditForm, source_type: e.target.value as Credit['source_type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="manual">Manual</option>
                  <option value="overpayment">Overpayment</option>
                  <option value="refund">Refund</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <input
                  type="text"
                  value={creditForm.reason}
                  onChange={(e) => setCreditForm({ ...creditForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Reason for credit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={creditForm.notes}
                  onChange={(e) => setCreditForm({ ...creditForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires On (Optional)
                </label>
                <input
                  type="date"
                  value={creditForm.expires_at}
                  onChange={(e) => setCreditForm({ ...creditForm, expires_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreditForm({
                    clinic_id: '',
                    amount: 0,
                    reason: '',
                    source_type: 'manual',
                    notes: '',
                    expires_at: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCredit}
                disabled={!creditForm.clinic_id || !creditForm.amount || !creditForm.reason}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create Credit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Credit Modal */}
      {showApplicationModal && selectedCredit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px]">
            <h3 className="text-lg font-semibold mb-4">Apply Credit</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Applying credit of <strong>{formatCurrency(selectedCredit.amount)}</strong> from{' '}
                <strong>{selectedCredit.clinic_name}</strong>
              </p>
            </div>

            {/* Invoice selection and application logic would go here */}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApplicationModal(false);
                  setSelectedCredit(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Apply credit logic
                  addNotification('info', 'Credit application feature coming soon');
                  setShowApplicationModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Credit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditManagement;