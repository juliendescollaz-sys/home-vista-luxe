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
import { isPanelMode } from "@/lib/platform";
import {
  provisionPanelAuto,
  provisionPanelManual,
  applyPanelConfig,
} from "@/components/neolia/bootstrap/panelProvisioning";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";

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
  const [manualIp, setManualIp] = useState("");
  const [status, setStatus] = useState<OnboardingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const setConnection = useHAStore((state) => state.setConnection);

  const [panelConnecting, setPanelConnecting] = useState(false);
  const [panelError, setPanelError] = useState(false);
  const [panelSuccess, setPanelSuccess] = useState(false);
  const [panelErrorMessage, setPanelErrorMessage] = useState("");
  const [manualMode, setManualMode] = useState(false);

  // ========================================
  // Connexion automatique (MQTT PnP)
  // ========================================
  const attemptAutoConnection = useCallback(async () => {
    console.log("[PanelOnboarding] Tentative de connexion automatique (MQTT PnP)…");

    setPanelConnecting(true);
    setPanelError(false);
    setPanelSuccess(false);
    setPanelErrorMessage("");

    try {
      const config = await provisionPanelAuto();
      await applyPanelConfig(config);

      setPanelSuccess(true);
      setPanelConnecting(false);

      console.log("[PanelOnboarding] Connexion automatique réussie, redirection...");
      
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      console.error("[PanelOnboarding] Erreur connexion automatique:", error);
      setPanelError(true);
      setPanelConnecting(false);
      setPanelErrorMessage((error as Error)?.message || String(error));
    }
  }, []);

  // ========================================
  // Connexion manuelle (MQTT avec IP saisie)
  // ========================================
  const attemptManualConnection = useCallback(async () => {
    const trimmedIp = manualIp.trim();

    if (!trimmedIp) {
      setErrorMessage("Veuillez saisir l'adresse IP du Home Assistant.");
      setStatus("error");
      return;
    }

    console.log("[PanelOnboarding] Tentative de connexion manuelle (MQTT) vers:", trimmedIp);

    setStatus("loading");
    setErrorMessage("");
    setStatusMessage("Connexion au broker MQTT et récupération de la configuration…");

    try {
      const config = await provisionPanelManual(trimmedIp);
      
      setStatusMessage("Configuration reçue. Application…");
      await applyPanelConfig(config);

      setStatus("success");
      setStatusMessage("Configuration importée avec succès.");

      console.log("[PanelOnboarding] Connexion manuelle réussie, redirection...");

      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      console.error("[PanelOnboarding] Erreur connexion manuelle:", error);
      setStatus("error");
      setStatusMessage("");
      setErrorMessage((error as Error)?.message || "Erreur inconnue.");
    }
  }, [manualIp]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && status !== "loading" && status !== "success") {
      attemptManualConnection();
    }
  };

  // =================================================
  // MODE PANEL : double choix Auto (MQTT) / Manuel (MQTT)
  // =================================================
  if (isPanelMode()) {
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
                      onClick={attemptAutoConnection}
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
                          <li>L'addon Mosquitto tourne.</li>
                          <li>Le WebSocket MQTT est actif sur 1884 (ou 9001).</li>
                        </ul>
                      </div>

                      <Button onClick={attemptAutoConnection} size="lg" className="w-full h-14">
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
                    <Label htmlFor="manual-ip" className="text-lg">
                      Adresse IP du Home Assistant
                    </Label>
                    <Input
                      id="manual-ip"
                      type="text"
                      placeholder="192.168.1.50"
                      value={manualIp}
                      onChange={(e) => setManualIp(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isInputDisabled}
                      className="text-lg h-14"
                    />
                    <p className="text-sm text-muted-foreground">
                      Entrez uniquement l'adresse IP (ex: 192.168.1.50). La connexion se fera via MQTT.
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
                      onClick={attemptManualConnection}
                      disabled={isButtonDisabled}
                      size="lg"
                      className="w-full h-16 text-lg"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          Connexion en cours…
                        </>
                      ) : status === "success" ? (
                        <>
                          <CheckCircle2 className="mr-2 h-6 w-6" />
                          Configuration importée
                        </>
                      ) : (
                        "Connexion manuelle"
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
  // MODE MOBILE / TABLET (inchangé - utilise HTTP)
  // =================================================
  const [haBaseUrl, setHaBaseUrl] = useState("");
  
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

  const handleKeyPressMobile = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
              L'installateur a déjà poussé la configuration via Neolia Configurator.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="ha-base-url" className="text-lg">
                Adresse de Home Assistant (LAN)
              </Label>
              <Input
                id="ha-base-url"
                type="text"
                placeholder="192.168.1.20:8123"
                value={haBaseUrl}
                onChange={(e) => setHaBaseUrl(e.target.value)}
                onKeyPress={handleKeyPressMobile}
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
