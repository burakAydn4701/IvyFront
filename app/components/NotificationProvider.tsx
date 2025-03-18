'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { getConsumer } from '@/utils/cable';

interface NotificationContextType {
  unreadCount: number;
  chatUnreadCounts: Record<string, number>;
  setUnreadCount: (count: number) => void;
  markMessagesRead: (chatId: string) => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Update notification data interface
interface NotificationData {
  type: string;
  unread_count: number;
  chat_id?: string;
  chat_unread_counts?: Record<string, number>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [chatUnreadCounts, setChatUnreadCounts] = useState<Record<string, number>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/message_notifications/count', {
        credentials: 'include'
      });
      
      if (response.status === 404) {
        console.warn('Message count endpoint not found. Please ensure the API endpoint is set up correctly.');
        setUnreadCount(0);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // The endpoint now returns a total unread count directly
      if (typeof data.unread_count === 'number') {
        setUnreadCount(data.unread_count);
      } else {
        console.warn('Unexpected response format from count endpoint:', data);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      setUnreadCount(0);
    }
  };

  const markMessagesRead = async (chatId: string) => {
    try {
      const response = await fetch(`/api/message_notifications/mark_read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ chat_id: chatId })
      });

      if (response.status === 404) {
        console.warn('Mark messages read endpoint not found. Please ensure the API endpoint is set up correctly.');
        // Still update local state to prevent UI issues
        setChatUnreadCounts(prev => ({
          ...prev,
          [chatId]: 0
        }));
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update the unread counts
      setChatUnreadCounts(prev => ({
        ...prev,
        [chatId]: 0
      }));

      // Fetch updated counts after marking as read
      await fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      // Still update local state to prevent UI issues
      setChatUnreadCounts(prev => ({
        ...prev,
        [chatId]: 0
      }));
    }
  };

  useEffect(() => {
    // Initial fetch of unread count
    fetchUnreadCount();

    // Check current notification permission
    setNotificationPermission(Notification.permission);

    // Set up WebSocket subscription
    const consumer = getConsumer();
    if (!consumer) return;

    const handleNotification = (data: NotificationData) => {
      console.log('Received notification:', data);
      
      if (data.type === 'unread_count') {
        setUnreadCount(data.unread_count);
      } else if (data.type === 'new_message') {
        // Update individual chat unread count if provided
        if (data.chat_id && data.chat_unread_counts) {
          setChatUnreadCounts(data.chat_unread_counts);
        }

        // Show notification if permission is granted and tab is not active
        if (notificationPermission === 'granted' && document.hidden) {
          new Notification('New Message', {
            body: 'You have a new message',
            icon: '/icon.png'
          });
        }
      }
    };

    const subscription = consumer.subscriptions.create(
      { channel: "NotificationChannel" },
      {
        received: handleNotification
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [notificationPermission]);

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      chatUnreadCounts, 
      setUnreadCount, 
      markMessagesRead,
      requestNotificationPermission // Expose this so it can be called on user interaction
    }}>
      {children}
    </NotificationContext.Provider>
  );
} 