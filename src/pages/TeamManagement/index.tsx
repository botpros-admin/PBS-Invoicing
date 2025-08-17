import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { 
  Users,
  Settings,
  Activity,
  FolderOpen,
  UserPlus,
  Shield,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Team Management Components
import TeamMembers from './components/TeamMembers';
import TeamSettings from './components/TeamSettings';
import TeamActivity from './components/TeamActivity';
import TeamResources from './components/TeamResources';

const TeamManagement: React.FC = () => {
  const { user } = useAuth();
  
  const tabs = [
    { 
      path: '', 
      label: 'Team Performance', 
      icon: BarChart3, 
      component: TeamActivity,
      description: 'Monitor team productivity and metrics'
    },
    { 
      path: 'workload', 
      label: 'Workload Management', 
      icon: Users, 
      component: TeamMembers,
      description: 'View and balance team workload'
    },
    { 
      path: 'tasks', 
      label: 'Task Assignment', 
      icon: Activity, 
      component: TeamActivity,
      description: 'Assign and track team tasks'
    },
    { 
      path: 'resources', 
      label: 'Shared Resources', 
      icon: FolderOpen, 
      component: TeamResources,
      description: 'Team documents and tools'
    },
  ];

  // Check if user has team management permissions
  const hasTeamAccess = ['admin', 'ar_manager'].includes(user?.role || '');

  if (!hasTeamAccess) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">Team Management Access Required</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You need manager or admin privileges to access team management features.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Operations</h1>
            <p className="text-gray-600 mt-1">Monitor performance, manage workload, and assign tasks</p>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <UserPlus className="w-4 h-4 mr-2" />
            Assign Task
          </button>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Team Members</p>
            <p className="text-lg font-semibold text-gray-900">12</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Active Today</p>
            <p className="text-lg font-semibold text-green-600">8</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Avg Performance</p>
            <p className="text-lg font-semibold text-blue-600">92%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Tasks Completed</p>
            <p className="text-lg font-semibold text-purple-600">247</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/team${tab.path ? '/' + tab.path : ''}`}
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
                  {tab.label}
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
        
        {/* Content Area */}
        <div className="p-6">
          <Routes>
            <Route index element={<TeamMembers />} />
            <Route path="settings" element={<TeamSettings />} />
            <Route path="activity" element={<TeamActivity />} />
            <Route path="resources" element={<TeamResources />} />
          </Routes>
        </div>
      </div>

      {/* New Feature Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <Users className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-semibold text-green-900">New: Team Management Center</h4>
            <p className="text-sm text-green-700 mt-1">
              Team management features are now centralized here. Manage your team members, 
              monitor performance, and share resources all in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;