import { useState, useCallback, useEffect, useRef } from "react";
import type React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Server, AlertCircle, CheckCircle2, RefreshCw, WifiOff, KeyRound } from "lucide-react";
import { setHaConfig, discoverHA, testHaConnection } from "@/services/haConfig";
import { useHAStore } from "@/store/useHAStore";
import { useNeoliaSettings } from "@/store/useNeoliaSettings";
import { isPanelMode } from "@/lib/platform";
import { NeoliaLoadingScreen } from "@/ui/panel/components/NeoliaLoadingScreen";
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
type PanelFlow = "auto_loading" | "auto_error" | "manual";

const PANEL_ID = "panel";

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

function markTransitionToHome() {
  try {
    sessionStorage.setItem("neolia_panel_transition", "1");
  } catch {
    // ignore
  }
}

function gotoHomeSoon(delayMs = 250) {
  markTransitionToHome();
  window.setTimeout(() => {
    window.location.href = "/";
  }, delayMs);
}

/**
 * Appairage HTTP (Option A) :
 * - Le Configurator écrit SN4 via /api/neolia/pair_code
 * - Le Configurator écrit le panel_token via /api/neolia/panel_token
 * - Le panel appelle /api/neolia/pair (sans auth) avec le code SN4
 * => HA renvoie { ha_url, token } et le panel peut persister la config.
 */
