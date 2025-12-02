// src/components/neolia/bootstrap/neoliaBootstrap.ts

import type {
  NeoliaGlobalConfig,
  NeoliaHaConnection,
} from "./neoliaConfigTypes";

/**
 * Valide et typise légèrement un payload brut supposé provenir
 * du topic MQTT `neolia/config/global`.
 *
 * - Vérifie que service === "neolia-config"
 * - Vérifie la présence de network et home_structure
 * - Ne fait PAS de validation exhaustive, on veut rester léger.
 */
export function parseNeoliaConfig(payload: unknown): NeoliaGlobalConfig | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const obj = payload as any;

  if (obj.service !== "neolia-config") {
    return null;
  }

  if (!obj.network || !obj.home_structure) {
    return null;
  }

  return obj as NeoliaGlobalConfig;
}

/**
 * Extrait les informations nécessaires pour se connecter à Home Assistant :
 * - baseUrl (ha.url dans home_structure.ha)
 * - token
 * - mqttHost / mqttPort depuis network
 *
 * Retourne null si quelque chose d'essentiel manque.
 */
export function extractHaConnection(
  config: NeoliaGlobalConfig | null
): NeoliaHaConnection | null {
  if (!config) return null;

  const ha = config.home_structure?.ha;
  if (!ha?.url || !ha?.token) return null;

  return {
    baseUrl: ha.url,
    token: ha.token,
    mqttHost: config.network.mqtt_host,
    mqttPort: config.network.mqtt_port,
  };
}
