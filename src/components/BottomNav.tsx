import { LayoutDashboard, Home, Star, Sparkles, Repeat, Package, Wand2, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Accueil" },
  { to: "/rooms", icon: Home, label: "Maison" },
  { to: "/favorites", icon: Star, label: "Favoris" },
  { to: "/scenes", icon: Sparkles, label: "Scènes" },
  { to: "/routines", icon: Repeat, label: "Routines" },
  { to: "/groupes", icon: Package, label: "Groupes" },
  { to: "/smart", icon: Wand2, label: "Smart" },
  { to: "/settings", icon: Settings, label: "Paramètres" },
];

export const BottomNav = () => {
  // Ne s'affiche dans aucun layout (navigation via menu burger en mobile, sidebar en tablet/panel)
  return null;
  
  /* Code désactivé - BottomNav complètement masqué
  const { displayMode } = useDisplayMode();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav border-t border-border/30 z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-around items-center h-20">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200"
              activeClassName="text-primary"
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2 rounded-lg transition-colors ${
                    isActive ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}>
                    <item.icon className={`h-6 w-6 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <span className={`text-xs font-medium ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  */
};
