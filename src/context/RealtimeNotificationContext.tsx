import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeNotification {
  id: string;
  user_id: string;
  laboratory_id?: string;
  type: 'NEW_INVOICE' | 'PAYMENT_RECEIVED' | 'INVOICE_OVERDUE' | 'INVOICE_DISPUTED' | 
        'MESSAGE_RECEIVED' | 'SYSTEM_UPDATE' | 'PAYMENT_FAILED' | 'CLIENT_ACTION';
  title: string;
  message: string;
  link_to?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  id: string;
  actor_id?: string;
  laboratory_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface RealtimeNotificationContextType {
  notifications: RealtimeNotification[];
  unreadCount: number;
  isLoading: boolean;
  activityLog: ActivityLogEntry[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshActivityLog: () => Promise<void>;
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextType | undefined>(undefined);

export const RealtimeNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const activityChannelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to load notifications');
      } else {
        setNotifications(data || []);
        const unread = (data || []).filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Unexpected error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch activity log for admins
  const fetchActivityLog = useCallback(async () => {
    if (!user?.id || !['admin', 'superadmin'].includes(user.role || '')) return;

    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('laboratory_id', user.laboratory_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching activity log:', error);
      } else {
        setActivityLog(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching activity log:', err);
    }
  }, [user?.id, user?.role, user?.laboratory_id]);

  // Set up realtime subscription for notifications
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    // Fetch initial data
    fetchNotifications();
    fetchActivityLog();

    // Set up realtime subscription for notifications
    const notificationChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload.new);
          const newNotification = payload.new as RealtimeNotification;
          
          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);
          
          // Update unread count
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
          
          // Show toast notification
          toast(newNotification.message, {
            icon: getNotificationIcon(newNotification.type),
            duration: 5000,
          });
          
          // Play notification sound if enabled
          playNotificationSound();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as RealtimeNotification;
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          
          // Recalculate unread count
          setNotifications(prev => {
            const unread = prev.filter(n => !n.is_read).length;
            setUnreadCount(unread);
            return prev;
          });
        }
      )
      .subscribe();

    channelRef.current = notificationChannel;

    // Set up realtime subscription for activity log (admins only)
    if (['admin', 'superadmin'].includes(user.role || '')) {
      const activityChannel = supabase
        .channel(`activity:${user.laboratory_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_log',
            filter: `laboratory_id=eq.${user.laboratory_id}`,
          },
          (payload) => {
            console.log('New activity logged:', payload.new);
            const newActivity = payload.new as ActivityLogEntry;
            setActivityLog(prev => [newActivity, ...prev].slice(0, 100)); // Keep last 100
          }
        )
        .subscribe();

      activityChannelRef.current = activityChannel;
    }

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (activityChannelRef.current) {
        supabase.removeChannel(activityChannelRef.current);
        activityChannelRef.current = null;
      }
    };
  }, [user?.id, user?.role, user?.laboratory_id, fetchNotifications, fetchActivityLog]);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: id
      });

      if (error) {
        console.error('Error marking notification as read:', error);
        toast.error('Failed to mark notification as read');
      } else {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Unexpected error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { data, error } = await supabase.rpc('mark_all_notifications_read');

      if (error) {
        console.error('Error marking all notifications as read:', error);
        toast.error('Failed to mark all notifications as read');
      } else {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
        toast.success(`Marked ${data} notifications as read`);
      }
    } catch (err) {
      console.error('Unexpected error marking all as read:', err);
    }
  };

  // Delete a notification
  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting notification:', error);
        toast.error('Failed to delete notification');
      } else {
        setNotifications(prev => {
          const notification = prev.find(n => n.id === id);
          if (notification && !notification.is_read) {
            setUnreadCount(count => Math.max(0, count - 1));
          }
          return prev.filter(n => n.id !== id);
        });
      }
    } catch (err) {
      console.error('Unexpected error deleting notification:', err);
    }
  };

  // Refresh notifications manually
  const refreshNotifications = async () => {
    setIsLoading(true);
    await fetchNotifications();
  };

  // Refresh activity log manually
  const refreshActivityLog = async () => {
    await fetchActivityLog();
  };

  const value: RealtimeNotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    activityLog,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    refreshActivityLog,
  };

  return (
    <RealtimeNotificationContext.Provider value={value}>
      {children}
    </RealtimeNotificationContext.Provider>
  );
};

export const useRealtimeNotifications = () => {
  const context = useContext(RealtimeNotificationContext);
  if (context === undefined) {
    throw new Error('useRealtimeNotifications must be used within a RealtimeNotificationProvider');
  }
  return context;
};

// Helper function to get notification icon based on type
function getNotificationIcon(type: RealtimeNotification['type']): string {
  switch (type) {
    case 'NEW_INVOICE':
      return '📄';
    case 'PAYMENT_RECEIVED':
      return '💰';
    case 'INVOICE_OVERDUE':
      return '⚠️';
    case 'INVOICE_DISPUTED':
      return '⚡';
    case 'MESSAGE_RECEIVED':
      return '💬';
    case 'SYSTEM_UPDATE':
      return '🔔';
    case 'PAYMENT_FAILED':
      return '❌';
    case 'CLIENT_ACTION':
      return '👤';
    default:
      return '📢';
  }
}

// Helper function to play notification sound
function playNotificationSound() {
  // Check if user has enabled sound notifications (could be stored in localStorage)
  const soundEnabled = localStorage.getItem('notificationSound') !== 'false';
  
  if (soundEnabled && typeof Audio !== 'undefined') {
    try {
      // Use a simple notification sound (you can replace with your own sound file)
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQYGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiS2Oy9diMFl2z4+vc');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors - user might not have interacted with page yet
      });
    } catch (err) {
      // Ignore audio errors
    }
  }
}