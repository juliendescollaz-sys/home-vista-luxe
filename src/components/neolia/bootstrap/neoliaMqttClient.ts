// src/components/neolia/bootstrap/neoliaMqttClient.ts

import mqtt, { MqttClient } from "mqtt";
import type { NeoliaGlobalConfig } from "./neoliaConfigTypes";
import { isPanelMode } from "@/lib/platform";
import { useNeoliaSettings } from "@/store/useNeoliaSettings";
import { DEFAULT_MQTT_PORT, DEV_DEFAULT_MQTT_HOST } from "@/config/networkDefaults";

export interface NeoliaMqttConnectOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  useSecure?: boolean;
}

export interface NeoliaMqttConnection {
  client: MqttClient | null;
}

/**
 * Construit l'URL WebSocket du broker MQTT à partir des options de connexion.
 * On respecte STRICTEMENT le host et le port fournis.
 */
export function buildNeoliaMqttWsUrl(options: NeoliaMqttConnectOptions): string {
  const scheme = options.useSecure ? "wss" : "ws";
  const host = options.host;
  const port = options.port;

  return `${scheme}://${host}:${port}/mqtt`;
}

/**
 * Tente une connexion MQTT sur un port donné avec timeout.
 * - Résout avec un client connecté si succès.
 * - Rejette en cas d'échec ou de timeout.
 */
