import React, { useState } from 'react';
import {
  Database,
  Trash2,
  Archive,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Wrench,
  HardDrive
} from 'lucide-react';

const DataMaintenance: React.FC = () => {
  const [runningTasks, setRunningTasks] = useState<string[]>([]);

  const maintenanceTasks = [
    {
      id: 'integrity',
      name: 'Data Integrity Check',
      description: 'Validate data consistency and relationships',
      lastRun: '3 days ago',
      duration: '15 minutes',
      issues: 23,
      icon: Shield,
      color: 'blue'
    },
    {
      id: 'duplicates',
      name: 'Find Duplicates',
      description: 'Identify and merge duplicate records',
      lastRun: '1 week ago',
      duration: '8 minutes',
      issues: 47,
      icon: Search,
      color: 'purple'
    },
    {
      id: 'cleanup',
      name: 'Data Cleanup',
      description: 'Remove orphaned and invalid records',
      lastRun: '2 weeks ago',
      duration: '12 minutes',
      issues: 156,
      icon: Trash2,
      color: 'red'
    },
    {
      id: 'archive',
      name: 'Archive Old Data',
      description: 'Move inactive records to archive storage',
      lastRun: '1 month ago',
      duration: '25 minutes',
      issues: 892,
      icon: Archive,
      color: 'gray'
    },
    {
      id: 'optimize',
      name: 'Database Optimization',
      description: 'Optimize indexes and query performance',
      lastRun: '5 days ago',
      duration: '30 minutes',
      issues: 0,
      icon: Wrench,
      color: 'green'
    },
    {
      id: 'backup',
      name: 'Backup Verification',
      description: 'Verify backup integrity and restoration',
      lastRun: 'Yesterday',
      duration: '45 minutes',
      issues: 0,
      icon: HardDrive,
      color: 'indigo'
    }
  ];

  const dataIssues = [
    {
      id: 1,
      type: 'Missing Data',
      severity: 'medium',
      count: 23,
      description: 'Patient records missing insurance information',
      table: 'patients',
      action: 'Review'
    },
    {
      id: 2,
      type: 'Duplicate Records',
      severity: 'low',
      count: 47,
      description: 'Potential duplicate patient entries detected',
      table: 'patients',
      action: 'Merge'
    },
    {
      id: 3,
      type: 'Invalid References',
      severity: 'high',
      count: 8,
      description: 'Invoices referencing non-existent patients',
      table: 'invoices',
      action: 'Fix'
    },
    {
      id: 4,
      type: 'Orphaned Records',
      severity: 'medium',
      count: 156,
      description: 'Payment records without associated invoices',
      table: 'payments',
      action: 'Clean'
    },
    {
      id: 5,
      type: 'Data Inconsistency',
      severity: 'high',
      count: 12,
      description: 'Mismatched totals between invoices and payments',
      table: 'multiple',
      action: 'Reconcile'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const runTask = (taskId: string) => {
    setRunningTasks([...runningTasks, taskId]);
    setTimeout(() => {
      setRunningTasks(runningTasks.filter(id => id !== taskId));
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Database Health Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Database Health</p>
            <Database className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">98.5%</p>
          <p className="text-xs text-green-600 mt-1">Excellent condition</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Data Issues</p>
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">246</p>
          <p className="text-xs text-yellow-600 mt-1">Need attention</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Storage Used</p>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">4.2 GB</p>
          <p className="text-xs text-gray-500 mt-1">Of 10 GB available</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Last Backup</p>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">2h ago</p>
          <p className="text-xs text-gray-500 mt-1">Automatic backup</p>
        </div>
      </div>

      {/* Maintenance Tasks */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Maintenance Tasks</h3>
          <button className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Run All Checks
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {maintenanceTasks.map((task) => (
            <div key={task.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className={`p-2 rounded-lg bg-${task.color}-50 mr-3`}>
                    <task.icon className={`w-5 h-5 text-${task.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{task.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                    <div className="mt-3 flex items-center space-x-4 text-xs">
                      <span className="text-gray-500">Last run: {task.lastRun}</span>
                      <span className="text-gray-500">Duration: {task.duration}</span>
                      {task.issues > 0 && (
                        <span className="text-yellow-600 font-medium">{task.issues} issues</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => runTask(task.id)}
                  disabled={runningTasks.includes(task.id)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    runningTasks.includes(task.id)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {runningTasks.includes(task.id) ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'Run'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Issues */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Data Issues</h3>
            <div className="flex space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                20 High
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-600">
                179 Medium
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                47 Low
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Type</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Table</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dataIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {issue.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {issue.count}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {issue.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {issue.table}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button className="text-blue-600 hover:text-blue-800 font-medium">
                      {issue.action}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance Schedule */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Schedule</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Automatic Tasks</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">Daily Backup</span>
                <span className="text-xs text-gray-500">Every day at 2:00 AM</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">Integrity Check</span>
                <span className="text-xs text-gray-500">Every 3 days</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">Database Optimization</span>
                <span className="text-xs text-gray-500">Weekly on Sunday</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Archive Old Data</span>
                <span className="text-xs text-gray-500">Monthly on 1st</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Storage Management</h4>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Database</span>
                  <span className="text-xs text-gray-900 font-medium">2.8 GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">File Storage</span>
                  <span className="text-xs text-gray-900 font-medium">1.2 GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Backups</span>
                  <span className="text-xs text-gray-900 font-medium">0.2 GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '2%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataMaintenance;