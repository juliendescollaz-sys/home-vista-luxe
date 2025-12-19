/**
 * Page Paramètres pour le mode PANEL
 * Layout en grille horizontale optimisé pour 1280x800
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 * SANS "Mode de connexion" (toujours local en Panel)
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHAStore } from "@/store/useHAStore";
import { LogOut, Moon, Sun, Activity } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { clearHACredentials } from "@/lib/crypto";
import { useNeoliaPanelConfigStore } from "@/store/useNeoliaPanelConfigStore";

export function PanelSettings() {
  const disconnect = useHAStore((state) => state.disconnect);
  const connection = useHAStore((state) => state.connection);
  const { theme, setTheme } = useTheme();

  const handleDisconnect = () => {
    // 1) coupe la connexion HA
    disconnect();

    // 2) efface les creds stockés
    clearHACredentials();

    // 3) efface le flag "onboarding terminé"
    try {
      window.localStorage.removeItem("neolia_panel_onboarding_completed");
    } catch {
      // ignore
    }

    // 4) reset de l'étape SN (retour 4 chiffres)
    //    (Zustand expose généralement getState / setState sur le hook)
    try {
      const storeAny = useNeoliaPanelConfigStore as any;

      // si le store expose une méthode reset
      if (typeof storeAny.getState?.().reset === "function") {
        storeAny.getState().reset();
      } else if (typeof storeAny.setState === "function") {
        // sinon on remet les champs essentiels à zéro (best effort)
        storeAny.setState({
          hasCompletedSnStep: false,
          enteredNeoliaCode: "",
        });
      }
    } catch {
      // ignore
    }

    toast.success("Déconnecté — retour à l’onboarding");
    // 5) redirection vers onboarding, avec reset=1 (sécurité côté PanelOnboarding)
    window.location.href = "/onboarding?reset=1";
  };

  return (
    <div className="w-full h-full flex flex-col bg-background px-4 py-4">
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-4">
        {/* Colonne 1: Connexion + Déconnexion */}
        <div className="flex flex-col gap-4">
          <Card className="flex-1 p-5 bg-gradient-card border-border/50">
            <h3 className="text-base font-semibold mb-3">Connexion</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">URL Home Assistant</p>
                <p className="font-mono text-xs break-all">{connection?.url}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs">Connecté</span>
                </div>
              </div>
            </div>
          </Card>

          <Button variant="destructive" className="w-full" onClick={handleDisconnect}>
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </div>

        {/* Colonne 2: Apparence + Journal */}
        <div className="flex flex-col gap-4">
          <Card className="p-5 bg-gradient-card border-border/50">
            <h3 className="text-base font-semibold mb-3">Apparence</h3>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Thème</p>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className="flex-1"
                  size="sm"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="mr-1 h-3 w-3" />
                  Clair
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className="flex-1"
                  size="sm"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="mr-1 h-3 w-3" />
                  Sombre
                </Button>
              </div>
            </div>
          </Card>

          <Card className="flex-1 p-5 bg-gradient-card border-border/50">
            <h3 className="text-base font-semibold mb-3">Journal d'activité</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Activity className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium">Suivi des événements</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enregistre toutes les actions de votre maison.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => toast.info("Fonctionnalité à venir")}
              >
                Voir le journal
              </Button>
            </div>
          </Card>
        </div>

        {/* Colonne 3: À propos */}
        <Card className="p-5 bg-gradient-card border-border/50">
          <h3 className="text-base font-semibold mb-3">À propos</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Neolia Smart Home v1.0.0</p>
            <p>Powered by Home Assistant</p>
            <p>© 2025 Neolia. Tous droits réservés.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
