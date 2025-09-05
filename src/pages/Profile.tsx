import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Shield,
  Settings,
  Activity,
  Building,
  Command,
  Search,
  ChevronRight,
  Award,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Palette,
  Bell,
  Key,
  Lock,
  Mail,
  Phone,
  Calendar,
  BarChart3,
  Zap,
  ArrowUp,
  FileText,
  Users,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { supabase } from '../api/supabase';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

// Command Palette for quick actions
interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  category: 'security' | 'preferences' | 'data' | 'navigation';
  keywords: string[];
}

// Profile completion tracking
interface ProfileCompletionItem {
  id: string;
  label: string;
  completed: boolean;
  points: number;
  action?: () => void;
}

// Activity metrics
interface ActivityMetric {
  label: string;
  value: number;
  change: number;
  icon: React.ElementType;
  color: string;
}

// Type for recent activity log
interface RecentActivityItem {
  id: number;
  action: string;
  timestamp: Date;
  ip?: string;
  device?: string;
  details?: string;
  changes?: string;
}

// Type for the active view
type ProfileView = 'overview' | 'security' | 'preferences' | 'activity';

const Profile: React.FC = () => {
  const { user, session, logout } = useAuth();
  const { currentTenant } = useTenant();
  
  // State management
  const [activeView, setActiveView] = useState<ProfileView>('overview');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [securityScore, setSecurityScore] = useState(0);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  
  // Activity metrics state
  const [activityMetrics, setActivityMetrics] = useState<ActivityMetric[]>([
    { label: 'Invoices Created', value: 0, change: 0, icon: FileText, color: 'text-blue-600' },
    { label: 'Clients Managed', value: 0, change: 0, icon: Users, color: 'text-green-600' },
    { label: 'Revenue Processed', value: 0, change: 0, icon: DollarSign, color: 'text-purple-600' },
    { label: 'Tasks Completed', value: 0, change: 0, icon: CheckCircle, color: 'text-yellow-600' }
  ]);

  // Quick actions for command palette
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'enable-2fa',
      label: 'Enable Two-Factor Authentication',
      icon: Shield,
      action: () => handleEnable2FA(),
      category: 'security',
      keywords: ['2fa', 'security', 'authentication', 'two factor']
    },
    {
      id: 'change-password',
      label: 'Change Password',
      icon: Key,
      action: () => handleChangePassword(),
      category: 'security',
      keywords: ['password', 'security', 'reset']
    },
    {
      id: 'toggle-theme',
      label: 'Toggle Dark Mode',
      icon: Palette,
      action: () => handleToggleTheme(),
      category: 'preferences',
      keywords: ['theme', 'dark', 'light', 'appearance']
    },
    {
      id: 'export-data',
      label: 'Export My Data',
      icon: FileText,
      action: () => handleExportData(),
      category: 'data',
      keywords: ['export', 'download', 'data', 'backup']
    },
    {
      id: 'view-invoices',
      label: 'Go to Invoices',
      icon: FileText,
      action: () => window.location.href = '/invoices',
      category: 'navigation',
      keywords: ['invoices', 'billing', 'navigate']
    }
  ], []);

  // Profile completion items
  const completionItems: ProfileCompletionItem[] = useMemo(() => [
    { id: 'avatar', label: 'Add profile photo', completed: false, points: 10 },
    { id: 'phone', label: 'Add phone number', completed: !!user?.phone, points: 15 },
    { id: '2fa', label: 'Enable 2FA', completed: user?.mfaEnabled || false, points: 25 },
    { id: 'preferences', label: 'Set preferences', completed: false, points: 10 },
    { id: 'backup-email', label: 'Add backup email', completed: false, points: 15 }
  ], [user]);

  // Calculate profile completion
  useEffect(() => {
    const totalPoints = completionItems.reduce((sum, item) => sum + item.points, 0);
    const earnedPoints = completionItems.filter(item => item.completed).reduce((sum, item) => sum + item.points, 0);
    setProfileCompletion(Math.round((earnedPoints / totalPoints) * 100));
  }, [completionItems]);

  // Calculate security score
  useEffect(() => {
    let score = 40; // Base score for having an account
    if (user?.mfaEnabled) score += 30; // Corrected from mfa_enabled
    if (user?.phone) score += 10;
    if (session?.user?.confirmed_at) score += 10;
    // Add points for recent password change (mock)
    score += 10;
    setSecurityScore(score);
  }, [user, session]);

  // Fetch recent activity
  useEffect(() => {
    fetchRecentActivity();
    fetchActivityMetrics();
  }, []);

  const fetchRecentActivity = async () => {
    // Mock data for now - replace with actual API call
    setRecentActivity([
      { id: 1, action: 'Login', timestamp: new Date(Date.now() - 1000 * 60 * 30), ip: '192.168.1.1', device: 'Chrome on Windows' },
      { id: 2, action: 'Created Invoice #1234', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), details: 'Amount: $5,420.00' },
      { id: 3, action: 'Updated Profile', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), changes: 'Phone number added' },
      { id: 4, action: 'Password Changed', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), ip: '192.168.1.1' }
    ]);
  };

  const fetchActivityMetrics = async () => {
    // Mock data - replace with actual metrics
    setActivityMetrics([
      { label: 'Invoices Created', value: 47, change: 12, icon: FileText, color: 'text-blue-600' },
      { label: 'Clients Managed', value: 23, change: 3, icon: Users, color: 'text-green-600' },
      { label: 'Revenue Processed', value: 125420, change: 15, icon: DollarSign, color: 'text-purple-600' },
      { label: 'Tasks Completed', value: 89, change: -5, icon: CheckCircle, color: 'text-yellow-600' }
    ]);
  };

  // Auto-save handler
  const handleAutoSave = useCallback(async (field: string, value: any) => {
    setIsAutoSaving(true);
    try {
      // Implement actual save logic here
      await new Promise(resolve => setTimeout(resolve, 500)); // Mock delay
      setLastSaved(new Date());
      toast.success('Changes saved automatically');
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setIsAutoSaving(false);
    }
  }, []);

  // Action handlers
  const handleEnable2FA = () => {
    setActiveView('security');
    toast.success('Opening 2FA setup...');
  };

  const handleChangePassword = () => {
    setActiveView('security');
    toast.success('Opening password change...');
  };

  const handleToggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    toast.success('Theme toggled');
  };

  const handleExportData = async () => {
    toast.success('Preparing your data export...');
    // Implement actual export logic
  };

  // Filter quick actions based on search
  const filteredActions = useMemo(() => {
    if (!commandSearch) return quickActions;
    const search = commandSearch.toLowerCase();
    return quickActions.filter(action =>
      action.label.toLowerCase().includes(search) ||
      action.keywords.some(keyword => keyword.includes(search))
    );
  }, [commandSearch, quickActions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const tabItems: { id: ProfileView; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Command Palette */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20"
            onClick={() => setIsCommandPaletteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="p-4 border-b">
                <div className="flex items-center space-x-3">
                  <Search className="h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Type a command or search..."
                    className="flex-1 outline-none text-lg"
                    value={commandSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCommandSearch(e.target.value)}
                    autoFocus
                  />
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">ESC</kbd>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {filteredActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.action();
                      setIsCommandPaletteOpen(false);
                      setCommandSearch('');
                    }}
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <action.icon className="h-5 w-5 text-gray-500" />
                    <span className="flex-1 text-left">{action.label}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section - What the user DOES, not who they ARE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-6">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{user?.name || 'User'}</h1>
                <p className="text-gray-600">{user?.role || 'Role'} at {currentTenant?.name || 'Organization'}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {user?.email}
                  </span>
                  {user?.phone && (
                    <span className="text-sm text-gray-500 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Activity Metrics - What they've DONE */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {activityMetrics.map((metric, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  <span className={`text-xs font-medium flex items-center ${
                    metric.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : null}
                    {Math.abs(metric.change)}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {metric.label.includes('Revenue') ? `$${metric.value.toLocaleString()}` : metric.value}
                </div>
                <div className="text-xs text-gray-600">{metric.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Profile Completion & Security Score */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Profile Completion</span>
                <span className="text-lg font-bold text-blue-600">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-white rounded-full h-2 mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                />
              </div>
              <div className="text-xs text-gray-600">
                Complete your profile to unlock all features
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Security Score</span>
                <span className="text-lg font-bold text-green-600">{securityScore}/100</span>
              </div>
              <div className="w-full bg-white rounded-full h-2 mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${securityScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-2 rounded-full ${
                    securityScore >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    securityScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                    'bg-gradient-to-r from-red-500 to-pink-500'
                  }`}
                />
              </div>
              <div className="text-xs text-gray-600">
                {securityScore >= 80 ? 'Excellent security posture' :
                 securityScore >= 60 ? 'Good, but room for improvement' :
                 'Action needed to secure your account'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex items-center space-x-1 p-2">
            {tabItems.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  activeView === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-3 gap-6"
            >
              {/* Recent Activity Timeline */}
              <div className="col-span-2 bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-500" />
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className={`h-2 w-2 rounded-full mt-2 ${
                        activity.action.includes('Login') ? 'bg-blue-500' :
                        activity.action.includes('Created') ? 'bg-green-500' :
                        activity.action.includes('Updated') ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{activity.action}</div>
                        {activity.details && (
                          <div className="text-sm text-gray-600">{activity.details}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                          {activity.ip && ` • IP: ${activity.ip}`}
                          {activity.device && ` • ${activity.device}`}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Quick Actions & Suggestions */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                  Suggested Actions
                </h2>
                <div className="space-y-3">
                  {completionItems.filter(item => !item.completed).map(item => (
                    <button
                      key={item.id}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{item.label}</span>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          +{item.points} pts
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Achievement Badges */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Achievements</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                      <Award className="h-3 w-3 mr-1" />
                      Early Adopter
                    </div>
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified User
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>
              {/* Security content here */}
              <div className="space-y-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">Two-Factor Authentication Not Enabled</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Protect your account with an additional layer of security
                      </div>
                      <button className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                        Enable 2FA Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'preferences' && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">Preferences</h2>
              {/* Preferences content here */}
            </motion.div>
          )}

          {activeView === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">Activity Analytics</h2>
              {/* Activity charts and detailed logs here */}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auto-save indicator */}
        <div className="fixed bottom-4 right-4 flex items-center space-x-2 bg-white rounded-lg shadow-lg px-4 py-2">
          {isAutoSaving ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-600">Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">
                Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
