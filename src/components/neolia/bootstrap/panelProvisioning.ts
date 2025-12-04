// src/components/neolia/bootstrap/panelProvisioning.ts

import mqtt, { MqttClient } from "mqtt";
import type { NeoliaGlobalConfig } from "./neoliaConfigTypes";
import { setHaConfig } from "@/services/haConfig";
import { useHAStore } from "@/store/useHAStore";
import { useNeoliaSettings } from "@/store/useNeoliaSettings";

export const DEFAULT_PANEL_CODE = "NEOLIA_DEFAULT_PANEL";

export interface PanelProvisioningParams {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  useSecure?: boolean;
  timeoutMs?: number;
  panelCode: string;
}

export interface PanelConfig {
  haBaseUrl: string;
  haToken: string;
  remoteHaUrl?: string;
  mqttHost?: string;
  mqttPort?: number;
  panelLayout?: string;
  raw: NeoliaGlobalConfig;
}

const DEFAULT_MQTT_PORT = 1884;
const DEFAULT_MQTT_USERNAME = "panel";
const DEFAULT_MQTT_PASSWORD = "PanelMQTT!2025";
const DEFAULT_TIMEOUT_MS = 15000;
const FALLBACK_PORTS = [1884, 9001];

// Deux possibilités de topics : global ou par panneau
const CONFIG_TOPIC_GLOBAL = "neolia/config/global";
const CONFIG_TOPIC_PREFIX = "neolia/panel";

/**
 * Tente une connexion MQTT sur un port donné avec timeout.
 */
