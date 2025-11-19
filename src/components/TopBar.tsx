import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import neoliaLogoLight from "@/assets/neolia-logo.png";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";

export const TopBar = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <div className="fixed top-0 left-0 right-0 glass-nav border-b border-border/30 z-40">
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
        <img 
          src={theme === "light" ? neoliaLogoDark : neoliaLogoLight} 
          alt="Neolia" 
          className="h-8 w-auto"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
          className="hover:bg-transparent"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
