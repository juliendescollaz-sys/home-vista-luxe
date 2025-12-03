import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Server, AlertCircle, CheckCircle2 } from "lucide-react";
import { setHaConfig } from "@/services/haConfig";
import { useHAStore } from "@/store/useHAStore";
import { useNeoliaSettings } from "@/store/useNeoliaSettings";
import { isPanelMode } from "@/lib/platform";
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
 * - Skip total de l'UI d'onboarding
 * - Configuration MQTT automatique avec valeurs par défaut
 * - Redirection immédiate vers l'écran principal
 * 
 * Mode Mobile/Tablet :
 * - Affiche l'UI classique de récupération de config via HA
 */
export function PanelOnboarding() {
  const [haBaseUrl, setHaBaseUrl] = useState("");
  const [status, setStatus] = useState<OnboardingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const setConnection = useHAStore((state) => state.setConnection);

  const {
    setMqttHost,
    setMqttPort,
    setMqttUseSecure,
    setMqttUsername,
    setMqttPassword,
  } = useNeoliaSettings();

  // ============================================
  // MODE PANEL : Zero-Config automatique
  // ============================================
  useEffect(() => {
    if (isPanelMode()) {
      console.log("[PanelOnboarding] Mode Panel détecté → Zero-Config automatique");

      // Configuration MQTT par défaut pour le Panel
      setMqttHost("homeassistant.local");
      setMqttPort(1884);
      setMqttUseSecure(false);
      setMqttUsername("panel");
      setMqttPassword("PanelMQTT!2025");

      console.log("[PanelOnboarding] Configuration MQTT appliquée, onboarding terminé");

      // Redirection vers l'écran principal après un court délai
      // pour permettre aux stores de se mettre à jour
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    }
  }, [setMqttHost, setMqttPort, setMqttUseSecure, setMqttUsername, setMqttPassword]);

  // ============================================
  // MODE PANEL : Ne jamais afficher l'UI
  // ============================================
  if (isPanelMode()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg text-muted-foreground">Configuration automatique du panneau…</p>
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
            "Vérifiez que l'installateur a bien poussé la configuration depuis son PC."
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
        typeof json.remoteHaUrl === "string" && json.remoteHaUrl.trim()
          ? json.remoteHaUrl.trim()
          : undefined;

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
          <img
            src={neoliaLogoDark}
            alt="Neolia Logo Dark"
            className="h-16 dark:hidden"
          />
          <img
            src={neoliaLogo}
            alt="Neolia Logo"
            className="h-16 hidden dark:block"
          />
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">Configuration du panneau Neolia</CardTitle>
            </div>
            <CardDescription className="text-lg leading-relaxed">
              L'installateur a déjà poussé la configuration de ce panneau dans Home Assistant,
              via l'outil <strong>Neolia Configurator</strong>. Saisissez l'URL ou l'adresse IP
              de Home Assistant sur le réseau local, puis récupérez la configuration.
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
                Utilisez l'adresse IP locale de votre instance Home Assistant. Ne saisissez pas
                le token ici : il sera récupéré automatiquement si la configuration a été poussée.
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
                <AlertDescription className="text-base whitespace-pre-line">
                  {errorMessage}
                </AlertDescription>
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
            <Button
              onClick={handleImportConfig}
              disabled={isButtonDisabled}
              size="lg"
              className="w-full h-16 text-lg"
            >
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
