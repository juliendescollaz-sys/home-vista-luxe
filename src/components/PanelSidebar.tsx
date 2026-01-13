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

/**
 * Sidebar optimisee pour panel 8" (1280x800) - lisible a 1m de distance
 * - Icones plus grandes (h-7 w-7 = 28px)
 * - Hauteur items augmentee (h-16 = 64px) pour zones tactiles confortables
 * - Police plus grande (text-lg = 18px)
 * - Largeur ajustee (w-56 = 224px collapsed, w-72 = 288px expanded)
 */
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
      className={`${isCollapsed ? "w-24" : "w-56"} relative h-full shrink-0`}
      style={{
        position: "relative",
        top: "auto",
        height: "100%",
      }}
    >
      <SidebarContent className="flex flex-col h-full pt-3">
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors hover:bg-muted/50 h-14"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <item.icon className="h-7 w-7 flex-shrink-0" />
                      {!isCollapsed && <span className="text-lg">{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto pb-3">
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/settings")}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors hover:bg-muted/50 h-14 ${
                    currentPath === "/settings"
                      ? "bg-primary/10 text-primary font-semibold"
                      : ""
                  }`}
                >
                  <Settings className="h-7 w-7 flex-shrink-0" />
                  {!isCollapsed && <span className="text-lg">Paramètres</span>}
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
