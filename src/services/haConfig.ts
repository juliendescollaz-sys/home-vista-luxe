/**
 * Service centralisé pour la gestion de la configuration Home Assistant
 * Utilisé pour vérifier, récupérer et enregistrer l'URL HA et le token
 */

import { storeHACredentials, getHACredentials } from "@/lib/crypto";

export interface HAConfig {
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
 */
export async function getHaConfig(): Promise<HAConfig | null> {
  try {
    const credentials = await getHACredentials();
    if (credentials?.baseUrl && credentials?.token) {
      return {
        url: credentials.baseUrl,
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
 */
export async function setHaConfig(config: HAConfig): Promise<void> {
  try {
    await storeHACredentials(config.url, config.token);
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la config HA:", error);
    throw error;
  }
}

/**
 * Récupère la configuration depuis NeoliaServer (mode PANEL uniquement)
 * @param installerIp - L'adresse IP du PC de l'installateur
 * @returns La configuration HA { ha_url, token }
 */
export async function fetchConfigFromNeoliaServer(
  installerIp: string
): Promise<{ ha_url: string; token: string }> {
  const url = `http://${installerIp}:8765/config`;

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(4000), // timeout 4s
  });

  if (!response.ok) {
    throw new Error(
      `Erreur HTTP ${response.status}: ${response.statusText}`
    );
  }

  const json = await response.json();

  // Validation du JSON
  if (
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
}

/**
 * Teste la connexion à Home Assistant avec l'URL et le token fournis
 * @returns true si la connexion réussit, false sinon
 */
export async function testHaConnection(config: HAConfig): Promise<boolean> {
  try {
    // Construire l'URL de test (endpoint /api/config)
    const testUrl = `${config.url}/api/config`;

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000), // timeout 5s
    });

    return response.ok;
  } catch (error) {
    console.error("Erreur lors du test de connexion HA:", error);
    return false;
  }
}
