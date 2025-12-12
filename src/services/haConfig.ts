/**
 * Service centralisé pour la gestion de la configuration Home Assistant
 * Utilisé pour vérifier, récupérer et enregistrer l'URL HA et le token
 *
 * Étape 1 (PnP clean) :
 * - Ajout d'une découverte HA autonome (sans MQTT) : discoverHA()
 * - Tests réseau fiables en natif via CapacitorHttp (bypass CORS/WebView)
 */

import { storeHACredentials, getHACredentials } from "@/lib/crypto";
import { Capacitor, CapacitorHttp, HttpOptions } from "@capacitor/core";

export interface HAConfig {
  localHaUrl: string; // OBLIGATOIRE - URL locale (LAN)
  remoteHaUrl?: string; // OPTIONNEL - URL cloud (Nabu Casa)
  token: string; // OBLIGATOIRE
}

// Pour compatibilité ascendante
export interface HAConfigLegacy {
  url: string;
  token: string;
}

/**
 * Détecte si on tourne en mode natif (Android / iOS)
 */
function isNativePlatform(): boolean {
  try {
    const direct = (Capacitor as any).isNativePlatform?.();
    if (typeof direct === "boolean") return direct;
  } catch {
    // ignore
  }

  try {
    const platform = Capacitor.getPlatform?.();
    return platform === "android" || platform === "ios";
  } catch {
    return false;
  }
}

/**
 * Normalise une URL (trim + supprime trailing slash)
 */
function normalizeBaseUrl(url: string): string {
  return (url || "").trim().replace(/\/+$/, "");
}

/**
 * Petit helper "sleep" pour laisser respirer le runtime si besoin
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Effectue une requête HTTP GET en mode natif (CapacitorHttp) si possible,
 * sinon en fetch (web).
 */
