import React, { useState } from 'react';
import { 
  Activity, 
  Clock, 
  Calendar,
  TrendingUp,
  FileText,
  Users,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Plus,
  ArrowRight,
  BarChart3,
  PieChart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ActivitySection: React.FC = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30days');

  // Mock activity data
  const recentActivity = [
    {
      id: '1',
      type: 'invoice_created',
      title: 'Created invoice #INV-2024-001',
      description: 'New invoice for Patient John Doe',
      timestamp: '2024-01-15T14:30:00Z',
      icon: FileText,
      color: 'bg-blue-500'
    },
    {
      id: '2',
      type: 'payment_received',
      title: 'Payment received',
      description: '$1,250.00 for invoice #INV-2024-001',
      timestamp: '2024-01-15T10:22:00Z',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      id: '3',
      type: 'profile_updated',
      title: 'Updated profile information',
      description: 'Changed phone number and department',
      timestamp: '2024-01-14T16:45:00Z',
      icon: Edit,
      color: 'bg-orange-500'
    },
    {
      id: '4',
      type: 'report_viewed',
      title: 'Viewed aging report',
      description: 'Generated aging report for December 2023',
      timestamp: '2024-01-14T09:15:00Z',
      icon: BarChart3,
      color: 'bg-purple-500'
    },
    {
      id: '5',
      type: 'user_invited',
      title: 'Invited new user',
      description: 'Sent invitation to jane.smith@example.com',
      timestamp: '2024-01-13T11:30:00Z',
      icon: Users,
      color: 'bg-indigo-500'
    }
  ];

  // Mock usage statistics
  const usageStats = {
    totalLogins: 87,
    invoicesCreated: 23,
    paymentsProcessed: 15,
    reportsGenerated: 12,
    averageSessionTime: '2h 34m',
    lastActiveDate: '2024-01-15T14:30:00Z',
    mostUsedFeature: 'Invoice Management',
    productivityScore: 92
  };

  // Mock weekly activity chart data
  const weeklyActivity = [
    { day: 'Mon', logins: 3, invoices: 2, reports: 1 },
    { day: 'Tue', logins: 2, invoices: 4, reports: 0 },
    { day: 'Wed', logins: 4, invoices: 1, reports: 2 },
    { day: 'Thu', logins: 1, invoices: 3, reports: 1 },
    { day: 'Fri', logins: 5, invoices: 0, reports: 3 },
    { day: 'Sat', logins: 0, invoices: 0, reports: 0 },
    { day: 'Sun', logins: 1, invoices: 1, reports: 0 }
  ];

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  return (
    <div className="p-6 space-y-8">
      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Logins</p>
              <p className="text-2xl font-bold text-blue-900">{usageStats.totalLogins}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">Last 30 days</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Invoices Created</p>
              <p className="text-2xl font-bold text-green-900">{usageStats.invoicesCreated}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">This month</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Reports Generated</p>
              <p className="text-2xl font-bold text-purple-900">{usageStats.reportsGenerated}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-2">This month</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Productivity</p>
              <p className="text-2xl font-bold text-orange-900">{usageStats.productivityScore}%</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-orange-600 mt-2">Above average</p>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BarChart3 className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Weekly Activity</h3>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>
        </div>

        <div className="flex items-end space-x-2 h-32">
          {weeklyActivity.map((day) => (
            <div key={day.day} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gray-100 rounded-t-md relative" style={{ height: '80px' }}>
                <div 
                  className="bg-blue-500 rounded-t-md absolute bottom-0 w-full"
                  style={{ height: `${Math.max((day.logins / 5) * 80, 4)}px` }}
                />
                <div 
                  className="bg-green-500 rounded-t-md absolute bottom-0 w-full opacity-60"
                  style={{ height: `${Math.max((day.invoices / 5) * 80, 2)}px` }}
                />
                <div 
                  className="bg-purple-500 rounded-t-md absolute bottom-0 w-full opacity-40"
                  style={{ height: `${Math.max((day.reports / 5) * 80, 2)}px` }}
                />
              </div>
              <span className="text-xs text-gray-600 mt-2">{day.day}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-gray-600">Logins</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600">Invoices</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span className="text-gray-600">Reports</span>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <PieChart className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Average Session Time</span>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-900">{usageStats.averageSessionTime}</p>
            <p className="text-xs text-gray-500">Per login session</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Most Used Feature</span>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-900">{usageStats.mostUsedFeature}</p>
            <p className="text-xs text-gray-500">45% of total time</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Last Active</span>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatTimeAgo(usageStats.lastActiveDate)}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(usageStats.lastActiveDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Activity className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1">
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className={`w-8 h-8 ${activity.color} rounded-full flex items-center justify-center`}>
                <activity.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatTimeAgo(activity.timestamp)}
                </p>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <Eye className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-blue-900">Performance Insights</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">This Month's Highlights</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Created 23% more invoices than last month</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Improved session efficiency by 15%</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Most active on Tuesday afternoons</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Recommendations</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Consider using keyboard shortcuts for faster navigation</span>
              </li>
              <li className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Try bulk operations for invoice processing</span>
              </li>
              <li className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Set up automated report scheduling</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitySection;