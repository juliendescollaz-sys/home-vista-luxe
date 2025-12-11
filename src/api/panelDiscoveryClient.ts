// src/api/panelDiscoveryClient.ts

export interface PanelDiscoveryResult {
  haBaseUrl: string;
  haToken: string;
  mqttHost: string;
  mqttWsPort: number;
  mqttUsername: string;
  mqttPassword: string;
}

/**
 * URL de base du service de découverte Neolia.
 * Ex: http://neolia-config.local:5001
 *
 * En dev tu peux utiliser VITE_DEV_NEOLIA_CONFIGURATOR_HOST
 * et en prod une entrée DNS / mDNS.
 */
const DISCOVERY_BASE =
  import.meta.env.VITE_DEV_NEOLIA_CONFIGURATOR_HOST ||
  import.meta.env.VITE_NEOLIA_CONFIGURATOR_URL ||
  "";

/**
 * Résout la configuration d'un panneau à partir de son code Neolia (4 derniers chiffres du SN).
 */
export async function resolvePanelConfigByCode(
  neoliaCode: string
): Promise<PanelDiscoveryResult> {
  if (!DISCOVERY_BASE) {
    throw new Error(
      "Service de découverte Neolia non configuré (DISCOVERY_BASE vide)."
    );
  }

  const trimmed = neoliaCode.trim();
  if (!/^\d{4}$/.test(trimmed)) {
    throw new Error("Le code Neolia doit contenir 4 chiffres.");
  }

  const url = `${DISCOVERY_BASE.replace(/\/+$/, "")}/api/panels/resolve?code=${encodeURIComponent(
    trimmed
  )}`;

  const res = await fetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(
      `Service de découverte Neolia a répondu ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as Partial<PanelDiscoveryResult>;

  if (!data.mqttHost || !data.mqttWsPort) {
    throw new Error("Réponse discovery invalide: MQTT host/port manquant.");
  }

  if (!data.haBaseUrl || !data.haToken) {
    console.warn(
      "[PanelDiscovery] haBaseUrl/haToken absents – ils devront être fournis via neolia/config/global."
    );
  }

  return {
    haBaseUrl: String(data.haBaseUrl ?? ""),
    haToken: String(data.haToken ?? ""),
    mqttHost: String(data.mqttHost),
    mqttWsPort: Number(data.mqttWsPort),
    mqttUsername: String(data.mqttUsername ?? ""),
    mqttPassword: String(data.mqttPassword ?? ""),
  };
}

