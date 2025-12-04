import {
  Home,
  Star,
  Sparkles,
  Repeat,
  Package,
  Wand2,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation } from "react-router-dom";
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

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Accueil" },
  { to: "/rooms", icon: Home, label: "Maison" },
  { to: "/favorites", icon: Star, label: "Favoris" },
  { to: "/scenes", icon: Sparkles, label: "Scènes" },
  { to: "/routines", icon: Repeat, label: "Routines" },
  { to: "/groupes", icon: Package, label: "Groupes" },
  { to: "/smart", icon: Wand2, label: "Smarthome" },
];

export function PanelSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar
      /** On neutralise le "position: fixed" du composant Sidebar */
      className={`${isCollapsed ? "w-20" : "w-64"} relative h-full shrink-0`}
      style={{
        position: "relative",
        top: "auto",
        height: "100%",
      }}
    >
      <SidebarContent className="flex flex-col h-full pt-4">
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
                    currentPath === "/settings"
                      ? "bg-primary/10 text-primary font-medium"
                      : ""
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

export default PanelSidebar;
