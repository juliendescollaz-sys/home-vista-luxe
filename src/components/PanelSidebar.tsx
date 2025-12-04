import { Home, Star, Sparkles, Repeat, Package, Wand2, LayoutDashboard, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import neoliaLogoLight from "@/assets/neolia-logo.png";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Accueil" },
  { to: "/rooms", icon: Home, label: "Maison" },
  { to: "/favorites", icon: Star, label: "Favoris" },
  { to: "/scenes", icon: Sparkles, label: "Scènes" },
  { to: "/routines", icon: Repeat, label: "Routines" },
  { to: "/groupes", icon: Package, label: "Groupes" },
  { to: "/smart", icon: Wand2, label: "Smarthome" },
];

interface PanelSidebarProps {
  pageTitle?: string;
}

/**
 * Sidebar Panel avec header intégré (logo + titre)
 */
export function PanelSidebar({ pageTitle }: PanelSidebarProps) {
  const { state } = useSidebar();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className={isCollapsed ? "w-20" : "w-64"}>
      {/* Header avec logo et titre */}
      <div className="h-14 flex items-center px-4 border-b border-border/30 shrink-0">
        <img 
          src={theme === "light" ? neoliaLogoDark : neoliaLogoLight} 
          alt="Neolia" 
          className="h-6 w-auto" 
        />
        {!isCollapsed && pageTitle && (
          <span className="ml-4 text-lg font-semibold truncate">{pageTitle}</span>
        )}
      </div>

      <SidebarContent className="flex flex-col h-full pt-2">
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.to} 
                      end={item.to === "/"} 
                      className="flex items-center gap-3 px-4 py-4 rounded-lg transition-colors hover:bg-muted/50 h-14"
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

        <SidebarGroup className="mt-auto pb-4">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate("/settings")}
                  className={`flex items-center gap-3 px-4 py-4 rounded-lg transition-colors hover:bg-muted/50 h-14 ${
                    currentPath === "/settings" ? "bg-primary/10 text-primary font-medium" : ""
                  }`}
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
