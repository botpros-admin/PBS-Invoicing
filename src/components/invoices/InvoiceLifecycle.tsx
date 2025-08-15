import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  DollarSign,
  AlertCircle,
  Clock,
  Check,
  X,
  Lock,
  Unlock,
  Mail,
  History,
  Edit,
  Trash2,
  ChevronRight,
  Upload,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useNotifications } from '../../context/NotificationContext';
import { useTenant } from '../../context/TenantContext';
import { Invoice, InvoiceLineItem, InvoiceStatus } from '../../types';

interface InvoiceLifecycleProps {
  invoiceId?: string;
  onStatusChange?: (status: InvoiceStatus) => void;
}

interface LifecycleState {
  status: InvoiceStatus;
  timestamp: string;
  user: string;
  notes?: string;
}

const InvoiceLifecycle: React.FC<InvoiceLifecycleProps> = ({ 
  invoiceId, 
  onStatusChange 
}) => {
  const { addNotification } = useNotifications();
  const { currentTenant } = useTenant();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [lifecycleHistory, setLifecycleHistory] = useState<LifecycleState[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [nextStatus, setNextStatus] = useState<InvoiceStatus | null>(null);
  const [statusNotes, setStatusNotes] = useState('');
  const [showLineItems, setShowLineItems] = useState(false);
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [deleteReason, setDeleteReason] = useState('');

  // Lifecycle status flow
  const statusFlow = {
    draft: ['finalized', 'cancelled'],
    finalized: ['sent', 'draft', 'cancelled'],
    sent: ['paid', 'partial_payment', 'disputed', 'on_hold'],
    partial_payment: ['paid', 'disputed', 'on_hold'],
    disputed: ['resolved', 'on_hold', 'cancelled'],
    on_hold: ['sent', 'disputed', 'cancelled'],
    paid: [], // End state
    cancelled: [], // End state
    resolved: ['paid', 'cancelled'] // Can be paid after resolution
  };

  const statusConfig = {
    draft: {
      label: 'Draft',
      color: 'gray',
      icon: FileText,
      description: 'Invoice is being prepared and can be edited'
    },
    finalized: {
      label: 'Finalized',
      color: 'blue',
      icon: Lock,
      description: 'Invoice is locked and ready to be sent'
    },
    sent: {
      label: 'Sent',
      color: 'indigo',
      icon: Send,
      description: 'Invoice has been sent to the client'
    },
    partial_payment: {
      label: 'Partial Payment',
      color: 'yellow',
      icon: DollarSign,
      description: 'Invoice has received partial payment'
    },
    paid: {
      label: 'Paid',
      color: 'green',
      icon: Check,
      description: 'Invoice has been fully paid'
    },
    disputed: {
      label: 'Disputed',
      color: 'red',
      icon: AlertCircle,
      description: 'Client has disputed the invoice'
    },
    on_hold: {
      label: 'On Hold',
      color: 'orange',
      icon: Clock,
      description: 'Invoice is temporarily on hold'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'gray',
      icon: X,
      description: 'Invoice has been cancelled'
    },
    resolved: {
      label: 'Resolved',
      color: 'purple',
      icon: Check,
      description: 'Dispute has been resolved'
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
      fetchLifecycleHistory();
    }
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    if (!invoiceId || !currentTenant?.id) return;

    try {
      setLoading(true);
      
      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('tenant_id', currentTenant.id)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      // Fetch line items
      const { data: linesData, error: linesError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('is_active', true)
        .order('line_number');

      if (linesError) throw linesError;
      setLineItems(linesData || []);

    } catch (error) {
      console.error('Error fetching invoice data:', error);
      addNotification('error', 'Failed to load invoice data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLifecycleHistory = async () => {
    if (!invoiceId || !currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('invoice_status_history')
        .select(`
          *,
          users(name)
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const history = data?.map(record => ({
        status: record.status,
        timestamp: record.created_at,
        user: record.users?.name || 'System',
        notes: record.notes
      })) || [];

      setLifecycleHistory(history);
    } catch (error) {
      console.error('Error fetching lifecycle history:', error);
    }
  };

  const canTransitionTo = (targetStatus: InvoiceStatus): boolean => {
    if (!invoice) return false;
    const currentStatus = invoice.status as keyof typeof statusFlow;
    return statusFlow[currentStatus]?.includes(targetStatus) || false;
  };

  const handleStatusTransition = async () => {
    if (!invoice || !nextStatus || !currentTenant?.id) return;

    try {
      setLoading(true);

      // Special handling for finalization
      if (nextStatus === 'finalized') {
        // Lock in current prices
        const { error: lockError } = await supabase.rpc('lock_invoice_prices', {
          p_invoice_id: invoice.id
        });

        if (lockError) throw lockError;
      }

      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)
        .eq('tenant_id', currentTenant.id);

      if (updateError) throw updateError;

      // Log status change
      const { error: historyError } = await supabase
        .from('invoice_status_history')
        .insert({
          invoice_id: invoice.id,
          previous_status: invoice.status,
          new_status: nextStatus,
          notes: statusNotes,
          user_id: currentTenant.id, // Should be actual user ID
          tenant_id: currentTenant.id
        });

      if (historyError) throw historyError;

      // Handle sent status - add to email queue
      if (nextStatus === 'sent') {
        const { error: emailError } = await supabase
          .from('email_queue')
          .insert({
            invoice_id: invoice.id,
            recipient: invoice.client_email,
            subject: `Invoice #${invoice.invoice_number}`,
            template: 'invoice_notification',
            status: 'pending',
            tenant_id: currentTenant.id
          });

        if (emailError) console.error('Failed to queue email:', emailError);
      }

      addNotification('success', `Invoice status updated to ${statusConfig[nextStatus].label}`);
      
      if (onStatusChange) {
        onStatusChange(nextStatus);
      }

      // Refresh data
      fetchInvoiceData();
      fetchLifecycleHistory();
      
      // Reset modal state
      setShowConfirmModal(false);
      setNextStatus(null);
      setStatusNotes('');

    } catch (error) {
      console.error('Error updating invoice status:', error);
      addNotification('error', 'Failed to update invoice status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLines = async () => {
    if (selectedLines.size === 0 || !deleteReason.trim()) {
      addNotification('error', 'Please select lines and provide a reason');
      return;
    }

    try {
      setLoading(true);

      // Update selected lines to inactive with reason
      const { error } = await supabase
        .from('invoice_line_items')
        .update({
          active: false,
          deletion_reason: deleteReason,
          deleted_at: new Date().toISOString(),
          deleted_by: currentTenant?.id // Should be actual user ID
        })
        .in('id', Array.from(selectedLines));

      if (error) throw error;

      addNotification('success', `${selectedLines.size} line(s) deleted`);
      
      // Refresh data
      fetchInvoiceData();
      setSelectedLines(new Set());
      setDeleteReason('');
      setShowLineItems(false);

    } catch (error) {
      console.error('Error deleting lines:', error);
      addNotification('error', 'Failed to delete lines');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (file: File) => {
    // Handle additional data upload for draft invoices
    if (invoice?.status !== 'draft') {
      addNotification('error', 'Can only upload to draft invoices');
      return;
    }

    try {
      setLoading(true);
      
      // Parse CSV and add to existing invoice
      const formData = new FormData();
      formData.append('file', file);
      formData.append('invoice_id', invoice.id);
      
      // Call import function
      const { data, error } = await supabase.functions.invoke('import-invoice-data', {
        body: formData
      });

      if (error) throw error;

      addNotification('success', 'Data uploaded successfully');
      fetchInvoiceData();

    } catch (error) {
      console.error('Error uploading data:', error);
      addNotification('error', 'Failed to upload data');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusButton = (status: InvoiceStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    const canTransition = canTransitionTo(status);

    return (
      <button
        key={status}
        onClick={() => {
          setNextStatus(status);
          setShowConfirmModal(true);
        }}
        disabled={!canTransition}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
          ${canTransition 
            ? `bg-${config.color}-100 text-${config.color}-700 hover:bg-${config.color}-200` 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
        `}
      >
        <Icon className="h-4 w-4" />
        <span>{config.label}</span>
      </button>
    );
  };

  if (loading && !invoice) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No invoice selected</p>
      </div>
    );
  }

  const currentConfig = statusConfig[invoice.status as InvoiceStatus];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Invoice Lifecycle</h3>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-${currentConfig.color}-100 text-${currentConfig.color}-700`}>
            <CurrentIcon className="h-4 w-4" />
            <span className="font-medium">{currentConfig.label}</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6">{currentConfig.description}</p>

        {/* Status Transitions */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Available Actions:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(statusFlow).map(status => {
              if (status === invoice.status) return null;
              return renderStatusButton(status as InvoiceStatus);
            })}
          </div>
        </div>

        {/* Additional Actions for Draft */}
        {invoice.status === 'draft' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Draft Actions:</p>
            <div className="flex space-x-3">
              <button
                onClick={() => document.getElementById('bulk-upload')?.click()}
                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                <Upload className="h-4 w-4" />
                <span>Add More Data</span>
              </button>
              <input
                id="bulk-upload"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBulkUpload(file);
                }}
                className="hidden"
              />
              
              <button
                onClick={() => setShowLineItems(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Lines</span>
              </button>

              <button
                onClick={() => window.open(`/invoices/${invoice.id}/preview`, '_blank')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>
            </div>
          </div>
        )}

        {/* Line Item Management */}
        {showLineItems && invoice.status === 'draft' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Line Items ({lineItems.length})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lineItems.map(line => (
                <div key={line.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedLines.has(line.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedLines);
                      if (e.target.checked) {
                        newSelected.add(line.id);
                      } else {
                        newSelected.delete(line.id);
                      }
                      setSelectedLines(newSelected);
                    }}
                    className="rounded text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{line.description}</p>
                    <p className="text-xs text-gray-500">
                      {line.cpt_code} • Qty: {line.quantity} • ${line.unit_price}
                    </p>
                  </div>
                  {line.is_disputed && (
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Disputed</span>
                  )}
                </div>
              ))}
            </div>

            {selectedLines.size > 0 && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Reason for deletion (required)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleDeleteLines}
                  disabled={!deleteReason.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete {selectedLines.size} Selected Lines</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lifecycle History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <History className="h-5 w-5 mr-2" />
          Status History
        </h3>
        
        <div className="space-y-3">
          {lifecycleHistory.length > 0 ? (
            lifecycleHistory.map((record, index) => {
              const config = statusConfig[record.status];
              const Icon = config.icon;
              
              return (
                <div key={index} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                  <div className={`p-2 rounded-full bg-${config.color}-100`}>
                    <Icon className={`h-4 w-4 text-${config.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(record.timestamp).toLocaleString()} by {record.user}
                    </p>
                    {record.notes && (
                      <p className="text-xs text-gray-600 mt-1">{record.notes}</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">No history available</p>
          )}
        </div>
      </div>

      {/* Status Transition Confirmation Modal */}
      {showConfirmModal && nextStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">
              Confirm Status Change
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Change invoice status from <strong>{currentConfig.label}</strong> to{' '}
                <strong>{statusConfig[nextStatus].label}</strong>?
              </p>
              
              {nextStatus === 'finalized' && (
                <div className="bg-yellow-50 p-3 rounded-lg mb-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Finalizing will lock the invoice and prevent further edits.
                    Current prices will be locked in.
                  </p>
                </div>
              )}

              {nextStatus === 'sent' && (
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <p className="text-sm text-blue-800">
                    The invoice will be added to the email queue and sent to the client.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Add any notes about this status change..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setNextStatus(null);
                  setStatusNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusTransition}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceLifecycle;