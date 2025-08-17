import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { 
  User,
  Shield,
  Settings,
  Activity,
  Camera,
  Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Import existing profile components
import PersonalInfoSection from '../../components/profile/PersonalInfoSection';
import SecuritySection from '../../components/profile/SecuritySection';
import PreferencesSection from '../../components/profile/PreferencesSection';
import ActivitySection from '../../components/profile/ActivitySection';

const MyAccount: React.FC = () => {
  const { user } = useAuth();
  
  const tabs = [
    { 
      path: '', 
      label: 'My Profile', 
      icon: User, 
      component: PersonalInfoSection,
      description: 'Personal information and contact details'
    },
    { 
      path: 'security', 
      label: 'My Security', 
      icon: Shield, 
      component: SecuritySection,
      description: 'Password, 2FA, and security settings'
    },
    { 
      path: 'preferences', 
      label: 'My Preferences', 
      icon: Settings, 
      component: PreferencesSection,
      description: 'UI theme, notifications, and display settings'
    },
    { 
      path: 'activity', 
      label: 'My Activity', 
      icon: Activity, 
      component: ActivitySection,
      description: 'Login history and recent actions'
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Simplified Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name || user.email} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-blue-600 hover:bg-gray-100 transition-colors shadow-sm">
                <Camera className="w-3 h-3" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white mb-0.5">
                {user?.name || user?.email || 'My Account'}
              </h1>
              <p className="text-blue-100 text-sm">{user?.email}</p>
              <div className="flex items-center space-x-3 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/20 text-white">
                  {user?.userType === 'staff' ? user.role : user?.userType === 'client' ? `Client ${user.role}` : 'User'}
                </span>
                <span className="text-xs text-blue-100">
                  Last active: Today
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2">
              <button className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors">
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/account${tab.path ? '/' + tab.path : ''}`}
                end={tab.path === ''}
                className={({ isActive }) =>
                  `py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
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
        <div className="p-6 bg-gray-50">
          <Routes>
            <Route index element={<PersonalInfoSection />} />
            <Route path="security" element={<SecuritySection />} />
            <Route path="preferences" element={<PreferencesSection />} />
            <Route path="activity" element={<ActivitySection />} />
          </Routes>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <User className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Simplified Account Management</h4>
            <p className="text-sm text-blue-700 mt-1">
              All your personal settings are now in one place. For team and organization settings, 
              check the respective sections based on your role permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;