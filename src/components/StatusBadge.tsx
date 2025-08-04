import React from 'react';
import { InvoiceStatus } from '../types';

interface StatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'dispute':
        return 'bg-red-100 text-red-800';
      case 'overdue':
        return 'bg-orange-100 text-orange-800';
      case 'write_off':
        return 'bg-purple-100 text-purple-800';
      case 'exhausted':
        return 'bg-pink-100 text-pink-800';
      case 'cancelled':
        return 'bg-gray-200 text-gray-500 line-through';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'sent':
        return 'Sent';
      case 'partial':
        return 'Partially Paid';
      case 'paid':
        return 'Paid in Full';
      case 'dispute':
        return 'In Dispute';
      case 'overdue':
        return 'Overdue';
      case 'write_off':
        return 'Write Off';
      case 'exhausted':
        return 'Exhausted';
      case 'cancelled':
        return 'Cancelled';
      default:
        // Capitalize first letter and replace underscores for any unhandled status
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()} ${className}`}
    >
      {getStatusLabel()}
    </span>
  );
};

export default StatusBadge;