import { useState, useCallback, useEffect, useRef } from "react";
import type React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Server, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { setHaConfig, discoverHA, testHaConnection } from "@/services/haConfig";
import { useHAStore } from "@/store/useHAStore";
import { useNeoliaSettings } from "@/store/useNeoliaSettings";
import { isPanelMode } from "@/lib/platform";
import {
  connectNeoliaMqttPanel,
  subscribeNeoliaConfigGlobal,
} from "@/components/neolia/bootstrap/neoliaMqttClient";
import { parseNeoliaConfig, extractHaConnection } from "@/components/neolia/bootstrap/neoliaBootstrap";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";
import { DEFAULT_MQTT_PORT, DEV_DEFAULT_MQTT_HOST } from "@/config/networkDefaults";
import { useNeoliaPanelConfigStore } from "@/store/useNeoliaPanelConfigStore";
import { PanelSnEntryStep } from "@/ui/panel/components/PanelSnEntryStep";

type OnboardingStatus = "idle" | "loading" | "success" | "error";

const PANEL_CODE = "NEOLIA_DEFAULT_PANEL";

// ⚠️ TEMP TEST ONLY — À SUPPRIMER + RÉVOQUER APRÈS VALIDATION
const HARDCODED_HA_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmMTIyYzA5MGZkOGY0OGZlYjcxZjM5MjgzMjgwZTdmMSIsImlhdCI6MTc2Mjc2OTcxNSwiZXhwIjoyMDc4MTI5NzE1fQ.x7o25AkxgP8PXjTijmXkYOZeMDneeSZVPJT5kUi0emM";

function normalizeHaBaseUrl(raw: string): string {
  let url = (raw || "").trim();
  if (!url) throw new Error("URL Home Assistant vide");
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, "");
}

function extractHostFromUrlLike(rawUrl: string): string {
  try {
    const u = new URL(normalizeHaBaseUrl(rawUrl));
    return u.hostname;
  } catch {
    return rawUrl
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .split(":")[0]
      .trim();
  }
}

// Envoie la requête de découverte PnP sur MQTT après connexion
function sendPanelDiscoveryRequest(client: any, mode: "auto" | "manual") {
  try {
    const { enteredNeoliaCode } = useNeoliaPanelConfigStore.getState();
    const code = (enteredNeoliaCode || "").trim();

    if (!code) {
      console.warn("[PanelOnboarding] Aucun code Neolia enregistré, discovery ignorée.");
      return;
    }

    const topic = "neolia/panel/discover";
    const payload = JSON.stringify({
      code,
      mode,
      ts: new Date().toISOString(),
    });

    client.publish(topic, payload, { qos: 0 });
  } catch (e) {
    console.error("[PanelOnboarding] Erreur lors de l'envoi discovery MQTT:", e);
  }
}

