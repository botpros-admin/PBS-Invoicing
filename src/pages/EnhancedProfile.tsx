import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { 
  User,
  Shield,
  Bell,
  Settings,
  Activity,
  Building,
  Camera,
  Edit3,
  Clock,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PersonalInfoSection from '../components/profile/PersonalInfoSection';
import SecuritySection from '../components/profile/SecuritySection';
import PreferencesSection from '../components/profile/PreferencesSection';
import ActivitySection from '../components/profile/ActivitySection';
import OrganizationSection from '../components/profile/OrganizationSection';

const EnhancedProfile: React.FC = () => {
  const { user } = useAuth();
  
  const tabs = [
    { 
      path: '', 
      label: 'Personal Info', 
      icon: User, 
      component: PersonalInfoSection,
      description: 'Manage your profile information and avatar'
    },
    { 
      path: 'security', 
      label: 'Security', 
      icon: Shield, 
      component: SecuritySection,
      description: 'Password, 2FA, and security settings'
    },
    { 
      path: 'preferences', 
      label: 'Preferences', 
      icon: Settings, 
      component: PreferencesSection,
      description: 'Customize your experience and notifications'
    },
    { 
      path: 'activity', 
      label: 'Activity', 
      icon: Activity, 
      component: ActivitySection,
      description: 'View your recent activity and usage'
    },
    { 
      path: 'organization', 
      label: 'Organization', 
      icon: Building, 
      component: OrganizationSection,
      description: 'Your role and organization details'
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with User Overview */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-8">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name || user.email} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                <Camera className="w-3 h-3" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">
                {user?.name || user?.email || 'Your Profile'}
              </h1>
              <p className="text-blue-100 text-sm mb-2">{user?.email}</p>
              <div className="flex items-center space-x-4 text-blue-100 text-sm">
                <div className="flex items-center space-x-1">
                  <Shield className="w-4 h-4" />
                  <span className="capitalize">
                    {user?.userType === 'staff' ? user.role : user?.userType === 'client' ? `Client ${user.role}` : 'User'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    Last active: {user?.lastLoginAt ? 
                      new Date(user.lastLoginAt).toLocaleDateString() : 
                      'Recently'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Edit Button */}
            <button className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors flex items-center space-x-2">
              <Edit3 className="w-4 h-4" />
              <span>Quick Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/profile${tab.path ? '/' + tab.path : ''}`}
                end={tab.path === ''}
                className={({ isActive }) =>
                  `group py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <tab.icon 
                    size={16} 
                    className={`transition-colors duration-200`}
                  />
                  <div>
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs text-gray-400 group-hover:text-gray-500">
                      {tab.description}
                    </div>
                  </div>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
        
        {/* Content Area */}
        <div className="min-h-[600px]">
          <Routes>
            <Route index element={<PersonalInfoSection />} />
            <Route path="security" element={<SecuritySection />} />
            <Route path="preferences" element={<PreferencesSection />} />
            <Route path="activity" element={<ActivitySection />} />
            <Route path="organization" element={<OrganizationSection />} />
            <Route path="*" element={<PersonalInfoSection />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default EnhancedProfile;