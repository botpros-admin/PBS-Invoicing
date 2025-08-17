import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { 
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  Activity,
  PieChart,
  Calendar
} from 'lucide-react';

// Analytics Components
import FinancialReports from './components/FinancialReports';
import OperationalReports from './components/OperationalReports';
import PatientAnalytics from './components/PatientAnalytics';
import PerformanceMetrics from './components/PerformanceMetrics';

const Analytics: React.FC = () => {
  const tabs = [
    { 
      path: '', 
      label: 'Financial Reports', 
      icon: DollarSign, 
      component: FinancialReports,
      description: 'Revenue, collections, and financial trends'
    },
    { 
      path: 'operational', 
      label: 'Operational Reports', 
      icon: Activity, 
      component: OperationalReports,
      description: 'Productivity and efficiency metrics'
    },
    { 
      path: 'patients', 
      label: 'Patient Analytics', 
      icon: Users, 
      component: PatientAnalytics,
      description: 'Patient demographics and trends'
    },
    { 
      path: 'performance', 
      label: 'Performance Metrics', 
      icon: TrendingUp, 
      component: PerformanceMetrics,
      description: 'KPIs and team performance'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
            <p className="text-gray-600 mt-1">Comprehensive business intelligence and insights</p>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Calendar className="w-4 h-4 mr-2 text-gray-600" />
              Schedule Report
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </button>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-700">Monthly Revenue</p>
            <p className="text-lg font-bold text-green-900">$142,847</p>
            <p className="text-xs text-green-600 mt-1">↑ 12% from last month</p>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-700">Collection Rate</p>
            <p className="text-lg font-bold text-blue-900">94.2%</p>
            <p className="text-xs text-blue-600 mt-1">↑ 2.3% improvement</p>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
            <p className="text-xs text-purple-700">Active Patients</p>
            <p className="text-lg font-bold text-purple-900">3,847</p>
            <p className="text-xs text-purple-600 mt-1">↑ 156 new this month</p>
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg p-3 border border-amber-200">
            <p className="text-xs text-amber-700">Avg Days to Pay</p>
            <p className="text-lg font-bold text-amber-900">28.5</p>
            <p className="text-xs text-amber-600 mt-1">↓ 3.2 days faster</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/analytics${tab.path ? '/' + tab.path : ''}`}
                end={tab.path === ''}
                className={({ isActive }) =>
                  `py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <div className="flex items-center">
                  <tab.icon className="w-4 h-4 mr-2" />
                  <span>{tab.label}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
        
        {/* Content Area */}
        <div className="p-6">
          <Routes>
            <Route index element={<FinancialReports />} />
            <Route path="operational/*" element={<OperationalReports />} />
            <Route path="patients/*" element={<PatientAnalytics />} />
            <Route path="performance/*" element={<PerformanceMetrics />} />
            <Route path="*" element={<Navigate to="/analytics" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Analytics;