export function PanelOnboarding() {
  const { hasCompletedSnStep } = useNeoliaPanelConfigStore();

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

  const { mqttHost, setMqttHost, setMqttPort, setMqttUseSecure, setMqttUsername, setMqttPassword } =
    useNeoliaSettings();

  const [shouldBypassPanelOnboarding, setShouldBypassPanelOnboarding] = useState(false);

  // ---- PnP UI visible (sans console) ----
  const [pnpState, setPnpState] = useState<"idle" | "scanning" | "found" | "not_found">("idle");
  const [pnpFoundUrl, setPnpFoundUrl] = useState<string | null>(null);
  const [pnpHint, setPnpHint] = useState<string>("");

  // évite de relancer la connexion automatique en boucle
  const autoConnectStartedRef = useRef(false);

  useEffect(() => {
    if (!isPanelMode()) return;

    try {
      const flag = window.localStorage.getItem("neolia_panel_onboarding_completed");
      if (flag === "1") {
        setShouldBypassPanelOnboarding(true);
        window.location.href = "/";
      }
    } catch {
      // ignore
    }
  }, []);

  const runPnPScan = useCallback(async () => {
    if (!isPanelMode()) return;
    if (!hasCompletedSnStep) return;

    setPnpState("scanning");
    setPnpFoundUrl(null);
    setPnpHint("Scan du réseau en cours (PnP)…");

    const found = await discoverHA({
      verbose: false,
      timeoutMs: 650,
      concurrency: 14,
      scanSubnets: ["192.168.1", "192.168.0", "10.0.0", "172.16.0"],
    });

    if (found) {
      setPnpFoundUrl(found);
      setPnpState("found");
      setPnpHint(`Home Assistant détecté : ${found}`);

      // Pré-remplit le champ avec l'IP
      const host = extractHostFromUrlLike(found);
      if (host) setHaBaseUrl(host);
    } else {
      setPnpState("not_found");
      setPnpHint("Aucun Home Assistant détecté automatiquement sur le réseau.");
    }
  }, [hasCompletedSnStep]);

  useEffect(() => {
    if (!isPanelMode()) return;
    if (!hasCompletedSnStep) return;
    runPnPScan();
  }, [hasCompletedSnStep, runPnPScan]);

  const applyHaConfigFromMqtt = useCallback(
    async (payload: unknown) => {
      const config = parseNeoliaConfig(payload);
      if (!config) {
        setPanelError(true);
        setPanelConnecting(false);
        setPanelErrorMessage("Configuration Neolia invalide reçue via MQTT.");
        setStatus("error");
        setStatusMessage("");
        setErrorMessage("Configuration Neolia invalide reçue via MQTT.");
        return;
      }

      const haConn = extractHaConnection(config);
      if (!haConn) {
        setPanelError(true);
        setPanelConnecting(false);
        setPanelErrorMessage("Configuration Home Assistant manquante dans le payload MQTT.");
        setStatus("error");
        setStatusMessage("");
        setErrorMessage("Configuration Home Assistant manquante dans le payload MQTT.");
        return;
      }

      try {
        await setHaConfig({
          localHaUrl: haConn.baseUrl,
          token: haConn.token,
        });
      } catch (e) {
        console.error("[PanelOnboarding] Erreur persistance config HA:", e);
      }

      setConnection({
        url: haConn.baseUrl,
        token: haConn.token,
        connected: false,
      });

      try {
        window.localStorage.setItem("neolia_panel_onboarding_completed", "1");
      } catch {
        // ignore
      }

      setPanelSuccess(true);
      setPanelConnecting(false);
      setStatus("success");
      setStatusMessage("Configuration reçue et appliquée. Redirection en cours…");

      setTimeout(() => {
        window.location.href = "/";
      }, 300);
    },
    [setConnection],
  );

  const attemptPanelConnection = useCallback(async () => {
    setPanelConnecting(true);
    setPanelError(false);
    setPanelSuccess(false);
    setPanelErrorMessage("");

    // 1) si mqttHost est déjà défini, on le respecte
    // 2) sinon on dérive depuis HA détecté (pnpFoundUrl/haBaseUrl)
    // 3) sinon fallback dev
    const derivedHost =
      (pnpFoundUrl ? extractHostFromUrlLike(pnpFoundUrl) : "") || (haBaseUrl || "").trim();

    const effectiveMqttHost = (mqttHost || derivedHost || DEV_DEFAULT_MQTT_HOST || "").trim();

    if (!effectiveMqttHost) {
      setPanelError(true);
      setPanelConnecting(false);
      setPanelErrorMessage(
        "Impossible de déterminer l'adresse du serveur MQTT.\n\n" +
          "Vérifie que le broker MQTT est accessible sur le réseau (souvent sur la machine HA) et relance.",
      );
      return;
    }

    setMqttHost(effectiveMqttHost);
    setMqttPort(DEFAULT_MQTT_PORT);
    setMqttUseSecure(false);
    setMqttUsername("panel");
    setMqttPassword("PanelMQTT!2025");

    try {
      const result = await connectNeoliaMqttPanel(
        () => {},
        (error) => {
          setPanelError(true);
          setPanelConnecting(false);
          setPanelErrorMessage(String(error?.message || error));
        },
      );

      if (!result?.client) {
        setPanelError(true);
        setPanelConnecting(false);
        setPanelErrorMessage("Connexion MQTT impossible (client non initialisé).");
        return;
      }

      subscribeNeoliaConfigGlobal(result.client, applyHaConfigFromMqtt);
      sendPanelDiscoveryRequest(result.client, "auto");
    } catch (error) {
      setPanelError(true);
      setPanelConnecting(false);
      setPanelErrorMessage(String((error as any)?.message || error));
    }
  }, [
    mqttHost,
    pnpFoundUrl,
    haBaseUrl,
    setMqttHost,
    setMqttPort,
    setMqttUseSecure,
    setMqttUsername,
    setMqttPassword,
    applyHaConfigFromMqtt,
  ]);

  // DÉCLENCHEMENT AUTOMATIQUE : après le SN step, on tente MQTT direct
  useEffect(() => {
    if (!isPanelMode()) return;
    if (!hasCompletedSnStep) return;
    if (manualMode) return;
    if (shouldBypassPanelOnboarding) return;
    if (autoConnectStartedRef.current) return;

    autoConnectStartedRef.current = true;

    // petit délai pour laisser l'UI s'afficher proprement
    setTimeout(() => {
      attemptPanelConnection();
    }, 50);
  }, [hasCompletedSnStep, manualMode, shouldBypassPanelOnboarding, attemptPanelConnection]);

  // ---------------- PANEL MODE ----------------
  if (isPanelMode()) {
    if (shouldBypassPanelOnboarding) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (!hasCompletedSnStep) {
      return <PanelSnEntryStep />;
    }

    const handlePnPConnect = async () => {
      try {
        const host = (haBaseUrl || "").trim();

        if (!host) {
          setStatus("error");
          setErrorMessage("Adresse IP Home Assistant manquante.");
          return;
        }

        const token = (HARDCODED_HA_TOKEN || "").trim();
        if (!token) {
          setStatus("error");
          setErrorMessage("Token hardcodé manquant (HARDCODED_HA_TOKEN).");
          return;
        }

        const baseUrl = normalizeHaBaseUrl(host.includes(":") ? host : `${host}:8123`);

        setStatus("loading");
        setErrorMessage("");
        setStatusMessage("Test de connexion à Home Assistant…");

        const ok = await testHaConnection(baseUrl, token, 1500);
        if (!ok) {
          setStatus("error");
          setStatusMessage("");
          setErrorMessage("Connexion refusée. Vérifie : IP/port 8123, et access_token valide.");
          return;
        }

        setStatusMessage("Connexion OK. Enregistrement de la configuration…");

        await setHaConfig({
          localHaUrl: baseUrl,
          token,
        });

        setConnection({
          url: baseUrl,
          token,
          connected: false,
        });

        try {
          window.localStorage.setItem("neolia_panel_onboarding_completed", "1");
        } catch {
          // ignore
        }

        setStatus("success");
        setStatusMessage("Configuration appliquée. Redirection…");

        setTimeout(() => {
          window.location.href = "/";
        }, 300);
      } catch (e: any) {
        setStatus("error");
        setStatusMessage("");
        setErrorMessage(e?.message || "Erreur inconnue.");
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
                Connexion Plug &amp; Play : après le code, le panneau se connecte automatiquement et ouvre Accueil.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* ---- Bandeau PnP visible ---- */}
              <Alert
                className={
                  pnpState === "found"
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : pnpState === "not_found"
                      ? "border-red-500 bg-red-50 dark:bg-red-950"
                      : "border-blue-500 bg-blue-50 dark:bg-blue-950"
                }
              >
                {pnpState === "scanning" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : pnpState === "found" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : pnpState === "not_found" ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                )}

                <AlertDescription className="text-base whitespace-pre-line">
                  {pnpHint || "PnP prêt."}
                </AlertDescription>
              </Alert>

              <Button
                variant="outline"
                onClick={runPnPScan}
                disabled={pnpState === "scanning"}
                size="lg"
                className="w-full h-14"
              >
                {pnpState === "scanning" ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Scan PnP en cours…
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Relancer le scan PnP
                  </>
                )}
              </Button>

              {/* MODE AUTO (MQTT) : lancé automatiquement */}
              {!manualMode && (
                <>
                  <Button
                    onClick={() => {
                      // reset auto flag to allow retry through same flow
                      autoConnectStartedRef.current = true;
                      attemptPanelConnection();
                    }}
                    disabled={panelConnecting}
                    size="lg"
                    className="w-full h-16 text-lg"
                  >
                    {panelConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Connexion automatique en cours…
                      </>
                    ) : panelSuccess ? (
                      <>
                        <CheckCircle2 className="mr-2 h-6 w-6" />
                        Connecté — ouverture d’Accueil…
                      </>
                    ) : (
                      "Relancer la connexion automatique (MQTT)"
                    )}
                  </Button>

                  {!panelConnecting && panelError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-5 w-5" />
                      <AlertDescription className="text-base whitespace-pre-line">
                        {panelErrorMessage || "Erreur de connexion MQTT."}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* accès au mode de secours uniquement si besoin */}
                  <Button
                    variant="outline"
                    onClick={() => setManualMode(true)}
                    size="lg"
                    className="w-full h-14"
                  >
                    Mode secours : Plug &amp; Play (détection + token hardcodé)
                  </Button>
                </>
              )}

              {/* MODE SECOURS (hardcoded token) */}
              {manualMode && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="ha-base-url-panel" className="text-lg">
                      Adresse IP de Home Assistant (LAN)
                    </Label>
                    <Input
                      id="ha-base-url-panel"
                      type="text"
                      placeholder="ex: 192.168.1.80"
                      value={haBaseUrl}
                      onChange={(e) => setHaBaseUrl(e.target.value)}
                      disabled={isInputDisabled}
                      className="text-lg h-14"
                    />
                    <p className="text-xs text-muted-foreground">
                      Détecté automatiquement :{" "}
                      <span className="font-medium">{pnpFoundUrl || "—"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Token : <span className="font-medium">hardcodé (temporaire)</span>
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
                      <AlertDescription className="text-base whitespace-pre-line">
                        {errorMessage}
                      </AlertDescription>
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
                      onClick={handlePnPConnect}
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
                          Config appliquée
                        </>
                      ) : (
                        "Valider et connecter (secours)"
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
                        setPanelError(false);
                        setPanelErrorMessage("");
                        setPanelSuccess(false);
                        setPanelConnecting(false);
                        // permet un nouveau démarrage auto
                        autoConnectStartedRef.current = false;
                      }}
                    >
                      Retour au mode automatique
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

  // ---------------- MODE MOBILE / TABLET (inchangé) ----------------
  const handleImportConfigMobile = async () => {
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
        if (response.status === 404) throw new Error("Aucune configuration trouvée pour ce panneau.");
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

      setTimeout(() => window.location.reload(), 500);
    } catch (error: any) {
      setStatus("error");
      setStatusMessage("");
      setErrorMessage(error?.message || "Erreur inconnue.");
    }
  };

  const handleKeyPressMobile = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && status !== "loading" && status !== "success") {
      handleImportConfigMobile();
    }
  };

  const isInputDisabledMobile = status === "loading" || status === "success";
  const isButtonDisabledMobile = status === "loading" || status === "success";

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
              Entrez l&apos;URL de votre Home Assistant pour récupérer la configuration du panneau.
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
                onKeyPress={handleKeyPressMobile}
                disabled={isInputDisabledMobile}
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
                <AlertDescription className="text-base whitespace-pre-line">
                  {errorMessage}
                </AlertDescription>
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

            <Button
              onClick={handleImportConfigMobile}
              disabled={isButtonDisabledMobile}
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