async function fetchPanelConfigFromHaPairing(haBaseUrl: string, sn4: string): Promise<{ ha_url: string; token: string }> {
  const base = normalizeHaBaseUrl(haBaseUrl);
  const url = `${base}/api/neolia/pair`;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 2200);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code: sn4, panel_id: PANEL_ID }),
      signal: controller.signal,
    });

    // Important : on veut un message utile si erreur
    let json: any = null;
    try {
      json = await resp.json();
    } catch {
      // ignore
    }

    if (!resp.ok) {
      const err = json?.error ? String(json.error) : `HTTP_${resp.status}`;
      // Cas utile : token non set
      if (resp.status === 409 && err === "panel_token_not_set") {
        throw new Error(
          "Le token du panel n'est pas défini dans Home Assistant (panel_token_not_set). " +
            "Dans Configurator, clique sur 'Charger vers HA' après avoir renseigné le token.",
        );
      }
      if (resp.status === 401 && err === "mismatch") {
        throw new Error("Le code SN4 ne correspond pas (mismatch). Vérifie les 4 derniers caractères du SN.");
      }
      if (resp.status === 409 && err === "pair_code_not_set") {
        throw new Error("Le code SN4 n'est pas enregistré dans Home Assistant (pair_code_not_set).");
      }
      throw new Error(`Pairing refusé: ${err}`);
    }

    if (!json || typeof json !== "object" || typeof json.ha_url !== "string" || typeof json.token !== "string") {
      throw new Error("Réponse pairing invalide (ha_url/token manquants).");
    }

    return { ha_url: json.ha_url, token: json.token };
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("TIMEOUT: Home Assistant ne répond pas (pairing).");
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
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
  const [adminToken, setAdminToken] = useState("");

  const [status, setStatus] = useState<OnboardingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const setConnection = useHAStore((state) => state.setConnection);

  const [panelConnecting, setPanelConnecting] = useState(false);
  const [panelSuccess, setPanelSuccess] = useState(false);
  const [panelErrorMessage, setPanelErrorMessage] = useState("");

  const { mqttHost, setMqttHost, setMqttPort, setMqttUseSecure, setMqttUsername, setMqttPassword } =
    useNeoliaSettings();

  const [shouldBypassPanelOnboarding, setShouldBypassPanelOnboarding] = useState(false);

  // ---- PnP UI visible (sans console) ----
  const [pnpState, setPnpState] = useState<"idle" | "scanning" | "found" | "not_found">("idle");
  const [pnpFoundUrl, setPnpFoundUrl] = useState<string | null>(null);

  // Flow UX
  const [flow, setFlow] = useState<PanelFlow>("auto_loading");
  const [failCount, setFailCount] = useState(0);

  // évite boucle
  const autoConnectStartedRef = useRef(false);

  useEffect(() => {
    if (!isPanelMode()) return;

    try {
      const flag = window.localStorage.getItem("neolia_panel_onboarding_completed");
      if (flag === "1") {
        setShouldBypassPanelOnboarding(true);
        gotoHomeSoon(0);
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

    const found = await discoverHA({
      verbose: false,
      timeoutMs: 650,
      concurrency: 14,
      scanSubnets: ["192.168.1", "192.168.0", "10.0.0", "172.16.0"],
    });

    if (found) {
      setPnpFoundUrl(found);
      setPnpState("found");

      const host = extractHostFromUrlLike(found);
      if (host) setHaBaseUrl(host);

      autoConnectStartedRef.current = false;
    } else {
      setPnpState("not_found");
    }
  }, [hasCompletedSnStep]);

  useEffect(() => {
    if (!isPanelMode()) return;
    if (!hasCompletedSnStep) return;
    runPnPScan();
  }, [hasCompletedSnStep, runPnPScan]);

  const finalizePanelConfig = useCallback(
    async (baseUrl: string, token: string) => {
      try {
        await setHaConfig({
          localHaUrl: baseUrl,
          token,
        });
      } catch (e) {
        console.error("[PanelOnboarding] Erreur persistance config HA:", e);
      }

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

      setPanelSuccess(true);
      setPanelConnecting(false);
      setFlow("auto_loading");

      gotoHomeSoon(250);
    },
    [setConnection],
  );

  const applyHaConfigFromMqtt = useCallback(
    async (payload: unknown) => {
      const config = parseNeoliaConfig(payload);
      if (!config) {
        setPanelConnecting(false);
        setPanelErrorMessage("Configuration Neolia invalide reçue via MQTT.");
        setFlow("auto_error");
        return;
      }

      const haConn = extractHaConnection(config);
      if (!haConn) {
        setPanelConnecting(false);
        setPanelErrorMessage("Configuration Home Assistant manquante dans le payload MQTT.");
        setFlow("auto_error");
        return;
      }

      await finalizePanelConfig(haConn.baseUrl, haConn.token);
    },
    [finalizePanelConfig],
  );

  const getEffectiveHaUrlForPairing = useCallback((): string | null => {
    // Priorité : URL trouvée par PnP (contient déjà le port)
    if (pnpFoundUrl) return normalizeHaBaseUrl(pnpFoundUrl);

    // Sinon : on reconstruit depuis le champ IP
    const host = (haBaseUrl || "").trim();
    if (!host) return null;

    const baseUrl = normalizeHaBaseUrl(host.includes(":") ? host : `${host}:8123`);
    return baseUrl;
  }, [pnpFoundUrl, haBaseUrl]);

  const getSn4 = useCallback((): string => {
    const { enteredNeoliaCode } = useNeoliaPanelConfigStore.getState();
    return (enteredNeoliaCode || "").trim();
  }, []);

  const attemptPanelHttpPairingFirst = useCallback(async () => {
    const sn4 = getSn4();
    if (!sn4 || sn4.length !== 4) {
      throw new Error("Code SN4 invalide. Reviens à l'étape SN et saisis exactement 4 caractères.");
    }

    const haUrl = getEffectiveHaUrlForPairing();
    if (!haUrl) {
      throw new Error("Impossible de déterminer l'URL Home Assistant. Relance le scan PnP ou saisis l'IP.");
    }

    const pair = await fetchPanelConfigFromHaPairing(haUrl, sn4);

    // On préfère la ha_url renvoyée par HA (source de vérité)
    const finalUrl = normalizeHaBaseUrl(pair.ha_url || haUrl);
    await finalizePanelConfig(finalUrl, pair.token);
  }, [getSn4, getEffectiveHaUrlForPairing, finalizePanelConfig]);

  const getEffectiveMqttHost = useCallback((): string => {
    if ((mqttHost || "").trim()) return (mqttHost || "").trim();
    const derived =
      (pnpFoundUrl ? extractHostFromUrlLike(pnpFoundUrl) : "") || (haBaseUrl || "").trim();
    if ((derived || "").trim()) return (derived || "").trim();
    return (DEV_DEFAULT_MQTT_HOST || "").trim();
  }, [mqttHost, pnpFoundUrl, haBaseUrl]);

  const attemptPanelConnection = useCallback(async () => {
    setPanelConnecting(true);
    setPanelErrorMessage("");

    // ✅ OPTION A : on tente d'abord l'appairage HTTP /api/neolia/pair
    try {
      await attemptPanelHttpPairingFirst();
      return; // success => redirection déjà lancée
    } catch (e: any) {
      // On log + on bascule sur MQTT seulement si pairing impossible
      console.warn("[PanelOnboarding] Pairing HTTP failed, fallback MQTT:", e?.message || e);
    }

    // Fallback MQTT (si tu veux le garder en secours)
    const effectiveMqttHost = getEffectiveMqttHost();
    if (!effectiveMqttHost) {
      setPanelConnecting(false);
      setPanelErrorMessage(
        "Impossible de déterminer l'adresse du serveur MQTT. Relance le scan PnP ou vérifie le réseau.",
      );
      setFlow("auto_error");
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
          throw new Error(String(error?.message || error));
        },
      );

      if (!result?.client) {
        throw new Error("Connexion MQTT impossible (client non initialisé).");
      }

      subscribeNeoliaConfigGlobal(result.client, applyHaConfigFromMqtt);
      sendPanelDiscoveryRequest(result.client, "auto");
      // on reste sur le loading : la suite = réception config via MQTT
    } catch (e: any) {
      setPanelConnecting(false);

      setFailCount((prev) => {
        const next = prev + 1;
        if (next >= 3) setFlow("manual");
        else setFlow("auto_error");
        return next;
      });

      setPanelErrorMessage(e?.message || "Erreur MQTT inconnue.");
    }
  }, [
    attemptPanelHttpPairingFirst,
    getEffectiveMqttHost,
    setMqttHost,
    setMqttPort,
    setMqttUseSecure,
    setMqttUsername,
    setMqttPassword,
    applyHaConfigFromMqtt,
  ]);

  // AUTO-CONNECT : seulement après SN step, et seulement quand on a un host déterminable.
  useEffect(() => {
    if (!isPanelMode()) return;
    if (!hasCompletedSnStep) return;
    if (shouldBypassPanelOnboarding) return;
    if (autoConnectStartedRef.current) return;

    setFlow("auto_loading");

    // On peut tenter même si pnpFoundUrl absent (IP saisie)
    const effectiveHa = (() => {
      try {
        return getEffectiveHaUrlForPairing();
      } catch {
        return null;
      }
    })();

    // Si on n'a vraiment rien, on laisse le scan continuer
    if (!effectiveHa && pnpState === "scanning") return;

    autoConnectStartedRef.current = true;

    setTimeout(() => {
      attemptPanelConnection();
    }, 50);
  }, [
    hasCompletedSnStep,
    shouldBypassPanelOnboarding,
    getEffectiveHaUrlForPairing,
    attemptPanelConnection,
    pnpState,
  ]);

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

    // 1) ÉCRAN DE CHARGEMENT (cache tout)
    if (flow === "auto_loading") {
      const subtitle =
        pnpState === "scanning"
          ? "Recherche de Home Assistant sur le réseau…"
          : pnpState === "found"
            ? `Home Assistant détecté (${pnpFoundUrl}). Appairage en cours…`
            : pnpState === "not_found"
              ? "Home Assistant non détecté. Tentative d’appairage via IP…"
              : panelConnecting
                ? "Connexion en cours…"
                : "Initialisation…";

      return (
        <NeoliaLoadingScreen
          title={panelSuccess ? "Ouverture d’Accueil…" : "Connexion automatique"}
          subtitle={subtitle}
        />
      );
    }

    // 2) ÉCRAN ERREUR (avec retry) — puis bascule manuel après 3 échecs
    if (flow === "auto_error") {
      const hintHa = pnpFoundUrl ? `HA détecté : ${pnpFoundUrl}` : "HA non détecté automatiquement";

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
          <div className="w-full max-w-2xl space-y-6">
            <div className="flex justify-center mb-2">
              <img src={neoliaLogoDark} alt="Neolia" className="h-12 dark:hidden" />
              <img src={neoliaLogo} alt="Neolia" className="h-12 hidden dark:block" />
            </div>

            <Card className="shadow-2xl border-2">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-3">
                  <WifiOff className="h-7 w-7 text-destructive" />
                  <CardTitle className="text-2xl">Connexion impossible</CardTitle>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  Le panneau n’a pas réussi à récupérer la configuration.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <Alert variant="destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base whitespace-pre-line">
                    {panelErrorMessage || "Erreur inconnue."}
                  </AlertDescription>
                </Alert>

                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="font-medium text-foreground">Vérifications à faire :</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Le panneau et Home Assistant sont bien sur le même réseau (même Wi-Fi / VLAN).</li>
                    <li>Dans HA : l’intégration neolia_pnp est chargée et /api/neolia/capabilities répond.</li>
                    <li>Le Configurator a bien poussé SN4 (pair_code) + panel_token.</li>
                    <li>{hintHa}</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg"
                    onClick={() => {
                      setFlow("auto_loading");
                      autoConnectStartedRef.current = false;
                      attemptPanelConnection();
                    }}
                  >
                    Réessayer (tentative {Math.min(failCount + 1, 3)}/3)
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-14"
                    onClick={async () => {
                      setFlow("auto_loading");
                      await runPnPScan();
                      autoConnectStartedRef.current = false;
                      attemptPanelConnection();
                    }}
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Relancer le scan PnP
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-14"
                    onClick={() => setFlow("manual")}
                  >
                    Connexion manuelle (IP + token admin)
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Après 3 échecs, la connexion manuelle est proposée automatiquement.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // 3) MODE MANUEL (IP + TOKEN ADMIN)
    const handleManualConnect = async () => {
      try {
        const host = (haBaseUrl || "").trim();
        const token = (adminToken || "").trim();

        if (!host) {
          setStatus("error");
          setErrorMessage("Adresse IP Home Assistant manquante.");
          return;
        }
        if (!token) {
          setStatus("error");
          setErrorMessage("Token admin Home Assistant manquant.");
          return;
        }

        const baseUrl = normalizeHaBaseUrl(host.includes(":") ? host : `${host}:8123`);

        setStatus("loading");
        setErrorMessage("");
        setStatusMessage("Test de connexion à Home Assistant…");

        const ok = await testHaConnection(baseUrl, token, 1800);
        if (!ok) {
          setStatus("error");
          setStatusMessage("");
          setErrorMessage(
            "Connexion refusée. Vérifie : IP/port 8123, token admin valide, et que le panneau est sur le même réseau.",
          );
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

        gotoHomeSoon(300);
      } catch (e: any) {
        setStatus("error");
        setStatusMessage("");
        setErrorMessage(e?.message || "Erreur inconnue.");
      }
    };

    const handleKeyPressManual = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && status !== "loading" && status !== "success") {
        handleManualConnect();
      }
    };

    const isInputDisabled = status === "loading" || status === "success";
    const isButtonDisabled = status === "loading" || status === "success";

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-2xl space-y-8">
          <div className="flex justify-center mb-6">
            <img src={neoliaLogoDark} alt="Neolia Logo Dark" className="h-14 dark:hidden" />
            <img src={neoliaLogo} alt="Neolia Logo" className="h-14 hidden dark:block" />
          </div>

          <Card className="shadow-2xl border-2">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <KeyRound className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl">Connexion manuelle</CardTitle>
              </div>
              <CardDescription className="text-lg leading-relaxed">
                Utilise l’IP locale de Home Assistant et un token admin. (Mode de secours.)
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <Server className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line">
                  IP détectée (si dispo) : {pnpFoundUrl || "—"}
                  {"\n"}
                  Conseil : crée un token dédié “Neolia Panel” dans Home Assistant.
                </AlertDescription>
              </Alert>

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
                  onKeyDown={handleKeyPressManual}
                />
                <p className="text-xs text-muted-foreground">
                  Port par défaut : 8123 (il est ajouté automatiquement si absent).
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="ha-admin-token" className="text-lg">
                  Token admin Home Assistant
                </Label>
                <Input
                  id="ha-admin-token"
                  type="password"
                  placeholder="Colle ici le Long-Lived Access Token"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  disabled={isInputDisabled}
                  className="text-lg h-14"
                  onKeyDown={handleKeyPressManual}
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

              <div className="flex flex-col gap-3">
                <Button onClick={handleManualConnect} disabled={isButtonDisabled} size="lg" className="w-full h-16 text-lg">
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
                    "Valider et connecter"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-14"
                  onClick={() => {
                    setStatus("idle");
                    setStatusMessage("");
                    setErrorMessage("");
                    setPanelErrorMessage("");
                    setFlow("auto_loading");
                    autoConnectStartedRef.current = false;

                    attemptPanelConnection();
                  }}
                >
                  Retour au Plug &amp; Play
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---------------- MODE MOBILE / TABLET (inchangé) ----------------
  const PANEL_CODE = "NEOLIA_DEFAULT_PANEL";

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

      if (!json || typeof json !== "object" || !(json as any).ha_url || !(json as any).token) {
        throw new Error("Réponse invalide ou incomplète reçue de Home Assistant.");
      }

      const ha_url: string = (json as any).ha_url;
      const token: string = (json as any).token;
      const remoteHaUrl: string | undefined = (json as any).remoteHaUrl?.trim() || undefined;

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
