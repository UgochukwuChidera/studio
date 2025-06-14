
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BellRing, Trash2, Filter, XIcon, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { useNotifications } from '@/hooks/use-notifications';
import type { AppNotification, NotificationCategory } from '@/types/notifications';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(); // Fallback to full date for older notifications
}

const notificationCategories: NotificationCategory[] = ['system', 'test_activity', 'account', 'feature_update', 'tip', 'error'];

export default function NotificationsPage() {
  const { notifications, markAsRead, deleteNotification, clearAllNotifications, getIconForCategory } = useNotifications();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  const [filterCategory, setFilterCategory] = useState<NotificationCategory | 'all'>('all');
  const [filterReadStatus, setFilterReadStatus] = useState<'all' | 'read' | 'unread'>('all');

  React.useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/auth/signin');
    }
  }, [authIsLoading, isAuthenticated, router]);

  const sortedAndFilteredNotifications = useMemo(() => {
    return [...notifications]
      .filter(n => {
        const categoryMatch = filterCategory === 'all' || n.category === filterCategory;
        const readStatusMatch =
          filterReadStatus === 'all' ||
          (filterReadStatus === 'read' && n.read) ||
          (filterReadStatus === 'unread' && !n.read);
        return categoryMatch && readStatusMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notifications, filterCategory, filterReadStatus]);

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
  };
  
  if (authIsLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-center sm:text-left">
              <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2 justify-center sm:justify-start">
                <BellRing className="w-8 h-8" /> All Notifications
              </CardTitle>
              <CardDescription className="text-md mt-1">
                Review and manage all your past notifications and alerts.
              </CardDescription>
            </div>
             {notifications.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5 w-full sm:w-auto">
                    <Trash2 className="w-4 h-4" /> Clear All Notifications
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Clear All</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete all notifications? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllNotifications} className="bg-destructive hover:bg-destructive/90">
                      Yes, Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 mt-4">
          <Card className="p-4 bg-muted/50">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Filter className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value as NotificationCategory | 'all')}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Filter by category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {notificationCategories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterReadStatus} onValueChange={(value) => setFilterReadStatus(value as 'all' | 'read' | 'unread')}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Filter by status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {sortedAndFilteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground py-12 text-center bg-card rounded-lg border">
              <Info className="w-12 h-12 mb-4 text-primary/70" />
              <p className="text-lg font-semibold">
                {notifications.length === 0 ? "No notifications yet." : "No notifications match your filters."}
              </p>
              {notifications.length > 0 && (
                <p className="text-sm">Try adjusting your filters or clearing them to see all notifications.</p>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {sortedAndFilteredNotifications.map(notification => {
                const IconComponent = getIconForCategory(notification); // Pass the whole notification object
                return (
                  <li key={notification.id} className={cn(
                      "border rounded-lg overflow-hidden transition-all hover:shadow-md",
                      !notification.read ? "bg-accent/20 border-primary/30" : "bg-card"
                    )}>
                    <Link 
                      href={notification.href || "#"} 
                      className="block p-4"
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex items-start gap-4">
                        <IconComponent className={cn("w-6 h-6 mt-1 shrink-0", notification.read ? "text-muted-foreground" : "text-primary")} />
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-center mb-0.5">
                            <h3 className={cn("text-md truncate", notification.read ? "font-medium text-foreground/90" : "font-semibold text-foreground")}>{notification.title}</h3>
                            {!notification.read && <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 ml-2"></div>}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed_ (line-clamp-2)">{notification.description}</p>
                          <p className="text-xs text-muted-foreground/80 mt-1.5">{formatTimeAgo(notification.date)}</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 self-start opacity-60 hover:opacity-100 hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); /* This will be handled by AlertDialogTrigger */}}
                              aria-label="Delete notification"
                            >
                              <XIcon className="w-4 h-4 text-destructive/80 hover:text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Notification?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the notification titled &quot;{notification.title}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteNotification(notification.id)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
        <CardFooter className="pt-6">
          <Button variant="outline" asChild className="mx-auto">
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
