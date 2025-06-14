// src/hooks/use-notifications.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppNotification, NotificationCategory } from '@/types/notifications';
import { initialNotificationsData } from '@/data/notifications';
import { FileText, Zap, UserCircle, Info, Lightbulb, AlertTriangle, Settings, Bell } from 'lucide-react';

const NOTIFICATIONS_STORAGE_KEY = 'testprep_ai_notifications_v1';

const categoryIconsMap: Record<NotificationCategory, React.ElementType> = {
  system: Info,
  test_activity: FileText,
  account: UserCircle,
  feature_update: Zap,
  tip: Lightbulb,
  error: AlertTriangle,
};

// Helper function to ensure notifications have proper icon components
const mapNotificationsWithIcons = (notificationsData: Omit<AppNotification, 'icon'>[] | AppNotification[]): AppNotification[] => {
  return notificationsData.map(n => {
    // If the original n has an icon component (e.g. from initialNotificationsData), use it.
    // Otherwise, derive from category. This handles both initial seeding and loading from storage.
    let iconComponent: React.ElementType | undefined;
    if ('icon' in n && typeof n.icon === 'function') { // Check if n.icon is already a component
        iconComponent = n.icon;
    }
    return {
      ...n,
      icon: iconComponent || categoryIconsMap[n.category as NotificationCategory] || Bell,
    };
  });
};


export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window === 'undefined') {
      return mapNotificationsWithIcons(initialNotificationsData);
    }
    try {
      const storedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (storedNotifications) {
        // Data from localStorage won't have function components for icons.
        const parsedNotifications = JSON.parse(storedNotifications) as Omit<AppNotification, 'icon'>[];
        return mapNotificationsWithIcons(parsedNotifications);
      }
    } catch (error) {
      console.error("Error reading notifications from localStorage:", error);
    }
    // Seed initial data if localStorage is empty or invalid
    const seededData = mapNotificationsWithIcons(initialNotificationsData);
    // Store only serializable data (without icon components)
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(
      seededData.map(({ icon, ...rest }) => rest)
    ));
    return seededData;
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);
  }, []);


  const saveNotifications = useCallback((updatedNotifications: AppNotification[]) => {
    if (typeof window !== 'undefined') {
      try {
        // Strip icon components before saving to localStorage
        const storableNotifications = updatedNotifications.map(({ icon, ...rest }) => rest);
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(storableNotifications));
      } catch (error) {
        console.error("Error saving notifications to localStorage:", error);
      }
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, [saveNotifications]);

  const addNotification = useCallback((newNotificationData: Omit<AppNotification, 'id' | 'date' | 'icon'>) => {
    setNotifications(prev => {
      const newNotification: AppNotification = {
        ...newNotificationData,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        date: new Date().toISOString(),
        category: newNotificationData.category as NotificationCategory, // Ensure category type
        icon: categoryIconsMap[newNotificationData.category as NotificationCategory] || Bell,
      };
      const updated = [newNotification, ...prev];
      saveNotifications(updated); // saveNotifications will strip 'icon' before localStorage
      return updated;
    });
  }, [saveNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === NOTIFICATIONS_STORAGE_KEY && event.newValue) {
        try {
          const parsedNotifications = JSON.parse(event.newValue) as Omit<AppNotification, 'icon'>[];
          setNotifications(mapNotificationsWithIcons(parsedNotifications));
        } catch (error) {
          console.error("Error parsing storage update for notifications:", error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isInitialized]);
  
  const getIcon = useCallback((categoryOrNotification: NotificationCategory | AppNotification): React.ElementType => {
    if (typeof categoryOrNotification === 'string') {
        return categoryIconsMap[categoryOrNotification] || Bell;
    }
    // If it's an AppNotification object, it should already have the icon component.
    // Fallback just in case.
    return categoryOrNotification.icon || categoryIconsMap[categoryOrNotification.category] || Bell;
  }, []);


  return {
    notifications: isInitialized ? notifications : mapNotificationsWithIcons(initialNotificationsData),
    unreadCount: isInitialized ? unreadCount : initialNotificationsData.filter(n => !n.read).length,
    markAsRead,
    deleteNotification,
    clearAllNotifications,
    addNotification,
    getIconForCategory: getIcon, // Renamed for clarity, can take category string or full notification
  };
}
