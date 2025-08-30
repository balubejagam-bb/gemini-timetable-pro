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

const navigationItems = [
  { title: "Dashboard", url: "/", icon: GraduationCap },
  { title: "Generate Timetable", url: "/generate", icon: Sparkles },
  { title: "View Timetables", url: "/timetables", icon: Calendar },
  { title: "College Timings", url: "/timings", icon: Clock },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
  { title: "Sections", url: "/sections", icon: Users },
  { title: "Departments", url: "/departments", icon: Building2 },
  { title: "Rooms", url: "/rooms", icon: MapPin },
  { title: "Staff", url: "/staff", icon: UserCheck },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
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
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} border-r bg-card`}>
      <SidebarContent className="p-4">
        <div className={`${collapsed ? "text-center" : ""} mb-6`}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-lg">TimeTable Pro</h2>
                <p className="text-xs text-muted-foreground">AI Generator</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
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
                      className={getNavClasses(isActive(item.url))}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
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