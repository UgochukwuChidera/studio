
"use client";

import React, { useEffect, useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { Button } from '@/components/ui/button';
import { UserCircle, Settings, LogOut, LogIn, PanelLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger as ActualSheetTrigger } from '@/components/ui/sheet'; // Renamed SheetTrigger to avoid conflict
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

// Reusable component for the sidebar's main content
const SidebarCommonContent: React.FC<{ inSheet: boolean }> = ({ inSheet }) => {
  return (
    <>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
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
            <h1 className="text-xl font-semibold text-foreground">TestPrep AI</h1>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-0 flex-1 flex flex-col">
        <SidebarNav />
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">&copy; {new Date().getFullYear()} TestPrep AI</p>
      </SidebarFooter>
    </>
  );
};


export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading, logoutUser } = useAuth(); // Changed logout to logoutUser
  const router = useRouter();
  const pathname = usePathname();

  const authRoutes = ['/auth/signin', '/auth/signup', '/auth/forgot-password'];
  const isAuthPage = authRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isAuthPage) {
        router.push('/auth/signin');
      } else if (isAuthenticated && isAuthPage) {
        // If authenticated and on an auth page, but not yet at '/', redirect to '/'
        // This handles the case where after login/signup, they might be on /auth/signin
        // and need to be pushed to the dashboard.
        if(pathname !== '/') router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, isAuthPage, pathname, router]);


  if (isLoading || (!isAuthenticated && !isAuthPage) || (isAuthenticated && isAuthPage && pathname !== '/')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If it's an auth page and the user is not authenticated (or loading is done), render children without sidebar
  if (isAuthPage && !isAuthenticated) {
    return <div className="min-h-screen flex flex-col">{children}</div>;
  }


  return (
    <SidebarProvider defaultOpen={!isMobile}>
      {isMobile ? (
         <Sheet>
          <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b bg-background sm:px-6">
                <ActualSheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <PanelLeft className="h-6 w-6" />
                    <span className="sr-only">Toggle Sidebar</span>
                  </Button>
                </ActualSheetTrigger>
                <div className="flex-1 flex justify-center md:hidden">
                  <Link href="/" className="flex items-center gap-2">
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
             {/* Sheet specific title */}
             <div className="p-4 border-b border-sidebar-border">
                <SheetTitle className="text-lg font-semibold text-sidebar-foreground">Menu</SheetTitle>
            </div>
            <SidebarCommonContent inSheet={true} />
          </SheetContent>
        </Sheet>
      ) : (
      <div className="flex min-h-screen">
        <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} className="border-r border-sidebar-border">
          <SidebarCommonContent inSheet={false} />
        </Sidebar>
        <SidebarInset className="flex flex-col flex-1">
           <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b bg-background sm:px-6">
            <div className="flex items-center">
                <SidebarTrigger className="hidden group-data-[state=collapsed]/sidebar-wrapper:md:inline-flex" />
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
  const { isAuthenticated, user, logoutUser } = useAuth(); // Use logoutUser from context
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    // router.push('/auth/signin'); // onAuthStateChanged in AuthContext will handle redirect logic via AppLayout
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

    