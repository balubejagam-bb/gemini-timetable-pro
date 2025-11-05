import { NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  BookOpen,
  Users,
  Building2,
  MapPin,
  UserCheck,
  Clock,
  Settings,
  Sparkles,
  GraduationCap
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: GraduationCap },
  { title: "Students", url: "/students", icon: Users },
  { title: "Student DB", url: "/student-db", icon: Users },
  { title: "Generate Timetable", url: "/generate", icon: Sparkles },
  { title: "View Timetables", url: "/timetables", icon: Calendar },
  { title: "College Timings", url: "/timings", icon: Clock },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
  { title: "Sections", url: "/sections", icon: Users },
  { title: "Departments", url: "/departments", icon: Building2 },
  { title: "Rooms", url: "/rooms", icon: MapPin },
  { title: "Staff", url: "/staff", icon: UserCheck },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Student", url: "/student", icon: GraduationCap },
];

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavClasses = (active: boolean) =>
    active 
      ? "bg-primary text-primary-foreground font-medium shadow-sm" 
      : "hover:bg-accent hover:text-accent-foreground transition-colors";

  return (
    <Sidebar 
      className={`${collapsed && !isMobile ? "w-16" : "w-64"} border-r bg-card`}
      collapsible="icon"
    >
      <SidebarContent className="p-3 md:p-4">
        <div className={`${collapsed && !isMobile ? "text-center" : ""} mb-4 md:mb-6`}>
          {!collapsed || isMobile ? (
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-sm md:text-lg truncate">Mohan Babu University</h2>
                <p className="text-xs text-muted-foreground hidden md:block">AI Timetable Generator</p>
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
              <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed && !isMobile ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={`${getNavClasses(isActive(item.url))} ${
                        collapsed && !isMobile ? "justify-center" : ""
                      }`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {(!collapsed || isMobile) && <span className="ml-3 truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}