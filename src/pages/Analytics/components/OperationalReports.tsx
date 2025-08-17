import React, { useState } from 'react';
import {
  Activity,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  Download
} from 'lucide-react';

const OperationalReports: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const operationalMetrics = [
    { label: 'Daily Productivity', value: '94%', target: '90%', status: 'above' },
    { label: 'Avg Processing Time', value: '4.2 hrs', target: '6 hrs', status: 'above' },
    { label: 'Claims Processed', value: '847', target: '750', status: 'above' },
    { label: 'Error Rate', value: '2.1%', target: '<3%', status: 'above' }
  ];

  const departmentPerformance = [
    { name: 'Billing', productivity: 96, tasksCompleted: 234, avgTime: '3.8 hrs', errorRate: '1.2%' },
    { name: 'Collections', productivity: 92, tasksCompleted: 189, avgTime: '5.2 hrs', errorRate: '2.8%' },
    { name: 'Front Desk', productivity: 98, tasksCompleted: 412, avgTime: '2.1 hrs', errorRate: '0.5%' },
    { name: 'Lab Billing', productivity: 89, tasksCompleted: 156, avgTime: '6.4 hrs', errorRate: '3.2%' },
    { name: 'Insurance Verification', productivity: 94, tasksCompleted: 178, avgTime: '4.5 hrs', errorRate: '1.9%' }
  ];

  const taskDistribution = [
    { category: 'Invoice Generation', count: 234, percentage: 27.6, avgTime: '15 min' },
    { category: 'Payment Processing', count: 189, percentage: 22.3, avgTime: '8 min' },
    { category: 'Insurance Claims', count: 156, percentage: 18.4, avgTime: '25 min' },
    { category: 'Patient Inquiries', count: 142, percentage: 16.8, avgTime: '12 min' },
    { category: 'Report Generation', count: 126, percentage: 14.9, avgTime: '20 min' }
  ];

  const teamProductivity = [
    { name: 'Sarah Johnson', role: 'Billing Specialist', tasks: 67, efficiency: '98%', quality: '99.2%' },
    { name: 'Mike Chen', role: 'Collections Agent', tasks: 54, efficiency: '92%', quality: '97.8%' },
    { name: 'Emily Davis', role: 'AR Specialist', tasks: 61, efficiency: '95%', quality: '98.5%' },
    { name: 'James Wilson', role: 'Insurance Verifier', tasks: 48, efficiency: '89%', quality: '96.2%' },
    { name: 'Lisa Anderson', role: 'Billing Coordinator', tasks: 72, efficiency: '96%', quality: '99.0%' }
  ];

  return (
    <div className="space-y-6">
      {/* Department Filter */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            <option value="billing">Billing</option>
            <option value="collections">Collections</option>
            <option value="front-desk">Front Desk</option>
            <option value="lab-billing">Lab Billing</option>
            <option value="insurance">Insurance Verification</option>
          </select>
          <button className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </button>
        </div>
        <button className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {operationalMetrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">{metric.label}</p>
              {metric.status === 'above' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            <p className="text-xs text-gray-500 mt-1">Target: {metric.target}</p>
          </div>
        ))}
      </div>

      {/* Department Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Productivity</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tasks Completed</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Error Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departmentPerformance.map((dept, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{dept.name}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            dept.productivity >= 95 ? 'bg-green-600' :
                            dept.productivity >= 90 ? 'bg-blue-600' :
                            dept.productivity >= 85 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${dept.productivity}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{dept.productivity}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900">{dept.tasksCompleted}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900">{dept.avgTime}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`font-medium ${
                      parseFloat(dept.errorRate) < 2 ? 'text-green-600' :
                      parseFloat(dept.errorRate) < 3 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {dept.errorRate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Task Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Distribution</h3>
          <div className="space-y-3">
            {taskDistribution.map((task, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{task.category}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{task.count}</span>
                    <span className="text-xs text-gray-500">({task.avgTime})</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${task.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Processing Time Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Time Trends</h3>
          <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Processing time chart would appear here</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">Average</p>
              <p className="text-sm font-semibold text-gray-900">4.2 hrs</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fastest</p>
              <p className="text-sm font-semibold text-green-600">1.8 hrs</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Slowest</p>
              <p className="text-sm font-semibold text-red-600">8.4 hrs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Productivity Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Team Productivity</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Tasks Completed</option>
              <option>Efficiency</option>
              <option>Quality Score</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Member</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tasks Today</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quality Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {teamProductivity.map((member, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.role}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {member.tasks}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`font-medium ${
                      parseFloat(member.efficiency) >= 95 ? 'text-green-600' :
                      parseFloat(member.efficiency) >= 90 ? 'text-blue-600' :
                      'text-yellow-600'
                    }`}>
                      {member.efficiency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`font-medium ${
                      parseFloat(member.quality) >= 98 ? 'text-green-600' :
                      parseFloat(member.quality) >= 95 ? 'text-blue-600' :
                      'text-yellow-600'
                    }`}>
                      {member.quality}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Efficiency Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Efficiency Improvement</h4>
            <p className="text-sm text-blue-700 mt-1">
              Team productivity has increased by 8% this month. Average processing time 
              has decreased from 5.1 hours to 4.2 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalReports;