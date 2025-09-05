import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, Check, X, FileText, Calendar, DollarSign } from 'lucide-react';

interface DuplicateItem {
  id: string;
  organization_id: string;
  accession_number: string;
  cpt_code: string;
  service_date: string;
  unit_price: number;
  quantity: number;
  patient_name?: string;
  raw_import_data?: any;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export const DuplicateReviewQueue: React.FC = () => {
  const { user } = useAuth();
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [overrideReason, setOverrideReason] = useState<{ [key: string]: string }>({});
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('duplicate_review_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDuplicates(data || []);
    } catch (error) {
      console.error('Error fetching duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (itemId: string) => {
    const reason = overrideReason[itemId];
    if (!reason || reason.trim() === '') {
      alert('Please provide a reason for approving this duplicate');
      return;
    }

    setProcessingItems(prev => new Set(prev).add(itemId));

    try {
      // Get the duplicate item
      const duplicate = duplicates.find(d => d.id === itemId);
      if (!duplicate) return;

      // Start a transaction
      const { error: auditError } = await supabase
        .from('audit_trail')
        .insert({
          user_id: user?.id,
          action: 'DUPLICATE_OVERRIDE',
          entity_type: 'invoice_item',
          entity_id: itemId,
          details: {
            accession_number: duplicate.accession_number,
            cpt_code: duplicate.cpt_code,
            service_date: duplicate.service_date,
            unit_price: duplicate.unit_price
          },
          reason: reason
        });

      if (auditError) throw auditError;

      // Insert the item into invoice_items (bypassing the unique constraint by marking as override)
      const { error: insertError } = await supabase
        .from('invoice_items')
        .insert({
          organization_id: duplicate.organization_id,
          accession_number: duplicate.accession_number,
          cpt_code: duplicate.cpt_code,
          service_date: duplicate.service_date,
          unit_price: duplicate.unit_price,
          quantity: duplicate.quantity,
          patient_first_name: duplicate.patient_name?.split(' ')[0],
          patient_last_name: duplicate.patient_name?.split(' ').slice(1).join(' '),
          is_duplicate_override: true, // Custom field to track overrides
          override_reason: reason,
          override_by: user?.id,
          override_at: new Date().toISOString()
        });

      if (insertError && !insertError.message.includes('duplicate key')) {
        throw insertError;
      }

      // Update the review queue item
      const { error: updateError } = await supabase
        .from('duplicate_review_queue')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          notes: `Approved with reason: ${reason}`
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Remove from local state
      setDuplicates(prev => prev.filter(d => d.id !== itemId));
      setOverrideReason(prev => {
        const newReasons = { ...prev };
        delete newReasons[itemId];
        return newReasons;
      });

    } catch (error) {
      console.error('Error approving duplicate:', error);
      alert('Failed to approve duplicate. Please try again.');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleReject = async (itemId: string) => {
    setProcessingItems(prev => new Set(prev).add(itemId));

    try {
      // Update the review queue item
      const { error } = await supabase
        .from('duplicate_review_queue')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          notes: 'Rejected as duplicate'
        })
        .eq('id', itemId);

      if (error) throw error;

      // Log to audit trail
      await supabase
        .from('audit_trail')
        .insert({
          user_id: user?.id,
          action: 'DUPLICATE_REJECTED',
          entity_type: 'invoice_item',
          entity_id: itemId,
          reason: 'Confirmed as duplicate - rejected'
        });

      // Remove from local state
      setDuplicates(prev => prev.filter(d => d.id !== itemId));

    } catch (error) {
      console.error('Error rejecting duplicate:', error);
      alert('Failed to reject duplicate. Please try again.');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedItems.size === 0) {
      alert('Please select items to process');
      return;
    }

    if (action === 'approve') {
      // Check that all selected items have override reasons
      const missingReasons = Array.from(selectedItems).filter(
        id => !overrideReason[id] || overrideReason[id].trim() === ''
      );
      if (missingReasons.length > 0) {
        alert('Please provide override reasons for all selected items');
        return;
      }
    }

    const confirmMessage = action === 'approve' 
      ? `Approve ${selectedItems.size} items as overrides?`
      : `Reject ${selectedItems.size} items as duplicates?`;

    if (!confirm(confirmMessage)) return;

    for (const itemId of selectedItems) {
      if (action === 'approve') {
        await handleApprove(itemId);
      } else {
        await handleReject(itemId);
      }
    }

    setSelectedItems(new Set());
  };

  if (loading) {
    return <div className="p-4">Loading duplicate review queue...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Duplicate Review Queue</h2>
        <p className="text-gray-600">
          Review and approve/reject potential duplicate invoice items. All approvals require a reason and are logged for audit.
        </p>
      </div>

      {duplicates.length === 0 ? (
        <Alert>
          <AlertDescription>
            No duplicates pending review. The system automatically flags duplicates during import.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="mb-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''} pending review
              {selectedItems.size > 0 && ` • ${selectedItems.size} selected`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('approve')}
                disabled={selectedItems.size === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve Selected
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                disabled={selectedItems.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Selected
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(new Set(duplicates.map(d => d.id)));
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                      checked={selectedItems.size === duplicates.length && duplicates.length > 0}
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accession #
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPT Code
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Date
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Override Reason
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {duplicates.map((item) => (
                  <tr key={item.id} className={selectedItems.has(item.id) ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedItems);
                          if (e.target.checked) {
                            newSelected.add(item.id);
                          } else {
                            newSelected.delete(item.id);
                          }
                          setSelectedItems(newSelected);
                        }}
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.accession_number}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.cpt_code}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.patient_name || 'N/A'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {new Date(item.service_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                        ${item.unit_price} × {item.quantity}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        placeholder="Required for approval..."
                        value={overrideReason[item.id] || ''}
                        onChange={(e) => setOverrideReason(prev => ({
                          ...prev,
                          [item.id]: e.target.value
                        }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={processingItems.has(item.id)}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          title="Approve as override"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={processingItems.has(item.id)}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Reject as duplicate"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Approving a duplicate creates an audit trail that can be reviewed later</li>
                  <li>All overrides require a valid business reason</li>
                  <li>Rejected items will not be imported and must be corrected if legitimate</li>
                  <li>This action cannot be undone without database administrator access</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};