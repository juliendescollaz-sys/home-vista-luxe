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
import { isPanelMode } from "@/lib/platform";
import { NeoliaLoadingScreen } from "@/ui/panel/components/NeoliaLoadingScreen";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";
import { useNeoliaPanelConfigStore } from "@/store/useNeoliaPanelConfigStore";
import { PanelSnEntryStep } from "@/ui/panel/components/PanelSnEntryStep";

type OnboardingStatus = "idle" | "loading" | "success" | "error";
type PanelFlow = "auto_loading" | "auto_error" | "manual";

/**
 * PANEL — OPTION A (robuste, sans MQTT) :
 * 1) Discover HA (LAN)
 * 2) POST /api/neolia/pair avec code SN4
 * 3) HA renvoie { ha_url, token } => on persiste et on redirige
 *
 * UX FIX:
 * - Tant que le scan est en cours => JAMAIS d'écran erreur (évite le flash "Erreur inconnue")
 * - Erreur uniquement si scan finit en not_found ou si /pair répond en erreur.
 */

function normalizeHaBaseUrl(raw: string): string {
  let url = (raw || "").trim();
  if (!url) throw new Error("URL Home Assistant vide");
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, "");
}

function normalizeHostToBaseUrl(hostOrBase: string): string {
  const raw = (hostOrBase || "").trim();
  if (!raw) throw new Error("Adresse Home Assistant vide");
  const withPort = raw.includes(":") ? raw : `${raw}:8123`;
  return normalizeHaBaseUrl(withPort);
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

async function postJson(url: string, body: any, timeoutMs = 2500): Promise<{ ok: boolean; status: number; json?: any }> {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let json: any = undefined;
    try {
      json = await resp.json();
    } catch {
      // ignore
    }

    return { ok: resp.ok, status: resp.status, json };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    window.clearTimeout(t);
  }
}

function buildPairErrorMessage(status: number, payload?: any): string {
  const code = payload?.error;

  if (status === 0) return "Impossible de joindre Home Assistant (réseau/port 8123).";
  if (status === 403) return "Accès refusé (le panel doit être sur le LAN privé).";
  if (status === 401 && code === "mismatch") return "Code SN incorrect (mismatch).";
  if (status === 409 && code === "pair_code_not_set")
    return "Home Assistant n’a pas de SN4 enregistré (pair_code_not_set).";
  if (status === 409 && code === "panel_token_not_set")
    return "Home Assistant n’a pas de token panel enregistré (panel_token_not_set).";
  if (status === 404) return "Endpoint neolia_pnp introuvable (404). L’intégration neolia_pnp n’est pas chargée.";
  if (status >= 500) return "Erreur interne Home Assistant (500+).";

  return `Erreur Home Assistant ${status}${code ? ` (${code})` : ""}.`;
}

