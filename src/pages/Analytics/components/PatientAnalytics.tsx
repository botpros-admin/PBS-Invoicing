import React, { useState } from 'react';
import {
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  Shield,
  Activity,
  PieChart,
  BarChart3,
  Download
} from 'lucide-react';

const PatientAnalytics: React.FC = () => {
  const [selectedView, setSelectedView] = useState('demographics');

  const patientMetrics = [
    { label: 'Total Patients', value: '3,847', change: '+156', trend: 'up' },
    { label: 'New This Month', value: '156', change: '+12%', trend: 'up' },
    { label: 'Active Patients', value: '2,892', change: '+8%', trend: 'up' },
    { label: 'Retention Rate', value: '94.2%', change: '+2.1%', trend: 'up' }
  ];

  const ageDistribution = [
    { range: '0-17', count: 423, percentage: 11.0 },
    { range: '18-34', count: 892, percentage: 23.2 },
    { range: '35-54', count: 1247, percentage: 32.4 },
    { range: '55-64', count: 731, percentage: 19.0 },
    { range: '65+', count: 554, percentage: 14.4 }
  ];

  const insuranceDistribution = [
    { provider: 'Blue Cross Blue Shield', patients: 1234, percentage: 32.1 },
    { provider: 'Medicare', patients: 892, percentage: 23.2 },
    { provider: 'Aetna', patients: 654, percentage: 17.0 },
    { provider: 'United Healthcare', patients: 489, percentage: 12.7 },
    { provider: 'Medicaid', patients: 342, percentage: 8.9 },
    { provider: 'Self Pay', patients: 236, percentage: 6.1 }
  ];

  const geographicDistribution = [
    { location: 'Downtown', patients: 1423, percentage: 37.0, avgDistance: '3.2 mi' },
    { location: 'Northside', patients: 892, percentage: 23.2, avgDistance: '5.8 mi' },
    { location: 'Westside', patients: 678, percentage: 17.6, avgDistance: '7.1 mi' },
    { location: 'Eastside', patients: 542, percentage: 14.1, avgDistance: '6.4 mi' },
    { location: 'Southside', patients: 312, percentage: 8.1, avgDistance: '9.2 mi' }
  ];

  const visitFrequency = [
    { frequency: 'Weekly', patients: 89, percentage: 2.3, avgRevenue: '$450' },
    { frequency: 'Monthly', patients: 423, percentage: 11.0, avgRevenue: '$280' },
    { frequency: 'Quarterly', patients: 1892, percentage: 49.2, avgRevenue: '$180' },
    { frequency: 'Semi-Annual', patients: 987, percentage: 25.7, avgRevenue: '$120' },
    { frequency: 'Annual', patients: 456, percentage: 11.8, avgRevenue: '$95' }
  ];

  const conditionPrevalence = [
    { condition: 'Hypertension', patients: 1234, percentage: 32.1 },
    { condition: 'Diabetes Type 2', patients: 892, percentage: 23.2 },
    { condition: 'High Cholesterol', patients: 778, percentage: 20.2 },
    { condition: 'Anxiety/Depression', patients: 645, percentage: 16.8 },
    { condition: 'Arthritis', patients: 423, percentage: 11.0 }
  ];

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedView('demographics')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedView === 'demographics'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Demographics
          </button>
          <button
            onClick={() => setSelectedView('geographic')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedView === 'geographic'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Geographic
          </button>
          <button
            onClick={() => setSelectedView('clinical')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedView === 'clinical'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Clinical
          </button>
        </div>
        <button className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
          <Download className="w-4 h-4 mr-2" />
          Export Analytics
        </button>
      </div>

      {/* Patient Metrics Overview */}
      <div className="grid grid-cols-4 gap-4">
        {patientMetrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">{metric.label}</p>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            <p className={`text-sm mt-1 ${
              metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {metric.change} from last month
            </p>
          </div>
        ))}
      </div>

      {selectedView === 'demographics' && (
        <>
          <div className="grid grid-cols-2 gap-6">
            {/* Age Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
              <div className="space-y-3">
                {ageDistribution.map((age, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{age.range} years</span>
                      <span className="text-sm font-medium text-gray-900">{age.count} ({age.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${age.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Average Age</span>
                  <span className="font-semibold text-gray-900">47.3 years</span>
                </div>
              </div>
            </div>

            {/* Insurance Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Insurance Coverage</h3>
              <div className="space-y-3">
                {insuranceDistribution.map((insurance, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm text-gray-700">{insurance.provider}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{insurance.patients}</p>
                      <p className="text-xs text-gray-500">{insurance.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visit Frequency Analysis */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Visit Frequency Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Patients</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Percentage</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg Revenue/Patient</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Visual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {visitFrequency.map((freq, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{freq.frequency}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-900">{freq.patients}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">{freq.percentage}%</td>
                      <td className="px-4 py-3 text-sm text-center font-medium text-green-600">{freq.avgRevenue}</td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${freq.percentage}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedView === 'geographic' && (
        <>
          {/* Geographic Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                {geographicDistribution.map((location, index) => (
                  <div key={index} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{location.location}</p>
                        <p className="text-xs text-gray-500">Avg distance: {location.avgDistance}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{location.patients}</p>
                      <p className="text-xs text-gray-500">{location.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Geographic heat map would appear here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Travel Distance Analysis */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <Activity className="w-5 h-5 text-amber-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">Patient Travel Insights</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Average patient travel distance: 5.7 miles. 78% of patients live within 10 miles of the practice.
                  Consider targeted marketing in underserved areas.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedView === 'clinical' && (
        <>
          {/* Condition Prevalence */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Conditions</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                {conditionPrevalence.map((condition, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{condition.condition}</span>
                      <span className="text-sm font-medium text-gray-900">{condition.patients}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${condition.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Condition distribution chart would appear here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Avg Lab Tests/Patient</p>
              <p className="text-2xl font-bold text-gray-900">3.2</p>
              <p className="text-xs text-gray-500 mt-1">Per visit</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Prescription Rate</p>
              <p className="text-2xl font-bold text-gray-900">67%</p>
              <p className="text-xs text-gray-500 mt-1">Of visits</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Follow-up Rate</p>
              <p className="text-2xl font-bold text-gray-900">82%</p>
              <p className="text-xs text-gray-500 mt-1">Within 30 days</p>
            </div>
          </div>
        </>
      )}

      {/* Patient Growth Trend */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Growth Trend</h3>
        <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">12-month growth trend chart would appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientAnalytics;