import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHandedness } from "@/hooks/useHandedness";
import { MobileMenu } from "@/components/MobileMenu";
import { useState } from "react";
import neoliaLogoLight from "@/assets/neolia-logo.png";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";

interface TopBarProps {
  title?: string;
}

export const TopBar = ({ title }: TopBarProps) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { displayMode } = useDisplayMode();
  const { handedness } = useHandedness();
  const [menuOpen, setMenuOpen] = useState(false);

  const isMobile = displayMode === "mobile";
  const isLeftHanded = handedness === "left";

  return (
    <>
      <div className="fixed top-0 left-0 right-0 glass-nav border-b border-border/30 z-40">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo - à gauche si droitier, à droite si gaucher */}
          <div className={`${isLeftHanded && isMobile ? "order-2" : "order-1"}`}>
            <img 
              src={theme === "light" ? neoliaLogoDark : neoliaLogoLight} 
              alt="Neolia" 
              className="h-8 w-auto"
            />
          </div>

          {/* Titre centré */}
          {title && (
            <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">
              {title}
            </h1>
          )}

          {/* Bouton Menu - à droite si droitier, à gauche si gaucher (mobile seulement) */}
          {isMobile && (
            <div className={`${isLeftHanded ? "order-1" : "order-2"}`}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(true)}
                className="bg-transparent"
              >
                <Menu className="h-7 w-7" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
      )}
    </>
  );
};
