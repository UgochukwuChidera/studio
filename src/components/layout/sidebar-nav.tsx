
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Settings,
  ShieldCheck,
  BellRing, 
  Cpu, 
  FileText,
  Zap,
  FolderOpen, 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useSidebar } from '@/components/ui/sidebar'; // Import useSidebar

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard & Analytics', icon: Home },
  { href: '/ai-content-generator', label: 'AI Content Generator', icon: Zap },
  { href: '/my-tests', label: 'My Saved Materials', icon: FolderOpen }, 
  { href: '/cbt', label: 'Test Arena', icon: FileText }, 
];

const utilityToolsNavItems: NavItem[] = [
];

const otherNavItems = [
  { href: '/notifications', label: 'Notifications', icon: BellRing },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminNavItems = [
   { href: '/admin', label: 'Admin Panel', icon: ShieldCheck },
];

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
}

function NavLinks({ items, currentPathname }: { items: NavItem[], currentPathname: string }) {
  const { state: sidebarState, isMobile: sidebarIsMobileHook } = useSidebar(); // Get sidebar state
  if (items.length === 0) return null;
  
  return (
    <nav className={cn(
        "grid gap-1 py-2",
        sidebarState === 'collapsed' && !sidebarIsMobileHook ? "px-1" : "px-2" // Smaller padding for collapsed icons
    )}>
      {items.map(({ href, label, icon: Icon, disabled }) => (
        <Link
          key={label}
          href={href}
          className={cn(
            'flex items-center gap-3 rounded-lg text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            currentPathname === href && 'bg-sidebar-primary text-sidebar-primary-foreground font-medium', 
            disabled && 'opacity-50 cursor-not-allowed',
            sidebarState === 'collapsed' && !sidebarIsMobileHook ? "p-2 justify-center" : "px-3 py-2" // Icon-only padding
          )}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
          title={sidebarState === 'collapsed' && !sidebarIsMobileHook ? label : undefined} // Show tooltip on hover for collapsed icons
        >
          <Icon className="h-5 w-5 shrink-0" />
          { (sidebarState === 'expanded' || sidebarIsMobileHook) && <span className="truncate">{label}</span> }
        </Link>
      ))}
    </nav>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const isAdminUser = true; 
  const { state: sidebarState, isMobile: sidebarIsMobileHook } = useSidebar();

  const showUtilityToolsAccordion = utilityToolsNavItems.length > 0;
  const isUtilityToolActive = utilityToolsNavItems.some(item => pathname.startsWith(item.href));

  return (
    <div className="flex flex-col h-full">
      <NavLinks items={mainNavItems} currentPathname={pathname} />
      
      {showUtilityToolsAccordion && (sidebarState === 'expanded' || sidebarIsMobileHook) && ( // Only show accordion if expanded or mobile
        <Accordion type="multiple" defaultValue={isUtilityToolActive ? ['utility-tools'] : []} className="w-full px-2">
          <AccordionItem value="utility-tools" className="border-b-0">
            <AccordionTrigger className="px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:no-underline rounded-lg [&[data-state=open]>svg]:text-sidebar-accent-foreground">
              <div className="flex items-center gap-3">
                <Cpu className="h-5 w-5" />
                Utility Tools
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <NavLinks items={utilityToolsNavItems} currentPathname={pathname} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      
      <div className="mt-auto space-y-2 py-2">
        <div>
          {(sidebarState === 'expanded' || sidebarIsMobileHook) && <p className="px-4 py-2 text-xs font-medium text-sidebar-foreground/70">General</p>}
          <NavLinks items={otherNavItems} currentPathname={pathname} />
        </div>
        {isAdminUser && ( 
           <div>
            {(sidebarState === 'expanded' || sidebarIsMobileHook) && <p className="px-4 pt-2 pb-1 text-xs font-medium text-sidebar-foreground/70">Administration</p>}
            <NavLinks items={adminNavItems} currentPathname={pathname} />
          </div>
        )}
      </div>
    </div>
  );
}
