// src/config/networkDefaults.ts
// Configuration réseau centralisée - Aucune IP codée en dur ici !

/**
 * Port par défaut de Home Assistant
 */
export const DEFAULT_HA_PORT = 8123;

/**
 * Port par défaut du broker MQTT (WebSocket)
 */
export const DEFAULT_MQTT_PORT = 1884;

/**
 * Port par défaut du serveur NeoliaConfigurator
 */
export const DEFAULT_CONFIGURATOR_PORT = 8765;

/**
 * Host Home Assistant pour le développement (depuis .env)
 * En PROD, cette variable sera vide → l'onboarding est obligatoire.
 */
export const DEV_DEFAULT_HA_HOST = import.meta.env.VITE_DEV_HA_HOST ?? "";

/**
 * Host MQTT pour le développement (depuis .env ou fallback sur HA host)
 */
export const DEV_DEFAULT_MQTT_HOST = import.meta.env.VITE_DEV_MQTT_HOST ?? DEV_DEFAULT_HA_HOST;

/**
 * URL cloud Home Assistant par défaut (Nabu Casa)
 * Cette URL est utilisée uniquement pour les modes Mobile/Tablet en dev.
 */
export const CLOUD_BASE_URL = "https://bl09dhclkeomkczlb0b7ktsssxmevmdq.ui.nabu.casa";

/**
 * Token partagé pour le développement.
 * En PROD, le token doit venir de l'onboarding.
 */
export const DEV_SHARED_TOKEN = import.meta.env.VITE_DEV_HA_TOKEN ?? "";

/**
 * Retourne l'URL Home Assistant initiale pour le développement.
 * En PROD (DEV_DEFAULT_HA_HOST vide), retourne une chaîne vide.
 */
export function getDevInitialHaUrl(): string {
  if (!DEV_DEFAULT_HA_HOST) return "";
  return `http://${DEV_DEFAULT_HA_HOST}:${DEFAULT_HA_PORT}`;
}

/**
 * Retourne l'URL du broker MQTT pour le développement.
 * En PROD (DEV_DEFAULT_MQTT_HOST vide), retourne une chaîne vide.
 */
export function getDevInitialMqttHost(): string {
  return DEV_DEFAULT_MQTT_HOST;
}

/**
 * Vérifie si la configuration réseau est disponible en dev.
 * Retourne true si au moins le host HA ou MQTT est configuré.
 */
export function hasDevNetworkConfig(): boolean {
  return Boolean(DEV_DEFAULT_HA_HOST || DEV_DEFAULT_MQTT_HOST);
}