export function PanelOnboarding() {
  const { hasCompletedSnStep, enteredNeoliaCode } = useNeoliaPanelConfigStore();

  const [haBaseUrl, setHaBaseUrl] = useState("");
  const [adminToken, setAdminToken] = useState("");

  const [status, setStatus] = useState<OnboardingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const setConnection = useHAStore((state) => state.setConnection);

  const [shouldBypassPanelOnboarding, setShouldBypassPanelOnboarding] = useState(false);

  // PnP
  const [pnpState, setPnpState] = useState<"idle" | "scanning" | "found" | "not_found">("idle");
  const [pnpFoundUrl, setPnpFoundUrl] = useState<string | null>(null);

  // Flow UX
  const [flow, setFlow] = useState<PanelFlow>("auto_loading");
  const [failCount, setFailCount] = useState(0);

  const pairingInFlightRef = useRef(false);
  const globalTimeoutRef = useRef<number | null>(null);

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
    } else {
      setPnpState("not_found");
    }
  }, [hasCompletedSnStep]);

  // Lancer scan après SN step
  useEffect(() => {
    if (!isPanelMode()) return;
    if (!hasCompletedSnStep) return;
    if (shouldBypassPanelOnboarding) return;

    setFlow("auto_loading");
    setErrorMessage("");
    setFailCount(0);

    runPnPScan();

    // Timeout global UX (au bout de 20s sans succès => erreur)
    if (globalTimeoutRef.current) window.clearTimeout(globalTimeoutRef.current);
    globalTimeoutRef.current = window.setTimeout(() => {
      if (!pairingInFlightRef.current) {
        setErrorMessage("Aucun Home Assistant détecté automatiquement (timeout).");
        setFlow("auto_error");
      }
    }, 20000);

    return () => {
      if (globalTimeoutRef.current) window.clearTimeout(globalTimeoutRef.current);
      globalTimeoutRef.current = null;
    };
  }, [hasCompletedSnStep, shouldBypassPanelOnboarding, runPnPScan]);

  const attemptPairNow = useCallback(async () => {
    if (!isPanelMode()) return;
    if (!hasCompletedSnStep) return;
    if (pairingInFlightRef.current) return;

    const code = (enteredNeoliaCode || "").trim();
    if (!code || code.length !== 4) {
      setFlow("manual");
      return;
    }

    if (!pnpFoundUrl) return; // on pair seulement quand HA est trouvé

    pairingInFlightRef.current = true;
    setFlow("auto_loading");
    setErrorMessage("");

    const base = normalizeHaBaseUrl(pnpFoundUrl);
    const pairUrl = `${base}/api/neolia/pair`;

    const res = await postJson(pairUrl, { code, panel_id: "panel" }, 2500);

    if (!res.ok) {
      pairingInFlightRef.current = false;

      const msg = buildPairErrorMessage(res.status, res.json);
      setErrorMessage(msg);

      setFailCount((prev) => {
        const next = prev + 1;
        if (next >= 3) setFlow("manual");
        else setFlow("auto_error");
        return next;
      });

      return;
    }

    const ha_url = res.json?.ha_url;
    const token = res.json?.token;

    if (!ha_url || !token) {
      pairingInFlightRef.current = false;
      setErrorMessage("Réponse invalide de Home Assistant (ha_url/token manquants).");
      setFlow("auto_error");
      return;
    }

    try {
      await setHaConfig({ localHaUrl: ha_url, token });
    } catch {
      // ignore
    }

    setConnection({ url: ha_url, token, connected: false });

    try {
      window.localStorage.setItem("neolia_panel_onboarding_completed", "1");
    } catch {
      // ignore
    }

    gotoHomeSoon(250);
  }, [enteredNeoliaCode, hasCompletedSnStep, pnpFoundUrl, setConnection]);

  // Déclenche le pairing uniquement quand le scan a trouvé HA
  useEffect(() => {
    if (!isPanelMode()) return;
    if (!hasCompletedSnStep) return;
    if (shouldBypassPanelOnboarding) return;

    if (pnpState === "found") {
      attemptPairNow();
      return;
    }

    // Important: si scan finit en not_found => on affiche l’erreur (pas avant)
    if (pnpState === "not_found") {
      setErrorMessage("Home Assistant non détecté automatiquement sur le réseau.");
      setFlow("auto_error");
    }
  }, [pnpState, hasCompletedSnStep, shouldBypassPanelOnboarding, attemptPairNow]);

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

    // Loading (zéro flash erreur tant que scan en cours)
    if (flow === "auto_loading") {
      const subtitle =
        pnpState === "scanning"
          ? "Recherche de Home Assistant sur le réseau…"
          : pnpState === "found"
            ? `Home Assistant détecté (${pnpFoundUrl}). Appairage en cours…`
            : pnpState === "not_found"
              ? "Home Assistant non détecté. Vérification réseau…"
              : "Initialisation…";

      return <NeoliaLoadingScreen title="Connexion automatique" subtitle={subtitle} />;
    }

    // Erreur
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
                  Le panneau n’a pas réussi à récupérer la configuration depuis Home Assistant.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <Alert variant="destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base whitespace-pre-line">
                    {errorMessage || "Erreur inconnue."}
                  </AlertDescription>
                </Alert>

                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="font-medium text-foreground">Vérifications à faire :</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Le panneau et Home Assistant sont sur le même réseau (même Wi-Fi / VLAN).</li>
                    <li>
                      Dans HA : l’intégration <b>neolia_pnp</b> est chargée et <b>/api/neolia/capabilities</b> répond.
                    </li>
                    <li>Le Configurator a bien poussé <b>SN4</b> (pair_code) + <b>panel_token</b>.</li>
                    <li>{hintHa}</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg"
                    onClick={async () => {
                      setFlow("auto_loading");
                      setErrorMessage("");
                      setFailCount(0);
                      await runPnPScan();
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
                      setErrorMessage("");
                      await runPnPScan();
                    }}
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Relancer le scan PnP
                  </Button>

                  <Button variant="outline" size="lg" className="w-full h-14" onClick={() => setFlow("manual")}>
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

    // Mode manuel secours
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

        const baseUrl = normalizeHostToBaseUrl(host);

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

        await setHaConfig({ localHaUrl: baseUrl, token });

        setConnection({ url: baseUrl, token, connected: false });

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
                  placeholder="ex: 192.168.1.85"
                  value={haBaseUrl}
                  onChange={(e) => setHaBaseUrl(e.target.value)}
                  disabled={isInputDisabled}
                  className="text-lg h-14"
                  onKeyDown={handleKeyPressManual}
                />
                <p className="text-xs text-muted-foreground">Port par défaut : 8123 (ajouté automatiquement si absent).</p>
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
                <Button
                  onClick={handleManualConnect}
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
                    setFlow("auto_loading");
                    runPnPScan();
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

  // Mobile/Tablet: inchangé
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="max-w-xl w-full">
        <Alert>
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>
            Ce fichier est focalisé sur le <b>mode PANEL</b> (Option A).
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
