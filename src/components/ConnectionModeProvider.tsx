import { useConnectionMode } from "@/hooks/useConnectionMode";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useHAStore } from "@/store/useHAStore";
import { useEffect, useState } from "react";
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
  const connected = useHAStore((state) => state.connection.connected);
  const navigate = useNavigate();
  const [showBackButton, setShowBackButton] = useState(false);
  const [watchdogStarted, setWatchdogStarted] = useState(false);

  // 1) Initialiser la connexion HA avec l'URL locale (haBaseUrl) + token
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

  // 2) Watchdog : si après 5s on n'est pas connecté en LOCAL et qu'une URL cloud existe,
  //    on bascule vers remoteHaUrl
  useEffect(() => {
    if (isChecking) return;
    if (connectionMode !== "local") return;
    if (connected) return;
    if (watchdogStarted) return;

    let cancelled = false;
    setWatchdogStarted(true);

    (async () => {
      const config = await getHaConfig();
      if (!config?.remoteHaUrl || !config.token) {
        // Pas d'URL cloud configurée => afficher le bouton retour après 5s
        setTimeout(() => {
          if (!cancelled) {
            setShowBackButton(true);
          }
        }, 5000);
        return;
      }

      setTimeout(() => {
        if (cancelled) return;

        const latestConnected = useHAStore.getState().connection.connected;
        if (latestConnected) {
          // La connexion locale a finalement réussi avant le timeout
          return;
        }

        console.warn("[Neolia] Watchdog : bascule vers l'URL cloud…");

        setConnection({
          url: config.remoteHaUrl!,
          token: config.token,
          connected: false,
        });
      }, 5000);
    })();

    return () => {
      cancelled = true;
    };
  }, [connectionMode, isChecking, connected, watchdogStarted, setConnection]);

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
      {/* Indicateur visuel du mode de connexion (optionnel, pour debug) */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 bg-background/95 border rounded-lg px-3 py-2 text-xs z-50 shadow-lg">
          <span className="text-muted-foreground">Mode initial: </span>
          <span className="font-medium">
            {connectionMode === "local" ? "🏠 Local" : "☁️ Cloud"}
          </span>
          <span className="ml-2 text-muted-foreground">
            ({connected ? "connecté" : "en connexion..."})
          </span>
        </div>
      )}
      {showBackButton && !connected && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/onboarding/manual")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </div>
      )}
      {children}
    </>
  );
}
