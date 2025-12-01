/**
 * Service centralisé pour la gestion de la configuration Home Assistant
 * Utilisé pour vérifier, récupérer et enregistrer l'URL HA et le token
 */

import { storeHACredentials, getHACredentials } from "@/lib/crypto";

export interface HAConfig {
  localHaUrl: string;      // OBLIGATOIRE - URL locale (LAN)
  remoteHaUrl?: string;    // OPTIONNEL - URL cloud (Nabu Casa)
  token: string;           // OBLIGATOIRE
}

// Pour compatibilité ascendante
export interface HAConfigLegacy {
  url: string;
  token: string;
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
        // localHaUrl est obligatoire dans le nouveau format
        if (config.localHaUrl) {
          return { 
            localHaUrl: config.localHaUrl,
            remoteHaUrl: config.remoteHaUrl,
            token: credentials.token 
          };
        }
      } catch {
        // Format invalide, continuer avec l'ancien format
      }
    }

    // Ancien format : baseUrl unique (compatibilité ascendante)
    // On le traite comme localHaUrl, peu importe si c'est nabu.casa ou local
    if (credentials.baseUrl) {
      return {
        localHaUrl: credentials.baseUrl,
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
      await storeHACredentials(config.url, config.token);
      // Le traiter comme localHaUrl pour compatibilité
      localStorage.setItem(
        "ha_config_v2",
        JSON.stringify({
          localHaUrl: config.url,
          remoteHaUrl: undefined,
        })
      );
      return;
    }

    // Nouveau format : localHaUrl est obligatoire
    const { localHaUrl, remoteHaUrl, token } = config;

    if (!localHaUrl) {
      throw new Error("L'URL locale est obligatoire");
    }

    // Stocker le token avec localHaUrl comme baseUrl
    await storeHACredentials(localHaUrl, token);

    // Stocker la config complète séparément pour la nouvelle logique
    localStorage.setItem(
      "ha_config_v2",
      JSON.stringify({
        localHaUrl,
        remoteHaUrl: remoteHaUrl || undefined,
      })
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
  installerIpOrHost: string
): Promise<{ ha_url: string; token: string }> {
  const raw = (installerIpOrHost || "").trim();
  if (!raw) {
    throw new Error("Adresse du poste d'installation vide");
  }

  // On accepte :
  // - "192.168.1.34"
  // - "192.168.1.34:8765"
  // - "http://192.168.1.34:8765"
  // - "https://192.168.1.34:8765"
  let hostPart = raw;
  let port = 8765;

  // Retirer un éventuel schéma
  if (hostPart.startsWith("http://")) {
    hostPart = hostPart.substring("http://".length);
  } else if (hostPart.startsWith("https://")) {
    hostPart = hostPart.substring("https://".length);
  }

  // Si un port est présent, le récupérer
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 4000); // timeout 4s

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

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

    return {
      ha_url: json.ha_url,
      token: json.token,
    };
  } catch (error: any) {
    console.error("[NeoliaServer] Erreur lors du fetch de la config :", error);
    // On propage l'erreur pour que PanelOnboarding puisse l'interpréter
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Teste la connexion à Home Assistant avec une URL et un token
 * @param url - L'URL à tester
 * @param token - Le token d'authentification
 * @param timeoutMs - Timeout en millisecondes (défaut: 3000ms)
 * @returns true si la connexion réussit, false sinon
 */
export async function testHaConnection(
  url: string,
  token: string,
  timeoutMs: number = 3000
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const testUrl = `${url.replace(/\/+$/, "")}/api/config`;

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    // Tenter de parser JSON pour valider la réponse
    await response.json();
    return true;
  } catch {
    // Toute erreur (CORS, mixed content, timeout, réseau, JSON invalide, etc.) = connexion échouée
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
