import { useState, useEffect, useCallback } from "react";
import type React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Server, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { setHaConfig } from "@/services/haConfig";
import { useHAStore } from "@/store/useHAStore";
import { useNeoliaSettings } from "@/store/useNeoliaSettings";
import { isPanelMode } from "@/lib/platform";
import { connectNeoliaMqttPanel } from "@/components/neolia/bootstrap/neoliaMqttClient";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";

type OnboardingStatus = "idle" | "loading" | "success" | "error";

const PANEL_CODE = "NEOLIA_DEFAULT_PANEL";

/**
 * Normalise une URL/host Home Assistant saisie par l'utilisateur.
 * Accepte :
 *  - "192.168.1.20:8123"
 *  - "http://192.168.1.20:8123"
 *  - "https://ha.local"
 */
function normalizeHaBaseUrl(raw: string): string {
  let url = (raw || "").trim();
  if (!url) {
    throw new Error("URL Home Assistant vide");
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  // On supprime les / en fin d'URL pour éviter les // dans les appels
  return url.replace(/\/+$/, "");
}

/**
 * Écran d'onboarding spécifique au mode PANEL
 *
 * Mode Panel (Zero-Config) :
 * - Connexion MQTT automatique avec valeurs par défaut
 * - Redirection immédiate vers l'écran principal en cas de succès
 * - Message d'aide + bouton "Réessayer" en cas d'échec (après test 1884 puis 9001)
 *
 * Mode Mobile/Tablet :
 * - Affiche l'UI classique de récupération de config via HA
 */
export function PanelOnboarding() {
  // ============================================
  // STATE pour mode Mobile/Tablet (onboarding classique)
  // ============================================
  const [haBaseUrl, setHaBaseUrl] = useState("");
  const [status, setStatus] = useState<OnboardingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const setConnection = useHAStore((state) => state.setConnection);

  // ============================================
  // STATE pour mode Panel (connexion MQTT auto)
  // ============================================
  const [panelConnecting, setPanelConnecting] = useState(true);
  const [panelError, setPanelError] = useState(false);
  const [panelSuccess, setPanelSuccess] = useState(false);

  const { setMqttHost, setMqttPort, setMqttUseSecure, setMqttUsername, setMqttPassword } = useNeoliaSettings();

  // ============================================
  // MODE PANEL : Tentative de connexion MQTT
  // ============================================
  const attemptPanelConnection = useCallback(async () => {
    console.log("[PanelOnboarding] Tentative de connexion MQTT Panel...");

    setPanelConnecting(true);
    setPanelError(false);
    setPanelSuccess(false);

    // Appliquer les valeurs MQTT par défaut (Zero-Config)
    setMqttHost("homeassistant.local");
    setMqttPort(1884);
    setMqttUseSecure(false);
    setMqttUsername("panel");
    setMqttPassword("PanelMQTT!2025");

    try {
      const result = await connectNeoliaMqttPanel(
        () => {
          console.log("[PanelOnboarding] Connexion MQTT réussie (callback)");
        },
        (error) => {
          console.error("[PanelOnboarding] Erreur MQTT (callback):", error);
        },
      );

      console.log("[PanelOnboarding] Client MQTT connecté, redirection...", {
        clientDefined: !!result.client,
      });

      // Si on est là, connectNeoliaMqttPanel a réussi
      setPanelSuccess(true);
      setPanelConnecting(false);

      // Redirection vers l'écran principal
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      console.error("[PanelOnboarding] Exception lors de la connexion MQTT:", error);
      setPanelError(true);
      setPanelConnecting(false);
    }
  }, [setMqttHost, setMqttPort, setMqttUseSecure, setMqttUsername, setMqttPassword]);

  // ============================================
  // MODE PANEL : Lancer la connexion au montage
  // ============================================
  useEffect(() => {
    if (isPanelMode()) {
      attemptPanelConnection();
    }
  }, [attemptPanelConnection]);

  // ============================================
  // MODE PANEL : Rendu de l'UI
  // ============================================
  if (isPanelMode()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-lg space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={neoliaLogoDark} alt="Neolia Logo Dark" className="h-14 dark:hidden" />
            <img src={neoliaLogo} alt="Neolia Logo" className="h-14 hidden dark:block" />
          </div>

          <Card className="shadow-2xl border-2">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl">Configuration automatique du panneau</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* État : Connexion en cours */}
              {panelConnecting && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg text-muted-foreground">Connexion à Home Assistant…</p>
                  <p className="text-sm text-muted-foreground">Tentative sur les ports 1884 et 9001</p>
                </div>
              )}

              {/* État : Succès */}
              {!panelConnecting && panelSuccess && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="text-lg text-green-600 dark:text-green-400">Connexion établie</p>
                  <p className="text-sm text-muted-foreground">Redirection en cours…</p>
                </div>
              )}

              {/* État : Échec */}
              {!panelConnecting && panelError && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <AlertCircle className="h-12 w-12 text-destructive" />

                  <p className="text-lg font-medium text-destructive text-center">
                    Impossible de se connecter automatiquement à Home Assistant.
                  </p>

                  <div className="text-sm text-muted-foreground space-y-2 text-center mt-2">
                    <p className="font-medium">Assurez-vous que :</p>
                    <ul className="space-y-1 text-left list-none">
                      <li className="flex items-start gap-2">
                        <span className="text-muted-foreground">–</span>
                        <span>Votre Home Assistant est bien allumé et connecté au réseau.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-muted-foreground">–</span>
                        <span>L&apos;addon Mosquitto Broker est installé et en cours d&apos;exécution.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-muted-foreground">–</span>
                        <span>Le WebSocket MQTT est activé sur le port 1884 (ou 9001 selon votre configuration).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-muted-foreground">–</span>
                        <span>Le panel est connecté au même réseau local.</span>
                      </li>
                    </ul>
                  </div>

                  <Button onClick={attemptPanelConnection} size="lg" className="mt-4 h-14 px-8">
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Réessayer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ============================================
  // MODE MOBILE/TABLET : UI d'onboarding classique
  // ============================================

  const handleImportConfig = async () => {
    const trimmed = haBaseUrl.trim();

    if (!trimmed) {
      setErrorMessage("Veuillez saisir l'URL ou l'adresse IP de Home Assistant.");
      setStatus("error");
      return;
    }

    let baseUrl: string;
    try {
      baseUrl = normalizeHaBaseUrl(trimmed);
    } catch (e: any) {
      setErrorMessage(e?.message || "URL Home Assistant invalide.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    console.log("[PanelOnboarding] Récupération config panel via HA :", baseUrl);
    setStatusMessage("Connexion à Home Assistant et récupération de la configuration du panneau…");

    const apiUrl = `${baseUrl}/api/neolia/panel_config/${encodeURIComponent(PANEL_CODE)}`;

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "Aucune configuration trouvée pour ce panneau.\n" +
              "Vérifiez que l'installateur a bien poussé la configuration depuis son PC.",
          );
        }
        throw new Error(`Erreur Home Assistant ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      console.log("[PanelOnboarding] Config panel reçue (masquée dans les logs).");

      if (
        !json ||
        typeof json !== "object" ||
        typeof json.ha_url !== "string" ||
        !json.ha_url ||
        typeof json.token !== "string" ||
        !json.token
      ) {
        throw new Error("Réponse invalide ou incomplète reçue de Home Assistant.");
      }

      const ha_url: string = json.ha_url;
      const token: string = json.token;
      const remoteHaUrl: string | undefined =
        typeof json.remoteHaUrl === "string" && json.remoteHaUrl.trim() ? json.remoteHaUrl.trim() : undefined;

      setStatusMessage("Configuration reçue. Enregistrement sur le panneau…");

      // Enregistrement de la configuration complète dans le storage sécurisé
      await setHaConfig({
        localHaUrl: ha_url,
        remoteHaUrl,
        token,
      });

      // Mise à jour du store runtime
      setConnection({
        url: ha_url,
        token,
        connected: true,
      });

      setStatus("success");
      setStatusMessage("Configuration importée avec succès. Connexion à Home Assistant établie.");

      // Redémarrage rapide de l'app pour repartir avec la nouvelle config
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      console.error("[PanelOnboarding] Erreur lors de la récupération de config via HA :", error);
      setStatus("error");
      setStatusMessage("");

      if (error?.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Une erreur inconnue s'est produite lors de la récupération de la configuration.");
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && status !== "loading" && status !== "success") {
      handleImportConfig();
    }
  };

  const isInputDisabled = status === "loading" || status === "success";
  const isButtonDisabled = status === "loading" || status === "success";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={neoliaLogoDark} alt="Neolia Logo Dark" className="h-16 dark:hidden" />
          <img src={neoliaLogo} alt="Neolia Logo" className="h-16 hidden dark:block" />
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">Configuration du panneau Neolia</CardTitle>
            </div>
            <CardDescription className="text-lg leading-relaxed">
              L&apos;installateur a déjà poussé la configuration de ce panneau dans Home Assistant, via l&apos;outil{" "}
              <strong>Neolia Configurator</strong>. Saisissez l&apos;URL ou l&apos;adresse IP de Home Assistant sur le
              réseau local, puis récupérez la configuration.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Champ URL HA */}
            <div className="space-y-3">
              <Label htmlFor="ha-base-url" className="text-lg">
                Adresse de Home Assistant (LAN)
              </Label>
              <Input
                id="ha-base-url"
                type="text"
                placeholder="192.168.1.20:8123 ou http://192.168.1.20:8123"
                value={haBaseUrl}
                onChange={(e) => setHaBaseUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isInputDisabled}
                className="text-lg h-14"
              />
              <p className="text-sm text-muted-foreground">
                Utilisez l&apos;adresse IP locale de votre instance Home Assistant. Ne saisissez pas le token ici : il
                sera récupéré automatiquement si la configuration a été poussée.
              </p>
            </div>

            {/* Message de statut pendant le chargement */}
            {status === "loading" && statusMessage && (
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <AlertDescription className="text-base text-blue-600 dark:text-blue-400">
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Message d'erreur */}
            {status === "error" && errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base whitespace-pre-line">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Message de succès */}
            {status === "success" && statusMessage && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-base text-green-600 dark:text-green-400">
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Bouton d'import */}
            <Button onClick={handleImportConfig} disabled={isButtonDisabled} size="lg" className="w-full h-16 text-lg">
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Récupération de la configuration…
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="mr-2 h-6 w-6" />
                  Configuration importée
                </>
              ) : (
                "Récupérer la configuration"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
