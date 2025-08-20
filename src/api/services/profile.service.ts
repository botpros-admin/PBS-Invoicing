import { supabase } from '../supabase';
import { AppUser } from '../../types';

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
  department?: string;
  location?: string;
  timezone?: string;
  bio?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  timezone: string;
  dashboardLayout: 'grid' | 'list' | 'compact';
  defaultPage: string;
  itemsPerPage: number;
  showWelcomeMessage: boolean;
  emailNotifications: {
    newInvoices: boolean;
    paymentReceived: boolean;
    overdueReminders: boolean;
    systemUpdates: boolean;
    weeklyReports: boolean;
    securityAlerts: boolean;
  };
  pushNotifications: {
    enabled: boolean;
    urgentOnly: boolean;
    soundEnabled: boolean;
  };
  profileVisibility: 'organization' | 'team' | 'private';
  activityTracking: boolean;
  dataSharing: boolean;
}

class ProfileService {
  /**
   * Upload avatar to Supabase storage
   */
  async uploadAvatar(userId: string, file: File): Promise<{ error?: Error; avatarUrl?: string }> {
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      // Update user avatar in database
      const { error: updateError } = await supabase
        .from(userId.startsWith('client_') ? 'client_users' : 'users')
        .update({ avatar: publicUrl })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      return { avatarUrl: publicUrl };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(userId: string, userType: 'staff' | 'client', data: ProfileUpdateData): Promise<{ error?: Error }> {
    try {
      const tableName = userType === 'staff' ? 'users' : 'client_users';
      
      const { error } = await supabase
        .from(tableName)
        .update({
          name: data.name,
          phone: data.phone,
          department: data.department,
          location: data.location,
          timezone: data.timezone,
          bio: data.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<{ data?: UserPreferences; error?: Error }> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK, we'll use defaults
        throw error;
      }

      return { data: data?.preferences || this.getDefaultPreferences() };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<{ error?: Error }> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Get user activity log
   */
  async getUserActivity(userId: string, limit = 50): Promise<{ data?: any[]; error?: Error }> {
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return { data: data || [] };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Log user activity
   */
  async logActivity(userId: string, activityType: string, description: string, metadata?: any): Promise<{ error?: Error }> {
    try {
      const { error } = await supabase
        .from('user_activity')
        .insert({
          user_id: userId,
          activity_type: activityType,
          description,
          metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Get user usage statistics
   */
  async getUserStats(userId: string): Promise<{ data?: any; error?: Error }> {
    try {
      // This would typically call a stored procedure or function
      // For now, we'll simulate the data
      const mockStats = {
        totalLogins: 87,
        invoicesCreated: 23,
        paymentsProcessed: 15,
        reportsGenerated: 12,
        averageSessionTime: '2h 34m',
        lastActiveDate: new Date().toISOString(),
        mostUsedFeature: 'Invoice Management',
        productivityScore: 92
      };

      return { data: mockStats };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Delete avatar
   */
  async deleteAvatar(userId: string, avatarUrl?: string): Promise<{ error?: Error }> {
    try {
      if (avatarUrl) {
        // Extract file path from URL
        const pathMatch = avatarUrl.match(/avatars\/(.+)$/);
        if (pathMatch) {
          const { error: deleteError } = await supabase.storage
            .from('user-avatars')
            .remove([`avatars/${pathMatch[1]}`]);

          if (deleteError) {
          }
        }
      }

      // Update user record to remove avatar
      const { error } = await supabase
        .from(userId.startsWith('client_') ? 'client_users' : 'users')
        .update({ avatar: null })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      language: 'en',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      currency: 'USD',
      timezone: 'America/New_York',
      dashboardLayout: 'grid',
      defaultPage: 'dashboard',
      itemsPerPage: 25,
      showWelcomeMessage: true,
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
      profileVisibility: 'organization',
      activityTracking: true,
      dataSharing: false
    };
  }
}

export const profileService = new ProfileService();
export default profileService;