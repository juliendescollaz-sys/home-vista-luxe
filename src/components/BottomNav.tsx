import { Home, Layers, Star, Sparkles, Activity, LayoutDashboard } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Accueil" },
  { to: "/rooms", icon: Home, label: "Maison" },
  { to: "/favorites", icon: Star, label: "Favoris" },
  { to: "/scenes", icon: Sparkles, label: "Scènes" },
  { to: "/activity", icon: Activity, label: "Activité" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
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
  );
};
