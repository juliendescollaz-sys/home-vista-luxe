import { useConnectionMode } from "@/hooks/useConnectionMode";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useHAStore } from "@/store/useHAStore";
import { useEffect } from "react";
import { getHaConfig } from "@/services/haConfig";
import { useNavigate } from "react-router-dom";

interface ConnectionModeProviderProps {
  children: React.ReactNode;
}

/**
 * Wrapper pour les modes MOBILE et TABLET qui gère la détection automatique
 * de la connexion (local vs remote) et met à jour le store HA en conséquence.
 * 
 * IMPORTANT : Ne doit PAS être utilisé en mode PANEL.
 */
export function ConnectionModeProvider({ children }: ConnectionModeProviderProps) {
  const { connectionMode, haBaseUrl, isChecking, error } = useConnectionMode();
  const setConnection = useHAStore((state) => state.setConnection);
  const navigate = useNavigate();

  // Initialiser la connexion HA avec l'URL retournée (cloud prioritaire) + token
  useEffect(() => {
    if (!haBaseUrl || isChecking) return;

    getHaConfig()
      .then((config) => {
        if (config?.token) {
          setConnection({
            url: haBaseUrl,
            token: config.token,
            connected: false,
          });
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération du token:", error);
      });
  }, [haBaseUrl, isChecking, setConnection]);

  // Affichage pendant la lecture de la configuration
  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
        <div className="text-center space-y-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Chargement de la configuration Home Assistant…
            </p>
            <p className="text-sm text-muted-foreground">
              Merci de patienter quelques instants.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Erreur de configuration
  if (error || !haBaseUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="text-base">
              {error || "Configuration Home Assistant manquante"}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Vérifiez votre connexion et les paramètres Home Assistant.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/onboarding/manual")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <Button onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode normal : on laisse le client HA se connecter (local puis éventuellement cloud via watchdog)
  return (
    <>
      {children}
    </>
  );
}
