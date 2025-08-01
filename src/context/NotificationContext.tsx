import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notification } from '../types';
// Removed MOCK_NOTIFICATIONS import - Data should be fetched via API

interface NotificationPreferences {
  invoiceCreated: boolean;
  paymentReceived: boolean;
  invoiceDisputed: boolean;
  invoiceOverdue: boolean;
  systemUpdates: boolean;
  [key: string]: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (preferences: NotificationPreferences) => void;
}

const defaultPreferences: NotificationPreferences = {
  invoiceCreated: true,
  paymentReceived: true,
  invoiceDisputed: true,
  invoiceOverdue: true,
  systemUpdates: true
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // TODO: Replace with API call (e.g., using useQuery) to fetch notifications
  const [notifications, setNotifications] = useState<Notification[]>([]); 
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(defaultPreferences);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'read'>) => {
    // Check if the notification type is enabled in preferences
    let shouldAdd = true;
    
    if (notification.type === 'dispute' && !notificationPreferences.invoiceDisputed) {
      shouldAdd = false;
    } else if (notification.type === 'payment' && !notificationPreferences.paymentReceived) {
      shouldAdd = false;
    } else if (notification.type === 'system' && !notificationPreferences.systemUpdates) {
      shouldAdd = false;
    }
    
    if (shouldAdd) {
      const newNotification: Notification = {
        ...notification,
        id: `notification-${Date.now()}`,
        read: false,
      };
      setNotifications(prev => [newNotification, ...prev]);
    }
  };

  const updateNotificationPreferences = (preferences: NotificationPreferences) => {
    setNotificationPreferences(preferences);
    // In a real app, you would save these preferences to the backend
  };

  // In a real app, you would fetch notifications from the backend
  useEffect(() => {
    // Fetch notifications from API
    // For now, we'll use our mock data
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead, 
      addNotification,
      notificationPreferences,
      updateNotificationPreferences
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
