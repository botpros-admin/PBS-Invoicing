import React, { useState } from 'react';
import {
  Download,
  FileText,
  Calendar,
  Filter,
  ChevronDown,
  FileSpreadsheet,
  FilePieChart,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

const ReportsDownloads: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('last30days');
  const [selectedReportType, setSelectedReportType] = useState('all');

  // Sample report data based on Ashley's requirements
  const availableReports = [
    {
      id: 1,
      name: 'Monthly Claims Summary',
      type: 'summary',
      description: 'Comprehensive overview of all claims processed',
      lastGenerated: '2024-01-22',
      fileSize: '2.4 MB',
      format: 'PDF',
      icon: FilePieChart,
      frequency: 'Monthly',
      status: 'ready'
    },
    {
      id: 2,
      name: 'Detailed Billing Report',
      type: 'billing',
      description: 'Line-by-line billing details with CPT codes',
      lastGenerated: '2024-01-21',
      fileSize: '5.8 MB',
      format: 'Excel',
      icon: FileSpreadsheet,
      frequency: 'Weekly',
      status: 'ready'
    },
    {
      id: 3,
      name: 'Denial Analysis Report',
      type: 'analysis',
      description: 'Analysis of denied claims with reasons',
      lastGenerated: '2024-01-20',
      fileSize: '1.2 MB',
      format: 'PDF',
      icon: AlertCircle,
      frequency: 'Weekly',
      status: 'ready'
    },
    {
      id: 4,
      name: 'Laboratory Test Volume Report',
      type: 'laboratory',
      description: 'Specimen counts and test volumes by CPT code',
      lastGenerated: '2024-01-22',
      fileSize: '3.1 MB',
      format: 'Excel',
      icon: FileSpreadsheet,
      frequency: 'Daily',
      status: 'generating'
    },
    {
      id: 5,
      name: 'Revenue Cycle Performance',
      type: 'performance',
      description: 'Key performance indicators and trending',
      lastGenerated: '2024-01-19',
      fileSize: '1.8 MB',
      format: 'PDF',
      icon: TrendingUp,
      frequency: 'Monthly',
      status: 'ready'
    },
    {
      id: 6,
      name: 'Payer Mix Analysis',
      type: 'analysis',
      description: 'Breakdown by insurance carriers and payment rates',
      lastGenerated: '2024-01-18',
      fileSize: '0.9 MB',
      format: 'PDF',
      icon: FilePieChart,
      frequency: 'Monthly',
      status: 'ready'
    }
  ];

  const scheduledReports = [
    { name: 'Monthly Claims Summary', schedule: 'First Monday of month', nextRun: '2024-02-05' },
    { name: 'Weekly Billing Report', schedule: 'Every Monday', nextRun: '2024-01-29' },
    { name: 'Daily Lab Volume', schedule: 'Daily at 6 AM', nextRun: '2024-01-23' }
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'ready') {
      return (
        <span className="flex items-center text-green-600 text-sm">
          <CheckCircle className="w-4 h-4 mr-1" />
          Ready
        </span>
      );
    } else if (status === 'generating') {
      return (
        <span className="flex items-center text-blue-600 text-sm">
          <Clock className="w-4 h-4 mr-1 animate-spin" />
          Generating...
        </span>
      );
    }
    return null;
  };

  const filteredReports = availableReports.filter(report => 
    selectedReportType === 'all' || report.type === selectedReportType
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Downloads</h1>
        <p className="text-gray-600 mt-1">Generate and download billing reports and analytics</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
          <FilePieChart className="w-5 h-5 mr-2" />
          Generate Custom Report
        </button>
        <button className="bg-white border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
          <Calendar className="w-5 h-5 mr-2" />
          Schedule Reports
        </button>
        <button className="bg-white border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
          <Download className="w-5 h-5 mr-2" />
          Bulk Download
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-sm text-gray-600 mr-2">Timeframe:</label>
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="last90days">Last 90 Days</option>
              <option value="thisyear">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mr-2">Report Type:</label>
            <select 
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="px-3 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="summary">Summary Reports</option>
              <option value="billing">Billing Reports</option>
              <option value="laboratory">Laboratory Reports</option>
              <option value="analysis">Analysis Reports</option>
              <option value="performance">Performance Reports</option>
            </select>
          </div>
          <button className="flex items-center px-4 py-1 border rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Available Reports */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Available Reports</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredReports.map((report) => (
            <div key={report.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <report.icon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-base font-medium text-gray-900">{report.name}</h3>
                      <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {report.format}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">{report.fileSize}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Frequency: {report.frequency}</span>
                      <span>•</span>
                      <span>Last generated: {report.lastGenerated}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(report.status)}
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    disabled={report.status === 'generating'}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Reports */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Scheduled Reports</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700">Manage Schedules →</button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {scheduledReports.map((report, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{report.name}</p>
                  <p className="text-xs text-gray-500">{report.schedule}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Next run:</p>
                  <p className="text-sm font-medium text-gray-900">{report.nextRun}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ashley's Implementation Note */}
      <div className="hidden">
        {/* From Ashley's Transcript 2: 
            "We need comprehensive reporting - claims summaries, denial analysis, 
            revenue cycle metrics. And it all needs to be downloadable in Excel 
            and PDF formats. Our clients want to manipulate the data themselves." */}
      </div>
    </div>
  );
};

export default ReportsDownloads;