
"use client";

import React from 'react';
import { Bell, Trash2, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/use-notifications';
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
  return `${days}d ago`;
}

export function NotificationsDropdown() {
  const { notifications, unreadCount, markAsRead, deleteNotification, clearAllNotifications, getIconForCategory } = useNotifications();

  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    // Navigation will be handled by Link component
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation(); // Prevent dropdown item click / navigation
    e.preventDefault();
    deleteNotification(notificationId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 min-w-[1rem] p-0 flex items-center justify-center text-xs rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96">
        <DropdownMenuLabel className="flex justify-between items-center px-3 py-2">
          <span className="font-semibold text-lg">Notifications</span>
          {unreadCount > 0 && <Badge variant="secondary" className="text-xs">{unreadCount} New</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px] max-h-[60vh]">
          <DropdownMenuGroup>
            {sortedNotifications.length === 0 ? (
              <DropdownMenuItem disabled className="px-3 py-4 text-center text-muted-foreground">
                No notifications yet.
              </DropdownMenuItem>
            ) : (
              sortedNotifications.map(notification => {
                const IconComponent = getIconForCategory(notification); // Pass the whole notification object
                return (
                  <DropdownMenuItem key={notification.id} asChild className={cn("cursor-pointer p-0 focus:bg-accent/80", !notification.read && "bg-accent/50")}>
                    <Link 
                      href={notification.href || "#"} 
                      className="flex items-start gap-3 px-3 py-2.5 w-full"
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <IconComponent className={cn("w-5 h-5 mt-0.5 shrink-0", notification.read ? "text-muted-foreground" : "text-primary")} />
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                           <h4 className={cn("text-sm truncate", notification.read ? "font-normal text-foreground/90" : "font-semibold text-foreground")}>{notification.title}</h4>
                           {!notification.read && <div className="w-2 h-2 bg-primary rounded-full shrink-0 ml-2"></div>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate_ multiline_ (max-2-lines)">{notification.description}</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{formatTimeAgo(notification.date)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-50 hover:opacity-100 hover:bg-destructive/10"
                        onClick={(e) => handleDelete(e, notification.id)}
                        aria-label="Delete notification"
                      >
                        <XIcon className="w-3.5 h-3.5 text-destructive/70 hover:text-destructive" />
                      </Button>
                    </Link>
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuGroup>
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2 flex flex-col gap-1">
          {notifications.length > 0 && (
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All your notifications will be permanently deleted.
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
          <Button variant="ghost" size="sm" asChild className="w-full text-primary hover:underline">
            <Link href="/notifications">
              View all notifications
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
