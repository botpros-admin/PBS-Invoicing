import React, { useState } from 'react';
import {
  RefreshCw,
  Cloud,
  Database,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Settings,
  Shield
} from 'lucide-react';

const DataSync: React.FC = () => {
  const [activeSyncs, setActiveSyncs] = useState<string[]>(['ehr', 'lab']);

  const syncConnections = [
    {
      id: 'ehr',
      name: 'EHR System',
      type: 'Electronic Health Records',
      status: 'connected',
      lastSync: '15 minutes ago',
      nextSync: 'In 45 minutes',
      records: 3847,
      frequency: 'Every hour',
      icon: Database
    },
    {
      id: 'lab',
      name: 'Lab Interface',
      type: 'Laboratory Results',
      status: 'connected',
      lastSync: '2 hours ago',
      nextSync: 'In 4 hours',
      records: 1234,
      frequency: 'Every 6 hours',
      icon: Activity
    },
    {
      id: 'insurance',
      name: 'Insurance Clearinghouse',
      type: 'Claims & Eligibility',
      status: 'disconnected',
      lastSync: '3 days ago',
      nextSync: 'Manual',
      records: 5632,
      frequency: 'Daily',
      icon: Shield
    },
    {
      id: 'pharmacy',
      name: 'Pharmacy System',
      type: 'Prescription Data',
      status: 'error',
      lastSync: '1 week ago',
      nextSync: 'Paused',
      records: 892,
      frequency: 'Twice daily',
      icon: Cloud
    }
  ];

  const syncHistory = [
    {
      id: 1,
      system: 'EHR System',
      type: 'Full Sync',
      recordsIn: 234,
      recordsOut: 156,
      duration: '3m 42s',
      status: 'success',
      timestamp: '2024-01-20 14:30'
    },
    {
      id: 2,
      system: 'Lab Interface',
      type: 'Incremental',
      recordsIn: 89,
      recordsOut: 0,
      duration: '1m 15s',
      status: 'success',
      timestamp: '2024-01-20 12:00'
    },
    {
      id: 3,
      system: 'Insurance Clearinghouse',
      type: 'Manual Sync',
      recordsIn: 0,
      recordsOut: 423,
      duration: '5m 28s',
      status: 'warning',
      timestamp: '2024-01-17 09:15'
    },
    {
      id: 4,
      system: 'Pharmacy System',
      type: 'Full Sync',
      recordsIn: 0,
      recordsOut: 0,
      duration: '0m 12s',
      status: 'failed',
      timestamp: '2024-01-13 16:00'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'disconnected':
        return 'text-gray-600 bg-gray-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const toggleSync = (id: string) => {
    setActiveSyncs(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Sync Status Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Active Syncs</p>
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeSyncs.length}/4</p>
          <p className="text-xs text-gray-500 mt-1">Systems connected</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Last 24h Syncs</p>
            <ArrowUpDown className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">48</p>
          <p className="text-xs text-gray-500 mt-1">Successful syncs</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Records Synced</p>
            <Database className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">12.4K</p>
          <p className="text-xs text-gray-500 mt-1">This week</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Sync Errors</p>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">3</p>
          <p className="text-xs text-gray-500 mt-1">Need attention</p>
        </div>
      </div>

      {/* Connected Systems */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Connected Systems</h3>
          <button className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync All
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {syncConnections.map((connection) => (
            <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className={`p-2 rounded-lg ${
                    connection.status === 'connected' ? 'bg-green-50' :
                    connection.status === 'error' ? 'bg-red-50' : 'bg-gray-50'
                  } mr-4`}>
                    <connection.icon className={`w-6 h-6 ${
                      connection.status === 'connected' ? 'text-green-600' :
                      connection.status === 'error' ? 'text-red-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h4 className="text-base font-semibold text-gray-900 mr-3">{connection.name}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}>
                        {connection.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{connection.type}</p>
                    <div className="grid grid-cols-4 gap-4 text-xs">
                      <div>
                        <p className="text-gray-500">Last Sync</p>
                        <p className="font-medium text-gray-900">{connection.lastSync}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Next Sync</p>
                        <p className="font-medium text-gray-900">{connection.nextSync}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Records</p>
                        <p className="font-medium text-gray-900">{connection.records}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Frequency</p>
                        <p className="font-medium text-gray-900">{connection.frequency}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Settings className="w-4 h-4" />
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeSyncs.includes(connection.id)}
                      onChange={() => toggleSync(connection.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Configuration</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Sync Settings</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sync Mode</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Bidirectional</option>
                  <option>Import Only</option>
                  <option>Export Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Conflict Resolution</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Newest Wins</option>
                  <option>Local Priority</option>
                  <option>Remote Priority</option>
                  <option>Manual Review</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Batch Size</label>
                <input
                  type="number"
                  defaultValue="100"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Sync Options</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-gray-700">Enable automatic sync</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-gray-700">Validate data before sync</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm text-gray-700">Create backup before sync</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-gray-700">Log all sync activities</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm text-gray-700">Send notifications on errors</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Sync History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">System</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Records In</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Records Out</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {syncHistory.map((sync) => (
                <tr key={sync.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sync.system}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {sync.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {sync.recordsIn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {sync.recordsOut}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                    {sync.duration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusIcon(sync.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {sync.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataSync;