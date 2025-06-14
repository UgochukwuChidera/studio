import type { LucideIcon } from 'lucide-react';

export type NotificationCategory = 'system' | 'test_activity' | 'account' | 'feature_update' | 'tip' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  href?: string;
  read: boolean;
  date: string; // ISO string for consistent date handling
  category: NotificationCategory;
  icon?: LucideIcon; // Optional: specific icon override
}
