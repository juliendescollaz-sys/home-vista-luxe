import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHAStore } from "@/store/useHAStore";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { clearHACredentials } from "@/lib/crypto";

const Settings = () => {
  const navigate = useNavigate();
  const disconnect = useHAStore((state) => state.disconnect);
  const connection = useHAStore((state) => state.connection);
  const { theme, setTheme } = useTheme();

  const handleDisconnect = () => {
    disconnect();
    clearHACredentials();
    toast.success("Déconnecté de Home Assistant");
    // Utiliser window.location pour forcer un rechargement complet
    window.location.href = "/onboarding";
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar />
      
      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-8">
        <h2 className="text-3xl font-bold">Paramètres</h2>

        <div className="space-y-4">
          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Connexion</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">URL Home Assistant</p>
                <p className="font-mono text-sm">{connection?.url}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm">Connecté</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Apparence</h3>
            <div className="flex gap-3">
              <Button 
                variant={theme === "light" ? "default" : "outline"} 
                className="flex-1"
                onClick={() => setTheme("light")}
              >
                <Sun className="mr-2 h-4 w-4" />
                Clair
              </Button>
              <Button 
                variant={theme === "dark" ? "default" : "outline"} 
                className="flex-1"
                onClick={() => setTheme("dark")}
              >
                <Moon className="mr-2 h-4 w-4" />
                Sombre
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">À propos</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Neolia Smart Home v1.0.0</p>
              <p>Powered by Home Assistant</p>
              <p>© 2025 Neolia. Tous droits réservés.</p>
            </div>
          </Card>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDisconnect}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
