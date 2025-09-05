import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, X, MessageSquare } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { getDuplicateReviewItems, resolveDuplicateItem } from '../api/services/duplicate.service';
import { DuplicateReviewItem, ID } from '../types';
import Modal from '../components/Modal';
import { useNotifications } from '../context/NotificationContext';

const DuplicateReviewQueue: React.FC = () => {
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DuplicateReviewItem | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryKey = ['duplicateReviewItems', currentOrganization?.id];

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: () => getDuplicateReviewItems(currentOrganization!.id),
    enabled: !!currentOrganization,
  });

  const handleActionClick = (item: DuplicateReviewItem, newAction: 'approve' | 'reject') => {
    setSelectedItem(item);
    setAction(newAction);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setAction(null);
    setReason('');
  };

  const handleSubmit = async () => {
    if (!selectedItem || !action || !reason.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await resolveDuplicateItem({
        itemId: selectedItem.id,
        action,
        userId: user.id,
        reason,
      });
      addNotification('success', `Item ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      queryClient.invalidateQueries({ queryKey });
      handleModalClose();
    } catch (error) {
      addNotification('error', 'Failed to process the item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading duplicate review items.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Duplicate Review Queue</h1>
      <p className="mb-6 text-gray-600">
        These items were flagged as potential duplicates during the import process. Please review each item.
      </p>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accession #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPT Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conflict Note</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No pending items to review.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{item.accession_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.cpt_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.patient_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(item.service_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.notes}</td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button onClick={() => handleActionClick(item, 'approve')} className="text-green-600 hover:text-green-900"><Check size={20} /></button>
                    <button onClick={() => handleActionClick(item, 'reject')} className="text-red-600 hover:text-red-900"><X size={20} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedItem && (
        <Modal isOpen={isModalOpen} onClose={handleModalClose} title={`Confirm ${action}`}>
          <div className="p-4">
            <p className="mb-4">Please provide a reason for {action === 'approve' ? 'approving' : 'rejecting'} this item.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded"
              rows={4}
              placeholder="Mandatory reason..."
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={handleModalClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={handleSubmit} disabled={!reason.trim() || isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400">
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DuplicateReviewQueue;
