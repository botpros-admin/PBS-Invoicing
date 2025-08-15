import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  Smartphone,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Monitor,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SecuritySection: React.FC = () => {
  const { user, updateUserPassword } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Mock data for login history
  const loginHistory = [
    {
      id: '1',
      timestamp: '2024-01-15T10:30:00Z',
      device: 'Chrome on Windows',
      location: 'New York, NY',
      ip: '192.168.1.1',
      success: true
    },
    {
      id: '2',
      timestamp: '2024-01-14T14:22:00Z',
      device: 'Safari on iPhone',
      location: 'New York, NY',
      ip: '10.0.0.1',
      success: true
    },
    {
      id: '3',
      timestamp: '2024-01-13T09:15:00Z',
      device: 'Firefox on Windows',
      location: 'Philadelphia, PA',
      ip: '192.168.2.1',
      success: false
    }
  ];

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      setPasswordError('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }

    setIsChangingPassword(true);
    const { error: authError } = await updateUserPassword(passwordData.newPassword);

    if (authError) {
      setPasswordError('Failed to update password. Please try again.');
    } else {
      setPasswordSuccess('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    setIsChangingPassword(false);
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, text: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, text: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, text: 'Good', color: 'bg-blue-500' };
    return { strength, text: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  return (
    <div className="p-6 space-y-8">
      {/* Password Security */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Lock className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Password Security</h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {passwordData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Password strength:</span>
                  <span className={`font-medium ${
                    passwordStrength.strength <= 2 ? 'text-red-600' :
                    passwordStrength.strength <= 3 ? 'text-yellow-600' :
                    passwordStrength.strength <= 4 ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 rounded-md p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center">
                <CheckCircle className={`w-4 h-4 mr-2 ${passwordData.newPassword.length >= 8 ? 'text-green-500' : 'text-gray-300'}`} />
                At least 8 characters long
              </li>
              <li className="flex items-center">
                <CheckCircle className={`w-4 h-4 mr-2 ${/[A-Z]/.test(passwordData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                One uppercase letter
              </li>
              <li className="flex items-center">
                <CheckCircle className={`w-4 h-4 mr-2 ${/[a-z]/.test(passwordData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                One lowercase letter
              </li>
              <li className="flex items-center">
                <CheckCircle className={`w-4 h-4 mr-2 ${/\d/.test(passwordData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                One number
              </li>
            </ul>
          </div>

          {/* Error/Success Messages */}
          {passwordError && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-sm text-green-700">{passwordSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Key className="w-4 h-4" />
            <span>{isChangingPassword ? 'Updating...' : 'Update Password'}</span>
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user?.mfaEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Add an extra layer of security to your account by requiring a code from your mobile device when signing in.
          </p>

          <div className="flex items-center space-x-4">
            <Smartphone className="w-8 h-8 text-blue-600" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Authenticator App</h4>
              <p className="text-sm text-gray-500">
                Use an app like Google Authenticator or Authy
              </p>
            </div>
            <button className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              user?.mfaEnabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
              {user?.mfaEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      </div>

      {/* Login History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Login Activity</h3>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            View All
          </button>
        </div>

        <div className="space-y-4">
          {loginHistory.map((login) => (
            <div key={login.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-2 h-2 rounded-full ${login.success ? 'bg-green-500' : 'bg-red-500'}`} />
                <Monitor className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{login.device}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{login.location}</span>
                    <span>•</span>
                    <span>{login.ip}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-900">
                  {new Date(login.timestamp).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(login.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
          <h3 className="text-lg font-semibold text-yellow-800">Security Recommendations</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Strong Password</p>
              <p className="text-xs text-gray-600">Your password meets security requirements</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-4 h-4 border-2 border-gray-300 rounded-full mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Enable Two-Factor Authentication</p>
              <p className="text-xs text-gray-600">Add an extra layer of security to your account</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Regular Password Updates</p>
              <p className="text-xs text-gray-600">Last updated recently</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySection;