import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { 
  User,
  Lock,
  Bell,
  Palette,
  Mail,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SecuritySettings from '../../components/settings/SecuritySettings';
import EmailSettings from '../../components/settings/EmailSettings';

// Profile Component
const ProfileSettings = () => {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <input
              type="text"
              placeholder="Enter your department"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <button className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Preferences Component
const PreferencesSettings = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Display Preferences</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Theme</label>
              <p className="text-sm text-gray-500">Choose your preferred theme</p>
            </div>
            <select className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              <option>Light</option>
              <option>Dark</option>
              <option>System</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Language</label>
              <p className="text-sm text-gray-500">Select your preferred language</p>
            </div>
            <select className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Date Format</label>
              <p className="text-sm text-gray-500">Choose how dates are displayed</p>
            </div>
            <select className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            <span className="ml-2 text-sm text-gray-700">Email notifications for new invoices</span>
          </label>
          
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            <span className="ml-2 text-sm text-gray-700">Email notifications for payment received</span>
          </label>
          
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            <span className="ml-2 text-sm text-gray-700">Email notifications for disputes</span>
          </label>
          
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            <span className="ml-2 text-sm text-gray-700">Browser push notifications</span>
          </label>
        </div>
        
        <div className="mt-6">
          <button className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export const AccountModule: React.FC = () => {
  const tabs = [
    { 
      path: '', 
      label: 'Profile', 
      icon: User, 
      component: ProfileSettings,
      description: 'Manage your profile information'
    },
    { 
      path: 'preferences', 
      label: 'Preferences', 
      icon: Palette, 
      component: PreferencesSettings,
      description: 'Customize your experience'
    },
    { 
      path: 'security', 
      label: 'Security', 
      icon: Lock, 
      component: SecuritySettings,
      description: 'Manage password and 2FA'
    },
    { 
      path: 'notifications', 
      label: 'Email & Notifications', 
      icon: Bell, 
      component: EmailSettings,
      description: 'Configure email and notification settings'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your personal account settings and preferences
        </p>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/account${tab.path ? '/' + tab.path : ''}`}
                end={tab.path === ''}
                className={({ isActive }) =>
                  `py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <div className="flex items-center">
                  <tab.icon size={16} className="mr-2" />
                  {tab.label}
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          <Routes>
            {tabs.map((tab) => (
              <Route 
                key={tab.path} 
                path={tab.path || '/'} 
                element={<tab.component />} 
              />
            ))}
            <Route path="*" element={<ProfileSettings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AccountModule;