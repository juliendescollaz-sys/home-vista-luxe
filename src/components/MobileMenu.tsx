import { LayoutDashboard, Home, Star, Sparkles, Repeat, Package, Wand2, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useHandedness } from "@/hooks/useHandedness";

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export const MobileMenu = ({ open, onOpenChange }: MobileMenuProps) => {
  const { handedness } = useHandedness();
  const menuSide = handedness === "left" ? "left" : "right";
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={menuSide} className="w-72">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-8">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-muted/50"
                activeClassName="bg-primary/10 text-primary font-medium"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};
