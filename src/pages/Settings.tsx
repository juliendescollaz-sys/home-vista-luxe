import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHAStore } from "@/store/useHAStore";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, Cloud, Home as HomeIcon, Activity, Hand } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { clearHACredentials } from "@/lib/crypto";
import { useConnectionMode } from "@/hooks/useConnectionMode";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHandedness } from "@/hooks/useHandedness";

const Settings = () => {
  const navigate = useNavigate();
  const disconnect = useHAStore((state) => state.disconnect);
  const connection = useHAStore((state) => state.connection);
  const { theme, setTheme } = useTheme();
  const { connectionMode } = useConnectionMode();
  const { displayMode } = useDisplayMode();
  const { handedness, setHandedness } = useHandedness();
  const ptClass = displayMode === "mobile" ? "pt-16" : "pt-10";

  const handleDisconnect = () => {
    disconnect();
    clearHACredentials();
    toast.success("Déconnecté de Home Assistant");
    // Utiliser window.location pour forcer un rechargement complet
    window.location.href = "/onboarding";
  };

  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar title="Paramètres" />
      
      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-8">

        <div className="space-y-4">
          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Connexion</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">URL Home Assistant</p>
                <p className="font-mono text-sm break-all">{connection?.url}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm">Connecté</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mode de connexion</p>
                <div className="flex items-center gap-2">
                  {connectionMode === "remote" ? (
                    <>
                      <Cloud className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Cloud (Nabu Casa)</span>
                    </>
                  ) : (
                    <>
                      <HomeIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Local</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Apparence</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Thème</p>
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
              </div>

              {displayMode === "mobile" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Préférence de main</p>
                  <div className="flex gap-3">
                    <Button 
                      variant={handedness === "right" ? "default" : "outline"} 
                      className="flex-1"
                      onClick={() => {
                        setHandedness("right");
                        toast.success("Mode droitier activé");
                      }}
                    >
                      <Hand className="mr-2 h-4 w-4" />
                      Droitier
                    </Button>
                    <Button 
                      variant={handedness === "left" ? "default" : "outline"} 
                      className="flex-1"
                      onClick={() => {
                        setHandedness("left");
                        toast.success("Mode gaucher activé");
                      }}
                    >
                      <Hand className="mr-2 h-4 w-4 scale-x-[-1]" />
                      Gaucher
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Journal d'activité</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Activity className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Suivi des événements</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Le journal d'activité enregistre toutes les actions et événements de votre maison connectée.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toast.info("Fonctionnalité à venir")}
              >
                Voir le journal
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