async function httpGet(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs: number = 1200,
): Promise<{ status: number; data?: any; ok: boolean }> {
  const native = isNativePlatform();

  if (native) {
    const options: HttpOptions = {
      url,
      method: "GET",
      headers,
      connectTimeout: timeoutMs,
      readTimeout: timeoutMs,
    };

    try {
      const resp = await CapacitorHttp.get(options);
      const status = (resp as any).status ?? 0;
      const data = (resp as any).data;
      return { status, data, ok: status >= 200 && status < 300 };
    } catch {
      return { status: 0, ok: false };
    }
  }

  // Web : fetch + AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    let data: any = undefined;
    try {
      data = await resp.json();
    } catch {
      // ignore
    }
    return { status: resp.status, data, ok: resp.ok };
  } catch {
    return { status: 0, ok: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Probe Home Assistant sans token :
 * - HA répond généralement /api/ avec 401 + JSON
 * - On considère "trouvé" si status 401 ou 200
 */
async function probeHomeAssistantBaseUrl(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) return false;

  const probeUrl = `${base}/api/`;
  const res = await httpGet(
    probeUrl,
    {
      Accept: "application/json",
    },
    timeoutMs,
  );

  // 401 = HA trouvé mais auth requise (normal)
  if (res.status === 401 || res.status === 200) return true;
  return false;
}

/**
 * Génère des candidats d'URL HA "probables"
 */
function buildCandidateBaseUrls(): string[] {
  const candidates: string[] = [];

  // Hostnames mDNS fréquents
  candidates.push("http://homeassistant.local:8123");
  candidates.push("http://hass.local:8123");

  // Quelques IP "classiques" (on évite de trop charger, le scan fera le reste)
  candidates.push("http://192.168.1.2:8123");
  candidates.push("http://192.168.1.3:8123");
  candidates.push("http://192.168.1.10:8123");
  candidates.push("http://192.168.1.80:8123");
  candidates.push("http://192.168.0.10:8123");
  candidates.push("http://10.0.0.10:8123");

  return candidates;
}

/**
 * Scan rapide d'un /24 (ex: 192.168.1.*) sur le port HA 8123
 * - concurrence limitée pour ne pas tuer la WebView/Android
 * - timeout court
 */
async function scanSubnetForHA(
  subnetPrefix: string, // ex "192.168.1"
  timeoutMs: number,
  concurrency: number,
): Promise<string | null> {
  const ips: string[] = [];
  for (let i = 1; i <= 254; i++) {
    ips.push(`${subnetPrefix}.${i}`);
  }

  let found: string | null = null;
  let index = 0;

  const worker = async () => {
    while (!found && index < ips.length) {
      const ip = ips[index++];
      const baseUrl = `http://${ip}:8123`;

      const ok = await probeHomeAssistantBaseUrl(baseUrl, timeoutMs);
      if (ok) {
        found = baseUrl;
        return;
      }

      // petite pause micro pour éviter de saturer
      await sleep(5);
    }
  };

  const workers: Promise<void>[] = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return found;
}

/**
 * Découverte Plug & Play de Home Assistant (sans MQTT)
 * Stratégie:
 * 1) Réutilise ce qui existe (credentials + ha_config_v2)
 * 2) Teste quelques hostnames/candidats
 * 3) Scan de subnets privés usuels (limité)
 *
 * Retourne une URL base HA (ex: http://192.168.1.80:8123) ou null
 */
export async function discoverHA(options?: {
  timeoutMs?: number; // timeout par probe
  concurrency?: number; // scan concurrency
  scanSubnets?: string[]; // préfixes /24 (sans le dernier octet)
  verbose?: boolean;
}): Promise<string | null> {
  const timeoutMs = options?.timeoutMs ?? 550;
  const concurrency = options?.concurrency ?? 18;
  const verbose = !!options?.verbose;

  const log = (...args: any[]) => {
    if (verbose) console.log("[PnP][discoverHA]", ...args);
  };

  // 1) Priorité: config déjà connue
  try {
    const cfg = await getHaConfig();
    if (cfg?.localHaUrl) {
      log("Test URL sauvegardée:", cfg.localHaUrl);
      if (await probeHomeAssistantBaseUrl(cfg.localHaUrl, timeoutMs)) return normalizeBaseUrl(cfg.localHaUrl);
    }
  } catch {
    // ignore
  }

  try {
    const creds = await getHACredentials();
    if (creds?.baseUrl) {
      log("Test baseUrl credentials:", creds.baseUrl);
      if (await probeHomeAssistantBaseUrl(creds.baseUrl, timeoutMs)) return normalizeBaseUrl(creds.baseUrl);
    }
  } catch {
    // ignore
  }

  // 2) Candidats "probables"
  const candidates = buildCandidateBaseUrls();
  for (const c of candidates) {
    log("Probe candidat:", c);
    if (await probeHomeAssistantBaseUrl(c, timeoutMs)) return normalizeBaseUrl(c);
  }

  // 3) Scan /24 : on scanne quelques subnets standards
  const subnets = options?.scanSubnets ?? ["192.168.1", "192.168.0", "10.0.0", "172.16.0"];

  for (const prefix of subnets) {
    log("Scan subnet:", prefix);
    const found = await scanSubnetForHA(prefix, timeoutMs, concurrency);
    if (found) {
      log("HA trouvé:", found);
      return normalizeBaseUrl(found);
    }
  }

  log("Aucun HA trouvé");
  return null;
}

/**
 * Vérifie si une configuration HA existe déjà
 */
export async function hasHaConfig(): Promise<boolean> {
  try {
    const credentials = await getHACredentials();
    return !!(credentials?.baseUrl && credentials?.token);
  } catch (error) {
    console.error("Erreur lors de la vérification de la config HA:", error);
    return false;
  }
}

/**
 * Récupère la configuration HA existante
 * Gère à la fois le nouveau format (local + remote) et l'ancien format (url unique)
 */
export async function getHaConfig(): Promise<HAConfig | null> {
  try {
    const credentials = await getHACredentials();
    if (!credentials?.token) {
      return null;
    }

    // Nouveau format : localHaUrl (obligatoire) et/ou remoteHaUrl (optionnel)
    const configStr = localStorage.getItem("ha_config_v2");
    if (configStr) {
      try {
        const config = JSON.parse(configStr) as { localHaUrl?: string; remoteHaUrl?: string };
        if (config.localHaUrl) {
          return {
            localHaUrl: normalizeBaseUrl(config.localHaUrl),
            remoteHaUrl: config.remoteHaUrl ? normalizeBaseUrl(config.remoteHaUrl) : undefined,
            token: credentials.token,
          };
        }
      } catch {
        // ignore
      }
    }

    // Ancien format : baseUrl unique (compatibilité ascendante)
    if (credentials.baseUrl) {
      return {
        localHaUrl: normalizeBaseUrl(credentials.baseUrl),
        remoteHaUrl: undefined,
        token: credentials.token,
      };
    }

    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération de la config HA:", error);
    return null;
  }
}

/**
 * Enregistre la configuration HA (URL + token)
 * Supporte à la fois le nouveau format (local + remote) et l'ancien format (url unique)
 */
export async function setHaConfig(config: HAConfig | HAConfigLegacy): Promise<void> {
  try {
    // Si c'est l'ancien format (url unique)
    if ("url" in config) {
      const url = normalizeBaseUrl(config.url);
      await storeHACredentials(url, config.token);
      localStorage.setItem(
        "ha_config_v2",
        JSON.stringify({
          localHaUrl: url,
          remoteHaUrl: undefined,
        }),
      );
      return;
    }

    // Nouveau format : localHaUrl est obligatoire
    const localHaUrl = normalizeBaseUrl(config.localHaUrl);
    const remoteHaUrl = config.remoteHaUrl ? normalizeBaseUrl(config.remoteHaUrl) : undefined;
    const token = config.token;

    if (!localHaUrl) {
      throw new Error("L'URL locale est obligatoire");
    }

    await storeHACredentials(localHaUrl, token);

    localStorage.setItem(
      "ha_config_v2",
      JSON.stringify({
        localHaUrl,
        remoteHaUrl: remoteHaUrl || undefined,
      }),
    );
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la config HA:", error);
    throw error;
  }
}

/**
 * Récupère la configuration depuis NeoliaServer (mode PANEL uniquement)
 * @param installerIpOrHost - L'adresse IP (ou IP:port) du PC de l'installateur
 * @returns La configuration HA { ha_url, token }
 */
export async function fetchConfigFromNeoliaServer(
  installerIpOrHost: string,
): Promise<{ ha_url: string; token: string }> {
  const raw = (installerIpOrHost || "").trim();
  if (!raw) {
    throw new Error("Adresse du poste d'installation vide");
  }

  let hostPart = raw;
  let port = 8765;

  if (hostPart.startsWith("http://")) {
    hostPart = hostPart.substring("http://".length);
  } else if (hostPart.startsWith("https://")) {
    hostPart = hostPart.substring("https://".length);
  }

  const colonIndex = hostPart.lastIndexOf(":");
  if (colonIndex > -1) {
    const hostCandidate = hostPart.substring(0, colonIndex).trim();
    const portCandidate = hostPart.substring(colonIndex + 1).trim();

    if (hostCandidate) {
      hostPart = hostCandidate;
    }

    const parsedPort = parseInt(portCandidate, 10);
    if (!Number.isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
      port = parsedPort;
    }
  }

  const url = `http://${hostPart}:${port}/config`;
  console.log("[NeoliaServer] fetchConfigFromNeoliaServer URL =", url);

  const isNative = isNativePlatform();

  const timeoutMs = 4000;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    if (isNative) {
      console.log("[NeoliaServer] Utilisation de CapacitorHttp (mode natif)");

      const options: HttpOptions = {
        url,
        method: "GET",
        headers: { Accept: "application/json" },
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      };

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error("TIMEOUT: NeoliaServer ne répond pas dans les 4 secondes"));
        }, timeoutMs);
      });

      const httpPromise = CapacitorHttp.get(options);
      const response = await Promise.race([httpPromise, timeoutPromise]);

      const status = (response as any).status ?? 0;
      const data = (response as any).data;

      console.log("[NeoliaServer] Réponse native reçue:", status);

      if (status < 200 || status >= 300) {
        throw new Error(`Erreur HTTP ${status} (CapacitorHttp)`);
      }

      const json = typeof data === "string" ? JSON.parse(data) : data;

      console.log("[NeoliaServer] JSON reçu (natif):", {
        ha_url: json?.ha_url ? "***" : undefined,
        token: json?.token ? "***" : undefined,
      });

      if (
        !json ||
        typeof json !== "object" ||
        typeof json.ha_url !== "string" ||
        !json.ha_url ||
        typeof json.token !== "string" ||
        !json.token
      ) {
        throw new Error("Configuration invalide reçue de NeoliaServer");
      }

      return { ha_url: json.ha_url, token: json.token };
    } else {
      console.log("[NeoliaServer] Utilisation de fetch (mode web)");

      const controller = new AbortController();
      timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      console.log("[NeoliaServer] Tentative de connexion vers:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      console.log("[NeoliaServer] Réponse reçue:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      console.log("[NeoliaServer] JSON reçu:", {
        ha_url: json?.ha_url ? "***" : undefined,
        token: json?.token ? "***" : undefined,
      });

      if (
        !json ||
        typeof json !== "object" ||
        typeof json.ha_url !== "string" ||
        !json.ha_url ||
        typeof json.token !== "string" ||
        !json.token
      ) {
        throw new Error("Configuration invalide reçue de NeoliaServer");
      }

      return { ha_url: json.ha_url, token: json.token };
    }
  } catch (error: any) {
    console.error("[NeoliaServer] fetchConfigFromNeoliaServer failed", {
      url,
      isNative,
      errorName: error?.name,
      errorMessage: error?.message,
      errorType: typeof error,
      error,
    });

    if (error.message?.includes("TIMEOUT")) {
      const timeoutError = new Error(error.message);
      (timeoutError as any).type = "timeout";
      (timeoutError as any).originalError = error;
      throw timeoutError;
    }

    if (!isNative && error.name === "AbortError") {
      const timeoutError = new Error("TIMEOUT: NeoliaServer ne répond pas dans les 4 secondes");
      (timeoutError as any).type = "timeout";
      (timeoutError as any).originalError = error;
      throw timeoutError;
    }

    if (!isNative && error.name === "TypeError" && error.message.includes("fetch")) {
      const networkError = new Error(
        "NETWORK: Impossible de contacter NeoliaServer. Causes possibles: serveur non démarré, mauvaise IP, CORS, ou cleartext HTTP bloqué.",
      );
      (networkError as any).type = "network";
      (networkError as any).originalError = error;
      throw networkError;
    }

    if (isNative && !(error as any).type) {
      (error as any).type = "network";
    }

    throw error;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

/**
 * Teste la connexion à Home Assistant avec une URL et un token
 * IMPORTANT: en natif, on utilise CapacitorHttp (fiable, pas de CORS)
 */
export async function testHaConnection(url: string, token: string, timeoutMs: number = 1200): Promise<boolean> {
  const base = normalizeBaseUrl(url);
  if (!base || !token) return false;

  const testUrl = `${base}/api/config`;

  const res = await httpGet(
    testUrl,
    {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeoutMs,
  );

  if (!(res.status >= 200 && res.status < 300)) return false;

  // Valide légèrement la structure attendue
  try {
    const data = res.data;
    if (!data || typeof data !== "object") return false;
    return true;
  } catch {
    return false;
  }
}
