import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

const FinancialReports: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const financialMetrics = [
    { label: 'Total Revenue', value: '$142,847', change: '+12.3%', trend: 'up' },
    { label: 'Collections', value: '$134,280', change: '+8.7%', trend: 'up' },
    { label: 'Outstanding AR', value: '$47,293', change: '-15.2%', trend: 'down' },
    { label: 'Write-offs', value: '$3,842', change: '-5.1%', trend: 'down' }
  ];

  const topPayers = [
    { name: 'Blue Cross Blue Shield', amount: '$45,230', percentage: 31.7, count: 287 },
    { name: 'Medicare', amount: '$38,920', percentage: 27.3, count: 412 },
    { name: 'Aetna', amount: '$24,180', percentage: 16.9, count: 156 },
    { name: 'United Healthcare', amount: '$18,450', percentage: 12.9, count: 98 },
    { name: 'Self Pay', amount: '$16,067', percentage: 11.2, count: 73 }
  ];

  const cptCodeRevenue = [
    { code: '99213', description: 'Office Visit - Established', revenue: '$28,450', count: 342 },
    { code: '99214', description: 'Office Visit - Complex', revenue: '$24,180', count: 186 },
    { code: '36415', description: 'Venipuncture', revenue: '$18,920', count: 847 },
    { code: '80053', description: 'Comprehensive Metabolic Panel', revenue: '$15,340', count: 423 },
    { code: '85025', description: 'Complete Blood Count', revenue: '$12,890', count: 512 }
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setSelectedPeriod('quarter')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === 'quarter'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Quarter
          </button>
          <button
            onClick={() => setSelectedPeriod('year')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Year
          </button>
        </div>
        <div className="flex space-x-2">
          <button className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
          <button className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        {financialMetrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">{metric.label}</p>
              {metric.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            <p className={`text-sm mt-1 ${
              metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {metric.change} from last {selectedPeriod}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Trend Chart Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedMetric('revenue')}
              className={`px-3 py-1 text-sm rounded-lg ${
                selectedMetric === 'revenue' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setSelectedMetric('collections')}
              className={`px-3 py-1 text-sm rounded-lg ${
                selectedMetric === 'collections' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
              }`}
            >
              Collections
            </button>
            <button
              onClick={() => setSelectedMetric('ar')}
              className={`px-3 py-1 text-sm rounded-lg ${
                selectedMetric === 'ar' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
              }`}
            >
              AR
            </button>
          </div>
        </div>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Revenue trend chart would appear here</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Payers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Insurance Payers</h3>
          <div className="space-y-3">
            {topPayers.map((payer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">{payer.name}</p>
                    <p className="text-sm font-semibold text-gray-900">{payer.amount}</p>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${payer.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{payer.percentage}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{payer.count} claims</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top CPT Codes by Revenue */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top CPT Codes by Revenue</h3>
          <div className="space-y-3">
            {cptCodeRevenue.map((item, index) => (
              <div key={index} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-sm font-mono font-medium text-gray-900 mr-2">
                      {item.code}
                    </span>
                    <span className="text-xs text-gray-500">({item.count})</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.revenue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AR Aging Report */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Accounts Receivable Aging</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aging Bucket</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900">0-30 Days</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">$18,450</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">39.0%</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">142</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">15</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900">31-60 Days</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">$12,890</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">27.3%</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">87</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">45</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900">61-90 Days</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">$8,340</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">17.6%</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">54</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">75</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900">91-120 Days</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">$4,823</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">10.2%</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">28</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">105</td>
              </tr>
              <tr className="bg-red-50">
                <td className="px-4 py-3 text-sm font-medium text-red-900">120+ Days</td>
                <td className="px-4 py-3 text-sm text-right font-bold text-red-900">$2,790</td>
                <td className="px-4 py-3 text-sm text-right text-red-700">5.9%</td>
                <td className="px-4 py-3 text-sm text-right text-red-700">18</td>
                <td className="px-4 py-3 text-sm text-right text-red-700">180+</td>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">$47,293</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">100%</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">329</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">48</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;