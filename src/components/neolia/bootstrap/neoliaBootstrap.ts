// src/components/neolia/bootstrap/neoliaBootstrap.ts

import type {
  NeoliaGlobalConfig,
  NeoliaHaConnection,
} from "./neoliaConfigTypes";

/**
 * Valide et typise légèrement un payload brut supposé provenir
 * du topic MQTT `neolia/config/global`.
 *
 * - Accepte soit un objet déjà parsé, soit une string JSON.
 * - Vérifie que service === "neolia-config"
 * - Vérifie la présence de network et home_structure
 */
export function parseNeoliaConfig(payload: unknown): NeoliaGlobalConfig | null {
  let obj: any = payload;

  // Si on reçoit une string JSON, on la parse
  if (typeof payload === "string") {
    try {
      obj = JSON.parse(payload);
    } catch (e) {
      console.error("[NeoliaBootstrap] Impossible de parser le payload JSON (string):", e);
      return null;
    }
  }

  if (!obj || typeof obj !== "object") {
    console.error("[NeoliaBootstrap] Payload invalide (pas un objet):", obj);
    return null;
  }

  if (obj.service !== "neolia-config") {
    console.error(
      "[NeoliaBootstrap] service inattendu dans le payload:",
      obj.service
    );
    return null;
  }

  if (!obj.network || !obj.home_structure) {
    console.error(
      "[NeoliaBootstrap] network ou home_structure manquant dans le payload"
    );
    return null;
  }

  return obj as NeoliaGlobalConfig;
}

/**
 * Extrait les informations nécessaires pour se connecter à Home Assistant :
 * - baseUrl (home_structure.ha.url)
 * - token   (home_structure.ha.token)
 * - mqttHost / mqttPort depuis network
 *
 * Retourne null si quelque chose d'essentiel manque.
 */
export function extractHaConnection(
  config: NeoliaGlobalConfig | null
): NeoliaHaConnection | null {
  if (!config) {
    console.error("[NeoliaBootstrap] extractHaConnection appelé avec config null");
    return null;
  }

  const ha = config.home_structure?.ha;
  if (!ha?.url || !ha?.token) {
    console.error(
      "[NeoliaBootstrap] home_structure.ha.url ou token manquant dans la config"
    );
    return null;
  }

  if (
    !config.network ||
    !config.network.mqtt_host ||
    typeof config.network.mqtt_port !== "number"
  ) {
    console.error(
      "[NeoliaBootstrap] network.mqtt_host ou mqtt_port manquant dans la config"
    );
    return null;
  }

  return {
    baseUrl: ha.url,
    token: ha.token,
    mqttHost: config.network.mqtt_host,
    mqttPort: config.network.mqtt_port,
  };
}
