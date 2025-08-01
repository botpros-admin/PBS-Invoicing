import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CreditCard, Bell, Settings, X, Check, Info } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { format } from 'date-fns';
import Modal from './Modal';

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { notifications, markAsRead, markAllAsRead, notificationPreferences, updateNotificationPreferences } = useNotifications();
  const navigate = useNavigate();
  const [showAllNotificationsModal, setShowAllNotificationsModal] = useState(false);
  const [showPreferencesTab, setShowPreferencesTab] = useState(false);
  const [tempPreferences, setTempPreferences] = useState(notificationPreferences);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-dropdown')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    if (notification.invoiceId) {
      navigate(`/invoices/${notification.invoiceId}`);
    }
    
    onClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'dispute':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'payment':
        return <CreditCard size={16} className="text-green-500" />;
      default:
        return <Bell size={16} className="text-blue-500" />;
    }
  };

  const handleViewAllNotifications = () => {
    setShowAllNotificationsModal(true);
    setShowPreferencesTab(false);
  };

  const handleTogglePreference = (key: string) => {
    setTempPreferences({
      ...tempPreferences,
      [key]: !tempPreferences[key]
    });
  };

  const handleSavePreferences = () => {
    updateNotificationPreferences(tempPreferences);
    setShowPreferencesTab(false);
  };

  return (
    <>
      <div className="notification-dropdown absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-10 border border-gray-200">
        <div className="p-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium">Notifications</h3>
          <button 
            onClick={markAllAsRead}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Mark all as read
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications
            </div>
          ) : (
            notifications.slice(0, 5).map((notification) => (
              <div 
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  !notification.read ? 'bg-indigo-50' : ''
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm ${!notification.read ? 'font-medium' : 'text-gray-700'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(notification.date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="ml-2 flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-2 border-t border-gray-200 text-center">
          <button 
            onClick={handleViewAllNotifications}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            View all notifications
          </button>
        </div>
      </div>

      {/* All Notifications Modal */}
      <Modal
        isOpen={showAllNotificationsModal}
        onClose={() => setShowAllNotificationsModal(false)}
        title="Notifications"
        size="md"
      >
        <div className="mb-4 border-b border-gray-200">
          <div className="flex">
            <button
              className={`px-4 py-2 font-medium text-sm ${!showPreferencesTab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setShowPreferencesTab(false)}
            >
              All Notifications
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${showPreferencesTab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setShowPreferencesTab(true)}
            >
              Preferences
            </button>
          </div>
        </div>

        {showPreferencesTab ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select which notifications you'd like to receive:
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="invoice-created"
                      type="checkbox"
                      checked={tempPreferences.invoiceCreated}
                      onChange={() => handleTogglePreference('invoiceCreated')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="invoice-created" className="font-medium text-gray-700">Invoice Created</label>
                    <p className="text-gray-500">Receive notifications when new invoices are created</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="payment-received"
                      type="checkbox"
                      checked={tempPreferences.paymentReceived}
                      onChange={() => handleTogglePreference('paymentReceived')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="payment-received" className="font-medium text-gray-700">Payment Received</label>
                    <p className="text-gray-500">Receive notifications when payments are processed</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="invoice-disputed"
                      type="checkbox"
                      checked={tempPreferences.invoiceDisputed}
                      onChange={() => handleTogglePreference('invoiceDisputed')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="invoice-disputed" className="font-medium text-gray-700">Invoice Disputed</label>
                    <p className="text-gray-500">Receive notifications when invoices are disputed</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="invoice-overdue"
                      type="checkbox"
                      checked={tempPreferences.invoiceOverdue}
                      onChange={() => handleTogglePreference('invoiceOverdue')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="invoice-overdue" className="font-medium text-gray-700">Invoice Overdue</label>
                    <p className="text-gray-500">Receive notifications when invoices become overdue</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="system-updates"
                      type="checkbox"
                      checked={tempPreferences.systemUpdates}
                      onChange={() => handleTogglePreference('systemUpdates')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="system-updates" className="font-medium text-gray-700">System Updates</label>
                    <p className="text-gray-500">Receive notifications about system updates and maintenance</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    You can also receive these notifications via email by updating your email preferences in Settings.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowPreferencesTab(false)}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Preferences
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={markAllAsRead}
                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                <Check size={16} className="mr-1" />
                Mark all as read
              </button>
              <button
                onClick={() => setShowPreferencesTab(true)}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
              >
                <Settings size={16} className="mr-1" />
                Notification Settings
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className={`text-sm ${!notification.read ? 'font-medium' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(notification.date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="ml-2 flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default NotificationDropdown;