import React, { useState } from 'react';
import { X, User, Shield, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isAuthError } from '../../context/enhanced-auth-error-handling';
import MfaManagementSection from '../auth/MfaManagementSection';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    setPasswordLoading(true);
    const { error: authError } = await updateUserPassword(newPassword);

    if (authError) {
      if (isAuthError(authError)) {
        setPasswordError("Invalid or incorrect password provided.");
      } else {
        setPasswordError("An unexpected error occurred. Please try again.");
      }
    } else {
      setPasswordSuccess("Password updated successfully!");
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Your Profile</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('profile')}
                className={`border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Security Settings
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-6 py-6">
            {activeTab === 'profile' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                  <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <p className="text-gray-900">{user?.email || 'Not available'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                      <p className="text-gray-900 font-mono text-sm">{user?.id || 'Not available'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Created</label>
                      <p className="text-gray-900">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Not available'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                      <p className="text-gray-900">
                        {user?.updated_at ? new Date(user.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Not available'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* User Preferences (placeholder for future features) */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <p className="text-sm text-gray-500">
                      Additional profile preferences and settings will be available here soon.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Change Password Section */}
                <div>
                  <div className="flex items-center mb-4">
                    <Key className="h-5 w-5 text-gray-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          minLength={6}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          minLength={6}
                        />
                      </div>
                      
                      {passwordError && (
                        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                          {passwordError}
                        </div>
                      )}
                      
                      {passwordSuccess && (
                        <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                          {passwordSuccess}
                        </div>
                      )}
                      
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* MFA Management Section */}
                <div>
                  <div className="flex items-center mb-4">
                    <Shield className="h-5 w-5 text-gray-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
                  </div>
                  <MfaManagementSection />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 bg-gray-50 rounded-b-lg">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;