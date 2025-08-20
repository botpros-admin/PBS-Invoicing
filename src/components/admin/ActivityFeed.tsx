import React, { useState } from 'react';
import { Activity, User, FileText, DollarSign, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import { useRealtimeNotifications } from '../../context/RealtimeNotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

export const ActivityFeed: React.FC = () => {
  const { activityLog, refreshActivityLog } = useRealtimeNotifications();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Only show for admins
  if (!user || !['admin', 'superadmin'].includes(user.role || '')) {
    return null;
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshActivityLog();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getActionIcon = (action: string) => {
    if (action.includes('INVOICE')) return <FileText className="h-4 w-4" />;
    if (action.includes('PAYMENT')) return <DollarSign className="h-4 w-4" />;
    if (action.includes('USER') || action.includes('LOGIN')) return <User className="h-4 w-4" />;
    if (action.includes('SETTING')) return <Settings className="h-4 w-4" />;
    if (action.includes('ERROR') || action.includes('FAIL')) return <AlertCircle className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    if (action.includes('CREATE') || action.includes('INSERT')) return 'text-green-600 bg-green-50';
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50';
    if (action.includes('ERROR') || action.includes('FAIL')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatAction = (action: string) => {
    return action
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredLog = filter === 'all' 
    ? activityLog 
    : activityLog.filter(log => log.action.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
            <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
              Live
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className={`p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {['all', 'invoice', 'payment', 'user', 'login'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                filter === filterOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredLog.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No activity to display</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLog.map((log) => (
              <div key={log.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatAction(log.action)}
                    </p>
                    
                    {/* Entity Info */}
                    {log.entity_type && (
                      <p className="text-sm text-gray-600 mt-1">
                        {log.entity_type}: {log.entity_id?.slice(0, 8)}...
                      </p>
                    )}

                    {/* Details */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        {Object.entries(log.details).slice(0, 2).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            {key}: <span className="font-medium">{String(value)}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredLog.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 text-center">
          <button
            onClick={() => window.open('/admin/activity-log', '_blank')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View full activity log
          </button>
        </div>
      )}
    </div>
  );
};