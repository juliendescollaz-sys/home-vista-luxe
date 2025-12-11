import { useState, useCallback } from "react";
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
import { connectNeoliaMqttPanel, subscribeNeoliaConfigGlobal } from "@/components/neolia/bootstrap/neoliaMqttClient";
import { parseNeoliaConfig, extractHaConnection } from "@/components/neolia/bootstrap/neoliaBootstrap";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";
import { DEFAULT_MQTT_PORT, DEV_DEFAULT_MQTT_HOST } from "@/config/networkDefaults";
import { useNeoliaPanelConfigStore } from "@/store/useNeoliaPanelConfigStore";
import { PanelSnEntryStep } from "@/ui/panel/components/PanelSnEntryStep";

type OnboardingStatus = "idle" | "loading" | "success" | "error";

const PANEL_CODE = "NEOLIA_DEFAULT_PANEL";

function normalizeHaBaseUrl(raw: string): string {
  let url = (raw || "").trim();
  if (!url) {
    throw new Error("URL Home Assistant vide");
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, "");
}

export function PanelOnboarding() {
  const { hasCompletedSnStep } = useNeoliaPanelConfigStore();
  const [snStepCompleted, setSnStepCompleted] = useState(hasCompletedSnStep);
  const [haBaseUrl, setHaBaseUrl] = useState("");
  const [status, setStatus] = useState<OnboardingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const setConnection = useHAStore((state) => state.setConnection);

  const [panelConnecting, setPanelConnecting] = useState(false);
  const [panelError, setPanelError] = useState(false);
  const [panelSuccess, setPanelSuccess] = useState(false);
  const [panelErrorMessage, setPanelErrorMessage] = useState("");
  const [manualMode, setManualMode] = useState(false);

  const { mqttHost, setMqttHost, setMqttPort, setMqttUseSecure, setMqttUsername, setMqttPassword } = useNeoliaSettings();

  /**
   * Applique la configuration HA reçue via MQTT et redirige vers l'accueil.
   * Gère les états pour les modes auto ET manuel.
   */
  const applyHaConfigFromMqtt = useCallback(async (payload: unknown) => {
    console.log("[PanelOnboarding] Payload MQTT reçu:", payload);
    
    const config = parseNeoliaConfig(payload);
    if (!config) {
      console.error("[PanelOnboarding] Payload Neolia invalide");
      // Mode auto
      setPanelError(true);
      setPanelConnecting(false);
      setPanelErrorMessage("Configuration Neolia invalide reçue via MQTT.");
      // Mode manuel
      setStatus("error");
      setStatusMessage("");
      setErrorMessage("Configuration Neolia invalide reçue via MQTT.");
      return;
    }
    
    const haConn = extractHaConnection(config);
    if (!haConn) {
      console.error("[PanelOnboarding] Impossible d'extraire la config HA du payload");
      // Mode auto
      setPanelError(true);
      setPanelConnecting(false);
      setPanelErrorMessage("Configuration Home Assistant manquante dans le payload MQTT.");
      // Mode manuel
      setStatus("error");
      setStatusMessage("");
      setErrorMessage("Configuration Home Assistant manquante dans le payload MQTT.");
      return;
    }
    
    console.log("[PanelOnboarding] Configuration HA extraite:", haConn.baseUrl);
    
    // Persister la config HA
    try {
      await setHaConfig({
        localHaUrl: haConn.baseUrl,
        token: haConn.token,
      });
    } catch (e) {
      console.error("[PanelOnboarding] Erreur lors de la persistance de la config HA:", e);
    }
    
    // Mettre à jour le store HA
    setConnection({
      url: haConn.baseUrl,
      token: haConn.token,
      connected: false,
    });
    
    // Marquer l'onboarding Panel comme terminé
    try {
      window.localStorage.setItem("neolia_panel_onboarding_completed", "1");
    } catch {
      // ignore storage errors
    }
    
    // Mode auto
    setPanelSuccess(true);
    setPanelConnecting(false);
    // Mode manuel
    setStatus("success");
    setStatusMessage("Configuration reçue et appliquée. Redirection en cours…");
    
    console.log("[PanelOnboarding] Configuration appliquée, redirection...");
    
    // Redirection vers l'accueil
    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  }, [setConnection]);

  /**
   * Connexion automatique : utilise le host MQTT du store ou de l'env de dev.
   * En PROD, si aucun host n'est configuré, affiche une erreur explicite.
   */
  const attemptPanelConnection = useCallback(async () => {
    console.log("[PanelOnboarding] Tentative de connexion MQTT Panel (auto)…");

    setPanelConnecting(true);
    setPanelError(false);
    setPanelSuccess(false);
    setPanelErrorMessage("");

    // Vérifier si un host MQTT est disponible
    const effectiveMqttHost = mqttHost || DEV_DEFAULT_MQTT_HOST;
    
    if (!effectiveMqttHost) {
      console.error("[PanelOnboarding] Aucun host MQTT configuré");
      setPanelError(true);
      setPanelConnecting(false);
      setPanelErrorMessage(
        "Aucune adresse de serveur MQTT configurée.\n\n" +
        "Utilisez la connexion manuelle pour spécifier l'adresse IP de Home Assistant."
      );
      return;
    }

    // Configurer les paramètres MQTT
    setMqttHost(effectiveMqttHost);
    setMqttPort(DEFAULT_MQTT_PORT);
    setMqttUseSecure(false);
    setMqttUsername("panel");
    setMqttPassword("PanelMQTT!2025");

    try {
      const result = await connectNeoliaMqttPanel(
        () => {
          console.log("[PanelOnboarding] Connexion MQTT réussie (callback)");
        },
        (error) => {
          console.log("[PanelOnboarding] Erreur MQTT:", error);
          setPanelError(true);
          setPanelConnecting(false);
          setPanelErrorMessage(String(error?.message || error));
        },
      );

      if (!result?.client) {
        setPanelError(true);
        setPanelConnecting(false);
        return;
      }

      console.log("[PanelOnboarding] Connexion MQTT OK, souscription au topic neolia/config/global...");
      
      // S'abonner au topic de configuration et attendre le payload
      subscribeNeoliaConfigGlobal(result.client, applyHaConfigFromMqtt);
      
    } catch (error) {
      console.error("[PanelOnboarding] Exception lors de la connexion MQTT:", error);
      setPanelError(true);
      setPanelConnecting(false);
      setPanelErrorMessage(String((error as any)?.message || error));
    }
  }, [mqttHost, setMqttHost, setMqttPort, setMqttUseSecure, setMqttUsername, setMqttPassword, applyHaConfigFromMqtt]);

  /**
   * MODE PANEL : Étape SN puis Auto (MQTT) / Manuel (MQTT aussi)
   */
  if (isPanelMode()) {
    // Si l'étape SN n'est pas encore complétée, afficher l'écran de saisie du code
    if (!snStepCompleted) {
      return (
        <PanelSnEntryStep
          onComplete={() => setSnStepCompleted(true)}
        />
      );
    }
    /**
     * Connexion manuelle : même mécanique que l'auto,
     * mais en prenant l'IP saisie comme host MQTT.
     */
    const handleImportConfig = async () => {
      const trimmed = haBaseUrl.trim();

      if (!trimmed) {
        setErrorMessage("Veuillez saisir l'adresse IP de Home Assistant.");
        setStatus("error");
        return;
      }

      // On autorise éventuellement "ip:port", mais on utilise seulement la partie IP comme host MQTT
      const host = trimmed.split(":")[0].trim();

      if (!host) {
        setErrorMessage("Adresse IP du Home Assistant invalide.");
        setStatus("error");
        return;
      }

      console.log("[PanelOnboarding] Connexion manuelle via MQTT, host:", host);

      setStatus("loading");
      setErrorMessage("");
      setStatusMessage(
        "Connexion au broker MQTT du Home Assistant et récupération de la configuration du panneau…",
      );

      // Configuration MQTT avec le host saisi par l'utilisateur
      setMqttHost(host);
      setMqttPort(DEFAULT_MQTT_PORT);
      setMqttUseSecure(false);
      setMqttUsername("panel");
      setMqttPassword("PanelMQTT!2025");

      try {
        const result = await connectNeoliaMqttPanel(
          () => {
            console.log("[PanelOnboarding] Connexion MQTT manuelle réussie (callback)");
          },
          (error) => {
            console.log("[PanelOnboarding] Erreur MQTT manuelle:", error);
            setStatus("error");
            setStatusMessage("");
            setErrorMessage(String(error?.message || error));
          },
        );

        if (!result?.client) {
          setStatus("error");
          setStatusMessage("");
          if (!errorMessage) {
            setErrorMessage("Connexion MQTT échouée (client indisponible).");
          }
          return;
        }

        console.log("[PanelOnboarding] Connexion MQTT manuelle OK, souscription au topic...");
        setStatusMessage("Connexion MQTT établie. Attente de la configuration Home Assistant…");
        
        // S'abonner au topic de configuration et attendre le payload
        subscribeNeoliaConfigGlobal(result.client, applyHaConfigFromMqtt);
        
      } catch (error: any) {
        console.error("[PanelOnboarding] Exception lors de la connexion MQTT manuelle:", error);
        setStatus("error");
        setStatusMessage("");
        setErrorMessage(error?.message || "Erreur inconnue lors de la connexion manuelle.");
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
                Ce panneau peut se connecter automatiquement au bon Home Assistant via MQTT (recommandé) ou manuellement
                à une instance spécifique du réseau local.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {!manualMode && (
                <>
                  <div className="space-y-4">
                    <Button
                      onClick={attemptPanelConnection}
                      disabled={panelConnecting}
                      size="lg"
                      className="w-full h-16 text-lg"
                    >
                      {panelConnecting ? (
                        <>
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          Connexion automatique en cours…
                        </>
                      ) : (
                        "Connexion automatique (recommandée)"
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setManualMode(true)}
                      size="lg"
                      className="w-full h-16 text-lg"
                    >
                      Connexion manuelle
                    </Button>
                  </div>

                  {panelConnecting && (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-base text-muted-foreground">Connexion à Home Assistant via MQTT…</p>
                      <p className="text-xs text-muted-foreground">Tentative sur les ports 1884 et 9001.</p>
                    </div>
                  )}

                  {!panelConnecting && panelSuccess && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <AlertDescription className="text-base text-green-600 dark:text-green-400">
                        Connexion automatique établie. Redirection en cours…
                      </AlertDescription>
                    </Alert>
                  )}

                  {!panelConnecting && panelError && (
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertCircle className="h-5 w-5" />
                        <AlertDescription className="text-base whitespace-pre-line">
                          Impossible de se connecter automatiquement à Home Assistant.
                          {panelErrorMessage && `\n\nDétail : ${panelErrorMessage}`}
                        </AlertDescription>
                      </Alert>

                      <div className="text-sm text-muted-foreground space-y-2">
                        <p className="font-medium">Assurez-vous que :</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li>Home Assistant est allumé et sur le même réseau que le panneau.</li>
                          <li>L&apos;addon Mosquitto tourne.</li>
                          <li>Le WebSocket MQTT est actif sur 1884 (ou 9001).</li>
                        </ul>
                      </div>

                      <Button onClick={attemptPanelConnection} size="lg" className="w-full h-14">
                        <RefreshCw className="mr-2 h-5 w-5" />
                        Réessayer la connexion automatique
                      </Button>
                    </div>
                  )}
                </>
              )}

              {manualMode && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="ha-base-url-panel" className="text-lg">
                      Adresse IP de Home Assistant (LAN)
                    </Label>
                    <Input
                      id="ha-base-url-panel"
                      type="text"
                      placeholder="ex: 192.168.1.50"
                      value={haBaseUrl}
                      onChange={(e) => setHaBaseUrl(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isInputDisabled}
                      className="text-lg h-14"
                    />
                    <p className="text-xs text-muted-foreground">
                      Saisissez l'adresse IP locale de votre Home Assistant
                    </p>
                  </div>

                  {status === "loading" && statusMessage && (
                    <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      <AlertDescription className="text-base text-blue-600 dark:text-blue-400">
                        {statusMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  {status === "error" && errorMessage && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-5 w-5" />
                      <AlertDescription className="text-base whitespace-pre-line">{errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  {status === "success" && statusMessage && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <AlertDescription className="text-base text-green-600 dark:text-green-400">
                        {statusMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex flex-col gap-3">
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
                        "Valider la connexion manuelle"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-full h-14"
                      onClick={() => {
                        setManualMode(false);
                        setStatus("idle");
                        setStatusMessage("");
                        setErrorMessage("");
                      }}
                    >
                      Retour à la connexion automatique
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // =================================================
  // MODE MOBILE / TABLET (inchangé)
  // =================================================
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

    setStatusMessage("Connexion à Home Assistant et récupération de la configuration du panneau…");

    const apiUrl = `${baseUrl}/api/neolia/panel_config/${encodeURIComponent(PANEL_CODE)}`;

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Aucune configuration trouvée pour ce panneau.");
        }
        throw new Error(`Erreur Home Assistant ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      if (!json || typeof json !== "object" || !json.ha_url || !json.token) {
        throw new Error("Réponse invalide ou incomplète reçue de Home Assistant.");
      }

      const ha_url: string = json.ha_url;
      const token: string = json.token;
      const remoteHaUrl: string | undefined = json.remoteHaUrl?.trim() || undefined;

      setStatusMessage("Configuration reçue. Enregistrement sur le panneau…");

      await setHaConfig({
        localHaUrl: ha_url,
        remoteHaUrl,
        token,
      });

      setConnection({
        url: ha_url,
        token,
        connected: true,
      });

      setStatus("success");
      setStatusMessage("Configuration importée avec succès.");

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      setStatus("error");
      setStatusMessage("");
      setErrorMessage(error?.message || "Erreur inconnue.");
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
        <div className="flex justify-center mb-8">
          <img src={neoliaLogoDark} alt="Neolia Logo Dark" className="h-16 dark:hidden" />
          <img src={neoliaLogo} alt="Neolia Logo" className="h-16 hidden dark:block" />
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">Connexion à Home Assistant</CardTitle>
            </div>
            <CardDescription className="text-lg leading-relaxed">
              Entrez l'URL de votre Home Assistant pour récupérer la configuration du panneau.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="ha-base-url" className="text-lg">
                URL ou IP de Home Assistant
              </Label>
              <Input
                id="ha-base-url"
                type="text"
                placeholder="ex: 192.168.1.20:8123"
                value={haBaseUrl}
                onChange={(e) => setHaBaseUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isInputDisabled}
                className="text-lg h-14"
              />
            </div>

            {status === "loading" && statusMessage && (
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <AlertDescription className="text-base text-blue-600 dark:text-blue-400">
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

            {status === "error" && errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base whitespace-pre-line">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {status === "success" && statusMessage && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-base text-green-600 dark:text-green-400">
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

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
