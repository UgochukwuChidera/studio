import type { AppNotification } from '@/types/notifications';
import { FileText, Zap, UserCircle, Info, Lightbulb, AlertTriangle, Settings } from 'lucide-react';

export const initialNotificationsData: AppNotification[] = [
  {
    id: 'testgen1',
    title: 'Math Test Generated',
    description: 'Your new Algebra test with 15 MCQs is ready in My Materials.',
    href: '/my-tests',
    read: false,
    date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    category: 'test_activity',
    icon: FileText,
  },
  {
    id: 'featureup1',
    title: 'New Feature: Dark Mode!',
    description: 'You can now switch to Dark Mode in settings for a new look.',
    href: '/settings',
    read: true,
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    category: 'feature_update',
    icon: Zap,
  },
  {
    id: 'welcome1',
    title: 'Welcome to TestPrep AI!',
    description: 'Explore features and start generating your study materials.',
    href: '/ai-content-generator',
    read: false,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    category: 'system',
    icon: Info,
  },
  {
    id: 'tip1',
    title: 'Study Tip: Use Flashcards',
    description: 'Generate flashcards from your notes for quick reviews.',
    href: '/ai-content-generator',
    read: true,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    category: 'tip',
    icon: Lightbulb,
  },
  {
    id: 'account1',
    title: 'Password Updated',
    description: 'Your account password was successfully changed.',
    href: '/settings',
    read: true,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    category: 'account',
    icon: UserCircle,
  },
   {
    id: 'error1',
    title: 'Generation Failed',
    description: 'Failed to generate notes for "Quantum Physics". Please try again.',
    href: '/ai-content-generator',
    read: false,
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    category: 'error',
    icon: AlertTriangle,
  },
   {
    id: 'systemMaintenance',
    title: 'Scheduled Maintenance',
    description: 'Brief maintenance on Sunday at 2 AM UTC. Services might be temporarily unavailable.',
    read: true,
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    category: 'system',
    icon: Settings,
  },
];
