import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import neoliaLogoLight from "@/assets/neolia-logo.png";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";

interface TopBarProps {
  title?: string;
}

export const TopBar = ({ title }: TopBarProps) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { displayMode } = useDisplayMode();

  return (
    <div className="fixed top-0 left-0 right-0 glass-nav border-b border-border/30 z-40">
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
        <img 
          src={theme === "light" ? neoliaLogoDark : neoliaLogoLight} 
          alt="Neolia" 
          className="h-8 w-auto"
        />

        {/* Titre centré */}
        {title && (
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">
            {title}
          </h1>
        )}

        {/* Bouton Paramètres uniquement en mode Mobile */}
        {displayMode === "mobile" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
            className="bg-transparent"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
