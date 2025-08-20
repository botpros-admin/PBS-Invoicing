import React from 'react';
import { FileX, Inbox, Search, Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: 'inbox' | 'search' | 'file' | 'custom';
  customIcon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data found',
  message = 'There are no items to display at the moment.',
  icon = 'inbox',
  customIcon,
  actionLabel,
  onAction,
  className = '',
}) => {
  const iconMap = {
    inbox: <Inbox className="h-12 w-12 text-gray-400" />,
    search: <Search className="h-12 w-12 text-gray-400" />,
    file: <FileX className="h-12 w-12 text-gray-400" />,
    custom: customIcon || <Inbox className="h-12 w-12 text-gray-400" />,
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="text-center max-w-md">
        <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gray-100 mb-4">
          {iconMap[icon]}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;