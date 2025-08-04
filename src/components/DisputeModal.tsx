import React, { useState } from 'react';
import Modal from '../Modal';
import { ShieldAlert } from 'lucide-react';
import { InvoiceItem } from '../../types';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InvoiceItem | null;
  onSubmit: (itemId: string, reason: string) => void;
}

const DisputeModal: React.FC<DisputeModalProps> = ({ isOpen, onClose, item, onSubmit }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      onSubmit(item.id, reason);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dispute Item: ${item?.description}`}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="disputeReason" className="block text-sm font-medium text-gray-700">Reason for Dispute</label>
          <textarea
            id="disputeReason"
            name="disputeReason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            required
          ></textarea>
        </div>
        <div className="flex justify-end pt-4">
          <button type="button" onClick={onClose} className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
            <ShieldAlert size={16} className="mr-2" />
            Submit Dispute
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DisputeModal;
