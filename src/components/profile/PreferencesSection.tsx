import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Bell, 
  Moon, 
  Sun, 
  Globe,
  Calendar,
  DollarSign,
  Mail,
  Smartphone,
  Monitor,
  Save,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileService, UserPreferences } from '../../api/services/profile.service';

const PreferencesSection: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    // Display preferences
    theme: 'light',
    language: 'en',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    currency: 'USD',
    timezone: 'America/New_York',
    
    // Dashboard preferences
    dashboardLayout: 'grid',
    defaultPage: 'dashboard',
    itemsPerPage: 25,
    showWelcomeMessage: true,
    
    // Notification preferences
    emailNotifications: {
      newInvoices: true,
      paymentReceived: true,
      overdueReminders: true,
      systemUpdates: false,
      weeklyReports: true,
      securityAlerts: true
    },
    pushNotifications: {
      enabled: true,
      urgentOnly: false,
      soundEnabled: true
    },
    
    // Privacy preferences
    profileVisibility: 'organization',
    activityTracking: true,
    dataSharing: false
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data, error } = await profileService.getUserPreferences(user.id);
        
        if (error) {
          console.error('Failed to load preferences:', error);
        } else if (data) {
          setPreferences(data);
        }
      } catch (error) {
        console.error('Load preferences error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const handleInputChange = (section: string, field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' 
        ? { ...prev[section], [field]: value }
        : value
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    
    try {
      const { error } = await profileService.saveUserPreferences(user.id, preferences);
      
      if (error) {
        console.error('Failed to save preferences:', error);
        // TODO: Show error notification
      } else {
        console.log('Preferences saved successfully');
        // TODO: Show success notification
      }
    } catch (error) {
      console.error('Save preferences error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
  ];

  const currencies = [
    { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
    { value: 'EUR', label: 'Euro (€)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  ];

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Display Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Monitor className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Display Preferences</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Theme
            </label>
            <div className="flex space-x-4">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'auto', label: 'System', icon: Monitor }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleInputChange('theme', '', value)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    preferences.theme === value
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <select
                value={preferences.language}
                onChange={(e) => handleInputChange('language', '', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {languages.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={preferences.dateFormat}
                onChange={(e) => handleInputChange('dateFormat', '', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="MM/dd/yyyy">MM/DD/YYYY (12/31/2024)</option>
                <option value="dd/MM/yyyy">DD/MM/YYYY (31/12/2024)</option>
                <option value="yyyy-MM-dd">YYYY-MM-DD (2024-12-31)</option>
              </select>
            </div>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Format
            </label>
            <select
              value={preferences.timeFormat}
              onChange={(e) => handleInputChange('timeFormat', '', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="12h">12-hour (2:30 PM)</option>
              <option value="24h">24-hour (14:30)</option>
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <select
                value={preferences.currency}
                onChange={(e) => handleInputChange('currency', '', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {currencies.map(currency => (
                  <option key={currency.value} value={currency.value}>{currency.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <select
                value={preferences.timezone}
                onChange={(e) => handleInputChange('timezone', '', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Settings className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Dashboard Preferences</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Default Page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Landing Page
            </label>
            <select
              value={preferences.defaultPage}
              onChange={(e) => handleInputChange('defaultPage', '', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="dashboard">Dashboard</option>
              <option value="invoices">Invoices</option>
              <option value="clients">Clients</option>
              <option value="reports">Reports</option>
            </select>
          </div>

          {/* Items Per Page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items Per Page
            </label>
            <select
              value={preferences.itemsPerPage}
              onChange={(e) => handleInputChange('itemsPerPage', '', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Dashboard Layout */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Dashboard Layout
            </label>
            <div className="flex space-x-4">
              {[
                { value: 'grid', label: 'Grid View' },
                { value: 'list', label: 'List View' },
                { value: 'compact', label: 'Compact View' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleInputChange('dashboardLayout', '', value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    preferences.dashboardLayout === value
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Show Welcome Message */}
          <div className="md:col-span-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={preferences.showWelcomeMessage}
                onChange={(e) => handleInputChange('showWelcomeMessage', '', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Show welcome message on dashboard</span>
            </label>
          </div>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Mail className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
        </div>

        <div className="space-y-4">
          {Object.entries({
            newInvoices: 'New invoices created',
            paymentReceived: 'Payments received',
            overdueReminders: 'Overdue payment reminders',
            systemUpdates: 'System updates and maintenance',
            weeklyReports: 'Weekly summary reports',
            securityAlerts: 'Security alerts and login notifications'
          }).map(([key, label]) => (
            <label key={key} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={preferences.emailNotifications[key as keyof typeof preferences.emailNotifications]}
                onChange={(e) => handleInputChange('emailNotifications', key, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Bell className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.pushNotifications.enabled}
              onChange={(e) => handleInputChange('pushNotifications', 'enabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable browser push notifications</span>
          </label>

          {preferences.pushNotifications.enabled && (
            <>
              <label className="flex items-center space-x-3 ml-6">
                <input
                  type="checkbox"
                  checked={preferences.pushNotifications.urgentOnly}
                  onChange={(e) => handleInputChange('pushNotifications', 'urgentOnly', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Only urgent notifications</span>
              </label>

              <label className="flex items-center space-x-3 ml-6">
                <input
                  type="checkbox"
                  checked={preferences.pushNotifications.soundEnabled}
                  onChange={(e) => handleInputChange('pushNotifications', 'soundEnabled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  {preferences.pushNotifications.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-gray-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700">Notification sounds</span>
                </div>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Privacy Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Settings className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Privacy Preferences</h3>
        </div>

        <div className="space-y-6">
          {/* Profile Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Visibility
            </label>
            <select
              value={preferences.profileVisibility}
              onChange={(e) => handleInputChange('profileVisibility', '', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="organization">Organization members only</option>
              <option value="team">Team members only</option>
              <option value="private">Private (only me)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Control who can see your profile information
            </p>
          </div>

          {/* Activity Tracking */}
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.activityTracking}
              onChange={(e) => handleInputChange('activityTracking', '', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Allow activity tracking</span>
              <p className="text-xs text-gray-500">Help us improve your experience with usage analytics</p>
            </div>
          </label>

          {/* Data Sharing */}
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.dataSharing}
              onChange={(e) => handleInputChange('dataSharing', '', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Share anonymized data</span>
              <p className="text-xs text-gray-500">Help improve our product with anonymized usage data</p>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save All Preferences'}</span>
        </button>
      </div>
    </div>
  );
};

export default PreferencesSection;