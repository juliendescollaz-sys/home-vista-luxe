import { Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

export const TopBar = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-b border-border z-40">
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center gap-4">
        <h1 className="text-xl font-bold">Neolia</h1>
        
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="pl-10 bg-background/50"
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
