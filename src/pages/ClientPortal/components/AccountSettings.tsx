import React, { useState } from 'react';
import {
  Settings,
  User,
  Users,
  Bell,
  Shield,
  Palette,
  Building2,
  Mail,
  Phone,
  Globe,
  Save,
  Plus,
  Trash2,
  Edit,
  Check,
  X
} from 'lucide-react';

const AccountSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);

  // Sample user data
  const [profileData, setProfileData] = useState({
    companyName: 'Quest Diagnostics - North Region',
    accountNumber: 'QD-NORTH-2024',
    contactName: 'John Smith',
    email: 'john.smith@questdiagnostics.com',
    phone: '(555) 123-4567',
    address: '123 Laboratory Way, Suite 100',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    website: 'www.questdiagnostics.com'
  });

  const users = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@questdiagnostics.com',
      role: 'Account Administrator',
      status: 'active',
      lastLogin: '2024-01-22 10:30 AM'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@questdiagnostics.com',
      role: 'Billing Manager',
      status: 'active',
      lastLogin: '2024-01-22 09:15 AM'
    },
    {
      id: 3,
      name: 'Mike Chen',
      email: 'mike.chen@questdiagnostics.com',
      role: 'Claims Specialist',
      status: 'active',
      lastLogin: '2024-01-21 04:45 PM'
    },
    {
      id: 4,
      name: 'Emily Davis',
      email: 'emily.davis@questdiagnostics.com',
      role: 'Report Viewer',
      status: 'inactive',
      lastLogin: '2024-01-15 02:30 PM'
    }
  ];

  const notificationSettings = [
    { id: 'claims_processed', label: 'Claims Processed', email: true, portal: true },
    { id: 'claims_denied', label: 'Claims Denied', email: true, portal: true },
    { id: 'reports_ready', label: 'Reports Ready', email: false, portal: true },
    { id: 'payment_received', label: 'Payment Received', email: true, portal: false },
    { id: 'support_updates', label: 'Support Ticket Updates', email: true, portal: true },
    { id: 'system_alerts', label: 'System Alerts', email: false, portal: true }
  ];

  const tabs = [
    { id: 'profile', label: 'Company Profile', icon: Building2 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'branding', label: 'White Label', icon: Palette }
  ];

  const renderTabContent = () => {
    switch(activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Company Profile</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center"
              >
                {isEditing ? (
                  <><X className="w-4 h-4 mr-2" /> Cancel</>
                ) : (
                  <><Edit className="w-4 h-4 mr-2" /> Edit Profile</>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={profileData.companyName}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={profileData.accountNumber}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact</label>
                <input
                  type="text"
                  value={profileData.contactName}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={profileData.website}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={profileData.address}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={profileData.city}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={profileData.state}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={profileData.zip}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end space-x-3 pt-4">
                <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            )}
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{user.role}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-700">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
            
            <div className="space-y-4">
              {notificationSettings.map((setting) => (
                <div key={setting.id} className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{setting.label}</span>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={setting.email}
                          className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Email</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={setting.portal}
                          className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Portal</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Preferences
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border">
                <h3 className="text-base font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Enable 2FA
                </button>
              </div>

              <div className="bg-white rounded-lg p-6 border">
                <h3 className="text-base font-medium text-gray-900 mb-4">Password Policy</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    Minimum 8 characters
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    At least one uppercase letter
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    At least one number
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    At least one special character
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-6 border">
                <h3 className="text-base font-medium text-gray-900 mb-4">Session Management</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Automatic logout after 30 minutes of inactivity
                </p>
                <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Configure Session Settings
                </button>
              </div>
            </div>
          </div>
        );

      case 'branding':
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">White Label Settings</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                White label features allow you to customize the portal with your company's branding.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">Upload your company logo</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Choose File
                  </button>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 2MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex items-center space-x-4">
                  <input type="color" value="#005eb8" className="h-10 w-20" />
                  <input 
                    type="text" 
                    value="#005eb8" 
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Portal Title</label>
                <input 
                  type="text" 
                  placeholder="Your Company Portal" 
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Domain</label>
                <input 
                  type="text" 
                  placeholder="portal.yourcompany.com" 
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Preview
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Branding
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Settings Navigation */}
        <aside className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-3" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Ashley's Implementation Note */}
      <div className="hidden">
        {/* From Ashley's Transcript 5: 
            "Clients need full control over their portal users - adding, removing, 
            setting permissions. And white labeling is huge for us - they want 
            their patients to see their branding, not ours." */}
      </div>
    </div>
  );
};

export default AccountSettings;