import { Home, Layers, Star, Sparkles, Activity, LayoutDashboard, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import neoliaLogoLight from "@/assets/neolia-logo.png";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Accueil" },
  { to: "/rooms", icon: Home, label: "Maison" },
  { to: "/favorites", icon: Star, label: "Favoris" },
  { to: "/scenes", icon: Sparkles, label: "Scènes" },
  { to: "/activity", icon: Activity, label: "Activité" },
];

export function TabletSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const currentPath = location.pathname;
  
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className={isCollapsed ? "w-20" : "w-64"}>
      <SidebarHeader className="border-b border-border/30 p-4">
        <img 
          src={theme === "light" ? neoliaLogoDark : neoliaLogoLight} 
          alt="Neolia" 
          className={isCollapsed ? "h-8 w-auto mx-auto" : "h-10 w-auto"}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "text-center" : ""}>
            {!isCollapsed && "Navigation"}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.to} 
                      end={item.to === "/"} 
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate("/settings")}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-muted/50"
                >
                  <Settings className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>Paramètres</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