function tryConnectMqttPort(
  url: string,
  username?: string,
  password?: string,
  timeoutMs: number = 5000,
): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    console.log("[PanelProvisioning] Tentative connexion MQTT:", url);

    const client = mqtt.connect(url, {
      username,
      password,
      reconnectPeriod: 0,
      connectTimeout: timeoutMs,
      protocol: "ws",
    });

    const timeout = setTimeout(() => {
      console.warn("[PanelProvisioning] Timeout de connexion:", url);
      try {
        client.end(true);
      } catch {
        // ignore
      }
      reject(new Error(`Timeout de connexion MQTT sur ${url}`));
    }, timeoutMs);

    client.on("connect", () => {
      clearTimeout(timeout);
      console.log("[PanelProvisioning] Connecté via", url);
      resolve(client);
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.warn("[PanelProvisioning] Erreur connexion", url, err?.message);
      try {
        client.end(true);
      } catch {
        // ignore
      }
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

/**
 * Attend la réception d'un message de configuration
 * soit sur neolia/config/global, soit sur neolia/panel/<panelCode>/config.
 */
function waitForConfigMessage(
  client: MqttClient,
  panelCode: string,
  timeoutMs: number,
): Promise<NeoliaGlobalConfig> {
  return new Promise((resolve, reject) => {
    const panelTopic = `${CONFIG_TOPIC_PREFIX}/${panelCode}/config`;
    const topics = [CONFIG_TOPIC_GLOBAL, panelTopic];

    console.log("[PanelProvisioning] Subscription aux topics de config:", topics);

    const timeout = setTimeout(() => {
      console.warn("[PanelProvisioning] Timeout en attente du message de configuration sur", topics);
      reject(new Error("Timeout en attente de la configuration du panneau"));
    }, timeoutMs);

    client.subscribe(topics, { qos: 0 }, (err) => {
      if (err) {
        clearTimeout(timeout);
        console.error("[PanelProvisioning] Erreur subscription:", err);
        reject(new Error(`Erreur subscription MQTT: ${err.message}`));
        return;
      }
      console.log("[PanelProvisioning] Abonné à", topics);
    });

    client.on("message", (receivedTopic, payload) => {
      if (!topics.includes(receivedTopic)) return;

      try {
        const text = payload.toString("utf-8");
        const json = JSON.parse(text) as NeoliaGlobalConfig;
        console.log("[PanelProvisioning] Configuration reçue sur", receivedTopic, ":", json);
        clearTimeout(timeout);
        resolve(json);
      } catch (e) {
        console.error("[PanelProvisioning] Erreur parsing payload:", e);
        // On ne rejette pas, on attend un autre message valide
      }
    });
  });
}

/**
 * Extrait la configuration du panneau depuis le payload MQTT.
 */
function extractPanelConfig(raw: NeoliaGlobalConfig): PanelConfig {
  const ha = raw?.home_structure?.ha;

  if (!ha?.url || !ha?.token) {
    throw new Error("Configuration invalide: URL ou token Home Assistant manquant");
  }

  return {
    haBaseUrl: ha.url,
    haToken: ha.token,
    remoteHaUrl: undefined,
    mqttHost: raw?.network?.mqtt_host,
    mqttPort: raw?.network?.mqtt_port,
    panelLayout: raw?.panel?.default_page,
    raw,
  };
}

/**
 * Applique la configuration du panneau dans les stores et services.
 */
export async function applyPanelConfig(config: PanelConfig): Promise<void> {
  console.log("[PanelProvisioning] Application de la configuration...");

  await setHaConfig({
    localHaUrl: config.haBaseUrl,
    remoteHaUrl: config.remoteHaUrl,
    token: config.haToken,
  });

  const { setConnection } = useHAStore.getState();
  setConnection({
    url: config.haBaseUrl,
    token: config.haToken,
    connected: true,
  });

  if (config.mqttHost || config.mqttPort) {
    const settings = useNeoliaSettings.getState();
    if (config.mqttHost) settings.setMqttHost(config.mqttHost);
    if (config.mqttPort) settings.setMqttPort(config.mqttPort);
  }

  try {
    window.localStorage.setItem("neolia_panel_has_config", "1");
  } catch {
    // ignore storage errors
  }

  console.log("[PanelProvisioning] Configuration appliquée avec succès");
}

/**
 * Fonction principale de provisioning du panneau via MQTT.
 * Utilisée aussi bien par la connexion automatique que manuelle.
 */
export async function provisionPanelViaMqtt(params: PanelProvisioningParams): Promise<PanelConfig> {
  const {
    host,
    port,
    username = DEFAULT_MQTT_USERNAME,
    password = DEFAULT_MQTT_PASSWORD,
    useSecure = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    panelCode,
  } = params;

  const scheme = useSecure ? "wss" : "ws";
  const portsToTry = port ? [port] : FALLBACK_PORTS;

  let connectedClient: MqttClient | null = null;
  let successPort: number | null = null;

  for (const tryPort of portsToTry) {
    const url = `${scheme}://${host}:${tryPort}/mqtt`;

    try {
      connectedClient = await tryConnectMqttPort(url, username, password, 5000);
      successPort = tryPort;
      console.log("[PanelProvisioning] Connexion établie sur port", tryPort);
      break;
    } catch (err) {
      console.warn(`[PanelProvisioning] Échec sur port ${tryPort}:`, (err as Error).message);
    }
  }

  if (!connectedClient) {
    const triedPorts = portsToTry.join(", ");
    throw new Error(`Impossible de se connecter au broker MQTT sur ${host} (ports testés: ${triedPorts})`);
  }

  if (successPort) {
    useNeoliaSettings.getState().setMqttPort(successPort);
  }

  try {
    const rawConfig = await waitForConfigMessage(connectedClient, panelCode, timeoutMs);
    const panelConfig = extractPanelConfig(rawConfig);

    // Activer la reconnexion après succès
    connectedClient.options.reconnectPeriod = 5000;

    return panelConfig;
  } catch (error) {
    try {
      connectedClient.end(true);
    } catch {
      // ignore
    }
    throw error;
  }
}

/**
 * Provisioning automatique (PnP) - utilise le host MQTT par défaut.
 */
export async function provisionPanelAuto(panelCode: string): Promise<PanelConfig> {
  const { mqttHost, mqttUseSecure, mqttUsername, mqttPassword } = useNeoliaSettings.getState();
  const effectivePanelCode = panelCode || DEFAULT_PANEL_CODE;

  console.log("[PanelProvisioning] Provisioning automatique, host:", mqttHost, "panelCode:", effectivePanelCode);

  return provisionPanelViaMqtt({
    host: mqttHost,
    useSecure: mqttUseSecure,
    username: mqttUsername || DEFAULT_MQTT_USERNAME,
    password: mqttPassword || DEFAULT_MQTT_PASSWORD,
    panelCode: effectivePanelCode,
  });
}

/**
 * Provisioning manuel - utilise l'IP fournie par l'utilisateur comme host MQTT.
 */
export async function provisionPanelManual(manualIp: string, panelCode: string): Promise<PanelConfig> {
  const host = manualIp.trim();

  if (!host) {
    throw new Error("Adresse IP du Home Assistant requise");
  }

  const effectivePanelCode = panelCode || DEFAULT_PANEL_CODE;

  console.log("[PanelProvisioning] Provisioning manuel, host:", host, "panelCode:", effectivePanelCode);

  useNeoliaSettings.getState().setMqttHost(host);

  return provisionPanelViaMqtt({
    host,
    username: DEFAULT_MQTT_USERNAME,
    password: DEFAULT_MQTT_PASSWORD,
    panelCode: effectivePanelCode,
  });
}