function tryConnectMqttPort(
  url: string,
  username?: string,
  password?: string,
  timeoutMs: number = 5000,
): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(url, {
      username,
      password,
      reconnectPeriod: 0, // Pas de reconnexion auto pendant le test
      connectTimeout: timeoutMs,
      protocol: "ws",
    });

    const timeout = setTimeout(() => {
      console.warn("[NeoliaMQTT PANEL] Connection timeout for", url);
      try {
        client.end(true);
      } catch {}
      reject(new Error(`Timeout de connexion MQTT sur ${url}`));
    }, timeoutMs);

    client.on("connect", () => {
      clearTimeout(timeout);
      console.log("[NeoliaMQTT PANEL] Connecté via", url);
      resolve(client);
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.warn("[NeoliaMQTT PANEL] Échec connexion", url, err?.message);
      try {
        client.end(true);
      } catch {}
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

/**
 * Connexion MQTT spécifique au mode Panel avec fallback automatique.
 * Tente d'abord le port 1884 (HA Green / nouvelles configs),
 * puis fallback sur 9001 (anciennes configs Mosquitto).
 *
 * IMPORTANT: Si aucun host MQTT n'est configuré, lève une erreur explicite.
 *
 * - En cas de succès : retourne { client } avec un client connecté.
 * - En cas d'échec sur 1884 ET 9001 : lève une exception.
 */
export async function connectNeoliaMqttPanel(
  onConnect?: () => void,
  onError?: (error: Error) => void,
): Promise<NeoliaMqttConnection> {
  const { mqttHost, mqttUseSecure, mqttUsername, mqttPassword, setMqttPort } = useNeoliaSettings.getState();

  // Vérifier qu'un host est configuré
  if (!mqttHost) {
    const error = new Error(
      "Aucun host MQTT configuré. L'onboarding est requis pour configurer l'adresse du serveur."
    );
    console.error("[NeoliaMQTT PANEL]", error.message);
    if (onError) {
      onError(error);
    }
    throw error;
  }

  const scheme = mqttUseSecure ? "wss" : "ws";

  // Ports PnP → fallback automatique silencieux
  const tryPorts = [1884, 9001];

  console.log("[NeoliaMQTT PANEL] Démarrage connexion Zero-Config, host:", mqttHost);

  for (const port of tryPorts) {
    const url = `${scheme}://${mqttHost}:${port}/mqtt`;
    console.log("[NeoliaMQTT PANEL] Tentative de connexion :", url);

    try {
      const client = await tryConnectMqttPort(url, mqttUsername, mqttPassword);

      // Si on arrive ici, la connexion est OK
      console.log("[NeoliaMQTT PANEL] Connecté via port", port);
      setMqttPort(port);

      // Réactiver la reconnexion automatique après succès
      client.options.reconnectPeriod = 5000;

      if (onConnect) {
        onConnect();
      }

      return { client };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn(`[NeoliaMQTT PANEL] Échec sur le port ${port}, on tente le suivant si disponible`, error.message);
      if (onError) {
        onError(error);
      }
      // on continue la boucle pour tenter le port suivant
    }
  }

  const finalError = new Error("MQTT WebSocket unreachable on ports 1884 and 9001 (Panel Mode)");
  console.error("[NeoliaMQTT PANEL]", finalError.message);
  if (onError) {
    onError(finalError);
  }

  // Ici on LÈVE l'erreur pour que PanelOnboarding puisse afficher l'aide
  throw finalError;
}

/**
 * Connexion au broker MQTT Neolia en WebSocket (mode standard Mobile/Tablet).
 *
 * IMPORTANT: Si aucun host n'est fourni dans les options, lève une erreur.
 * On ne se connecte jamais à une IP arbitraire.
 */
export function connectNeoliaMqttStandard(
  options: NeoliaMqttConnectOptions,
  onConnect?: () => void,
  onError?: (error: Error) => void,
): NeoliaMqttConnection {
  // Vérifier qu'un host est fourni
  if (!options.host) {
    const error = new Error(
      "Aucun host MQTT fourni dans les options. La configuration réseau est requise."
    );
    console.error("[NeoliaMQTT]", error.message);
    if (onError) {
      onError(error);
    }
    return { client: null };
  }

  const defaultPort = options.useSecure ? 8884 : DEFAULT_MQTT_PORT;

  const finalOptions: NeoliaMqttConnectOptions = {
    host: options.host,
    port: options.port || defaultPort,
    useSecure: options.useSecure ?? false,
    username: options.username,
    password: options.password,
  };

  const url = buildNeoliaMqttWsUrl(finalOptions);

  console.log("[NeoliaMQTT] connectNeoliaMqttStandard - final options:", finalOptions, "url:", url);

  const client = mqtt.connect(url, {
    username: finalOptions.username,
    password: finalOptions.password,
    reconnectPeriod: 5000,
    protocol: "ws",
  });

  client.on("connect", () => {
    console.log("[NeoliaMQTT] Connected to broker via WebSocket");
    if (onConnect) {
      onConnect();
    }
  });

  client.on("error", (err) => {
    console.error("[NeoliaMQTT] MQTT error:", err);
    if (onError) {
      onError(err as Error);
    }
  });

  client.on("close", () => {
    console.log("[NeoliaMQTT] Connection closed");
  });

  return { client };
}

/**
 * Point d'entrée principal de connexion MQTT.
 * - Mode Panel : utilise connectNeoliaMqttPanel avec fallback automatique
 * - Mode Mobile/Tablet : utilise connectNeoliaMqttStandard avec options fournies
 */
export function connectNeoliaMqtt(
  options: NeoliaMqttConnectOptions,
  onConnect?: () => void,
  onError?: (error: Error) => void,
): NeoliaMqttConnection | Promise<NeoliaMqttConnection> {
  // Mode Panel : Zero-Config avec fallback automatique
  if (isPanelMode()) {
    console.log("[NeoliaMQTT] Mode Panel détecté → connexion Zero-Config");
    return connectNeoliaMqttPanel(onConnect, onError);
  }

  // Mode Mobile/Tablet : logique standard avec options fournies
  console.log("[NeoliaMQTT] Mode non-Panel → connexion standard");
  return connectNeoliaMqttStandard(options, onConnect, onError);
}

export type NeoliaConfigHandler = (payload: NeoliaGlobalConfig) => void;

/**
 * S'abonne au topic neolia/config/global et parse le payload JSON.
 */
export function subscribeNeoliaConfigGlobal(client: MqttClient, handler: NeoliaConfigHandler): void {
  const topic = "neolia/config/global";

  client.subscribe(topic, { qos: 0 }, (err) => {
    if (err) {
      console.error("[NeoliaMQTT] Subscription error on", topic, ":", err);
      return;
    }
    console.log("[NeoliaMQTT] Subscribed to", topic);
  });

  client.on("message", (receivedTopic, payload) => {
    if (receivedTopic !== topic) {
      return;
    }

    try {
      const text = payload.toString("utf-8");
      const json = JSON.parse(text) as NeoliaGlobalConfig;
      console.log("[NeoliaMQTT] Received neolia/config/global payload:", json);
      handler(json);
    } catch (e) {
      console.error("[NeoliaMQTT] Error parsing neolia/config/global payload:", e);
    }
  });
}
