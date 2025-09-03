import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header - Mobile responsive */}
          <header className="h-14 md:h-16 border-b bg-card flex items-center justify-between px-3 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="hover:bg-accent">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-semibold">Timetable Management</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden md:block">AI-powered scheduling system</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-semibold">MBU Timetable</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <Button variant="ghost" size={isMobile ? "sm" : "icon"}>
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size={isMobile ? "sm" : "icon"}>
                <User className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Main Content - Mobile responsive padding */}
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}