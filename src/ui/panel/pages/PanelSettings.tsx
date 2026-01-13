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
import { IntercomSettingsCard } from "@/components/panel/IntercomSettingsCard";

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
    <div className="w-full h-full flex flex-col bg-background px-6 py-5">
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-5">
        {/* Colonne 1: Connexion + Déconnexion */}
        <div className="flex flex-col gap-5">
          <Card className="flex-1 p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Connexion</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">URL Home Assistant</p>
                <p className="font-mono text-sm break-all mt-1">{connection?.url}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                  <span className="text-sm">Connecté</span>
                </div>
              </div>
            </div>
          </Card>

          <Button variant="destructive" className="w-full h-12 text-base" onClick={handleDisconnect}>
            <LogOut className="mr-2 h-5 w-5" />
            Se déconnecter
          </Button>
        </div>

        {/* Colonne 2: Apparence + Journal */}
        <div className="flex flex-col gap-5">
          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Apparence</h3>
            <div>
              <p className="text-sm text-muted-foreground mb-3">Thème</p>
              <div className="flex gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className="flex-1 h-11 text-base"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="mr-2 h-5 w-5" />
                  Clair
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className="flex-1 h-11 text-base"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="mr-2 h-5 w-5" />
                  Sombre
                </Button>
              </div>
            </div>
          </Card>

          <Card className="flex-1 p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Journal d'activité</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Activity className="h-6 w-6 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Suivi des événements</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enregistre toutes les actions de votre maison.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-11 text-base"
                onClick={() => toast.info("Fonctionnalité à venir")}
              >
                Voir le journal
              </Button>
            </div>
          </Card>
        </div>

        {/* Colonne 3: Interphone + À propos */}
        <div className="flex flex-col gap-5">
          <IntercomSettingsCard />

          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">À propos</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Neolia Smart Home v1.0.0</p>
              <p>Powered by Home Assistant</p>
              <p>© 2025 Neolia. Tous droits réservés.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
