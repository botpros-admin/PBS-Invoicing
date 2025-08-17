import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  Target,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Activity,
  Star
} from 'lucide-react';

const PerformanceMetrics: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const kpiMetrics = [
    { name: 'Revenue per Patient', value: '$287', target: '$275', achievement: 104, status: 'exceeded' },
    { name: 'Collection Rate', value: '94.2%', target: '92%', achievement: 102, status: 'exceeded' },
    { name: 'Days in AR', value: '28.5', target: '30', achievement: 105, status: 'exceeded' },
    { name: 'Clean Claim Rate', value: '96.8%', target: '95%', achievement: 102, status: 'exceeded' },
    { name: 'Denial Rate', value: '3.2%', target: '<5%', achievement: 136, status: 'exceeded' },
    { name: 'Patient Satisfaction', value: '4.7/5', target: '4.5/5', achievement: 104, status: 'exceeded' }
  ];

  const teamPerformance = [
    { 
      member: 'Sarah Johnson',
      role: 'Billing Manager',
      score: 98,
      metrics: { accuracy: 99.2, speed: 97.5, volume: 98.1 },
      rank: 1
    },
    { 
      member: 'Mike Chen',
      role: 'AR Specialist',
      score: 95,
      metrics: { accuracy: 97.8, speed: 93.2, volume: 94.5 },
      rank: 2
    },
    { 
      member: 'Emily Davis',
      role: 'Collections Lead',
      score: 94,
      metrics: { accuracy: 96.5, speed: 91.8, volume: 93.7 },
      rank: 3
    },
    { 
      member: 'James Wilson',
      role: 'Insurance Verifier',
      score: 92,
      metrics: { accuracy: 95.2, speed: 89.4, volume: 91.3 },
      rank: 4
    },
    { 
      member: 'Lisa Anderson',
      role: 'Billing Specialist',
      score: 91,
      metrics: { accuracy: 94.1, speed: 88.9, volume: 90.2 },
      rank: 5
    }
  ];

  const departmentScores = [
    { department: 'Billing', score: 94, trend: 'up', improvement: '+3.2%' },
    { department: 'Collections', score: 92, trend: 'up', improvement: '+2.8%' },
    { department: 'Insurance', score: 89, trend: 'stable', improvement: '+0.5%' },
    { department: 'Front Desk', score: 96, trend: 'up', improvement: '+4.1%' },
    { department: 'Lab Billing', score: 87, trend: 'down', improvement: '-1.2%' }
  ];

  const goalProgress = [
    { goal: 'Reduce AR Days to 25', current: 28.5, target: 25, progress: 86 },
    { goal: 'Increase Collection Rate to 95%', current: 94.2, target: 95, progress: 99 },
    { goal: 'Achieve 98% Clean Claim Rate', current: 96.8, target: 98, progress: 99 },
    { goal: 'Reduce Denial Rate to 2%', current: 3.2, target: 2, progress: 60 },
    { goal: 'Process 1000 Claims/Month', current: 847, target: 1000, progress: 85 }
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
        </div>
        <button className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
          <Award className="w-4 h-4 mr-2" />
          View Leaderboard
        </button>
      </div>

      {/* KPI Dashboard */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-3 gap-4">
          {kpiMetrics.map((kpi, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-600">{kpi.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                </div>
                {kpi.status === 'exceeded' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-500">Target: {kpi.target}</p>
                <span className={`text-xs font-medium ${
                  kpi.achievement >= 100 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {kpi.achievement}% achieved
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    kpi.achievement >= 100 ? 'bg-green-600' : 'bg-yellow-600'
                  }`}
                  style={{ width: `${Math.min(kpi.achievement, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-3">
            {teamPerformance.map((member) => (
              <div key={member.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    member.rank === 1 ? 'bg-yellow-500' :
                    member.rank === 2 ? 'bg-gray-400' :
                    member.rank === 3 ? 'bg-orange-600' : 'bg-blue-600'
                  }`}>
                    {member.rank}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{member.member}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{member.score}</p>
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= Math.round(member.score / 20) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance</h3>
          <div className="space-y-3">
            {departmentScores.map((dept) => (
              <div key={dept.department}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{dept.department}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{dept.score}/100</span>
                    <span className={`text-xs ${
                      dept.trend === 'up' ? 'text-green-600' :
                      dept.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {dept.improvement}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      dept.score >= 95 ? 'bg-green-600' :
                      dept.score >= 90 ? 'bg-blue-600' :
                      dept.score >= 85 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${dept.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goal Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quarterly Goals Progress</h3>
        <div className="space-y-4">
          {goalProgress.map((goal, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{goal.goal}</p>
                  <span className={`text-sm font-medium ${
                    goal.progress >= 90 ? 'text-green-600' :
                    goal.progress >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {goal.progress}%
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        goal.progress >= 90 ? 'bg-green-600' :
                        goal.progress >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    Current: {goal.current} | Target: {goal.target}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Trend */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Performance trend chart would appear here</p>
          </div>
        </div>
      </div>

      {/* Achievement Banner */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Award className="w-12 h-12 mr-4" />
            <div>
              <h3 className="text-lg font-bold">Team Achievement Unlocked!</h3>
              <p className="text-sm text-purple-100 mt-1">
                Your team has exceeded 5 out of 6 KPI targets this month. Keep up the excellent work!
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors">
            View Rewards
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;