
"use client";

import React, { useEffect } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  useSidebar, 
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { Button } from '@/components/ui/button';
import { UserCircle, Settings, LogOut, LogIn, PanelLeft, Loader2, PanelLeftClose, PanelRightOpen } from 'lucide-react'; 
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger as ActualSheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationsDropdown } from './notifications-dropdown';
import { useAuth } from '@/contexts/auth-context'; 
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const SidebarCommonContent: React.FC<{ inSheet: boolean }> = ({ inSheet }) => {
  const { state: sidebarState, isMobile: sidebarIsMobileHook, open: sidebarOpen, toggleSidebar } = useSidebar(); 

  return (
    <>
      <SidebarHeader className={cn(
        "p-4 flex items-center",
        // When expanded and not in sheet, justify between to allow collapse button
        !inSheet && sidebarOpen ? "justify-between" : "justify-center group-data-[collapsible=icon]/sidebar-wrapper:group-data-[state=collapsed]/sidebar-wrapper:justify-center" 
      )}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          {inSheet ? (
             <SheetHeader className="text-left">
                <SheetTitle asChild>
                  <h1 className="text-xl font-semibold text-foreground">TestPrep AI</h1>
                </SheetTitle>
             </SheetHeader>
          ) : (
            <h1 className={cn(
                "text-xl font-semibold text-foreground",
                 !sidebarOpen && !sidebarIsMobileHook && "hidden" // Hide title when collapsed on desktop
            )}>TestPrep AI</h1>
          )}
        </Link>
         {/* This explicit collapse button inside header is removed as unified toggle is in Sidebar.tsx now */}
      </SidebarHeader>
      <SidebarContent className="p-0 flex-1 flex flex-col">
        <SidebarNav />
      </SidebarContent>
      <SidebarFooter className={cn("p-4 border-t border-sidebar-border", !sidebarOpen && !sidebarIsMobileHook && "hidden")}>
        <p className="text-xs text-muted-foreground text-center">&copy; {new Date().getFullYear()} TestPrep AI</p>
      </SidebarFooter>
    </>
  );
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobileHook = useIsMobile(); 
  const { isAuthenticated, isLoading, logoutUser } = useAuth(); 
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ['/', '/auth/signin', '/auth/signup', '/auth/forgot-password', '/privacy-policy', '/terms-of-service']; 
  const isPublicPage = publicRoutes.some(route => pathname === route);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicPage) {
        router.push('/auth/signin');
      } else if (isAuthenticated && (pathname === '/' || pathname.startsWith('/auth/'))) {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, isPublicPage, pathname, router]);

  if (isLoading || (!isAuthenticated && !isPublicPage) || (isAuthenticated && (pathname === '/' || pathname.startsWith('/auth/')) && pathname !=='/dashboard' /* Allow staying on dashboard if already there */)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isPublicPage && (!isAuthenticated || isLoading)) {
    return <div className="min-h-screen flex flex-col">{children}</div>;
  }

  return (
    <SidebarProvider defaultOpen={!isMobileHook}>
      {isMobileHook ? (
         <Sheet>
          <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-background sm:px-6">
                <ActualSheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <PanelLeft className="h-6 w-6" />
                    <span className="sr-only">Toggle Sidebar</span>
                  </Button>
                </ActualSheetTrigger>
                <div className="flex-1 flex justify-center md:hidden">
                  <Link href="/dashboard" className="flex items-center gap-2"> 
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                      </svg>
                      <span className="text-lg font-semibold text-foreground">TestPrep AI</span>
                  </Link>
                </div>
              <div className="flex items-center gap-2 ml-auto">
                 <NotificationsDropdown />
                 <UserMenu />
              </div>
            </header>
            <main className="flex-1 flex flex-col overflow-auto p-0">
              {children}
            </main>
          </div>
          <SheetContent side="left" className="p-0 w-[280px] bg-sidebar z-50 flex flex-col">
             <div className="p-4 border-b border-sidebar-border">
                <SheetTitle className="text-lg font-semibold text-sidebar-foreground">Menu</SheetTitle>
            </div>
            <SidebarCommonContent inSheet={true} />
          </SheetContent>
        </Sheet>
      ) : (
      <div className="flex min-h-screen">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
          <SidebarCommonContent inSheet={false} />
        </Sidebar>
        <SidebarInset className="flex flex-col flex-1"> 
           <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-background sm:px-6"> 
            <div className="flex items-center">
                {/* SidebarTrigger in header is mainly for mobile or alternative desktop toggle if needed.
                    The unified toggle is now part of Sidebar.tsx */}
                {/* <SidebarTrigger className="hidden group-data-[state=expanded]/sidebar-wrapper:md:inline-flex" /> */}
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <NotificationsDropdown />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 flex flex-col p-0 overflow-auto"> 
            {children}
          </main>
        </SidebarInset>
      </div>
      )}
    </SidebarProvider>
  );
}

function UserMenu() {
  const { isAuthenticated, user, logoutUser } = useAuth(); 
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <UserCircle className="w-6 h-6" />
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isAuthenticated && user ? (
          <>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName || user.email?.split('@')[0]}</p>
                {user.email && <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
           </>
        ) : (
           <>
            <DropdownMenuItem asChild>
               <Link href="/auth/signin">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
               <Link href="/auth/signup">
                <UserCircle className="w-4 h-4 mr-2" />
                Sign Up
              </Link>
            </DropdownMenuItem>
           </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

    
