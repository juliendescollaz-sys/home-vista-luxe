// src/components/neolia/bootstrap/neoliaMqttClient.ts

import mqtt, { MqttClient } from "mqtt";
import type { NeoliaGlobalConfig } from "./neoliaConfigTypes";

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
 * Connexion au broker MQTT Neolia en WebSocket.
 *
 * - Les options fournies par l'appelant DOIVENT avoir priorité totale
 *   sur les valeurs par défaut.
 * - On logge les options finales et l'URL utilisée pour faciliter le debug.
 */
export function connectNeoliaMqtt(
  options: NeoliaMqttConnectOptions,
  onConnect?: () => void,
  onError?: (error: Error) => void
): NeoliaMqttConnection {
  const defaultPort = options.useSecure ? 8884 : 1884;

  const defaults: NeoliaMqttConnectOptions = {
    host: "192.168.1.219",
    port: defaultPort,
    useSecure: false,
  };

  // ⚠️ IMPORTANT : les options de l'appelant écrasent les valeurs par défaut
  const finalOptions: NeoliaMqttConnectOptions = {
    ...defaults,
    ...options,
  };

  const url = buildNeoliaMqttWsUrl(finalOptions);

  console.log(
    "[NeoliaMQTT] connectNeoliaMqtt - final options:",
    finalOptions,
    "url:",
    url
  );

  const client = mqtt.connect(url, {
    username: finalOptions.username,
    password: finalOptions.password,
    reconnectPeriod: 5000,
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

export type NeoliaConfigHandler = (payload: NeoliaGlobalConfig) => void;

/**
 * S'abonne au topic neolia/config/global et parse le payload JSON.
 */
export function subscribeNeoliaConfigGlobal(
  client: MqttClient,
  handler: NeoliaConfigHandler
): void {
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
      console.error(
        "[NeoliaMQTT] Error parsing neolia/config/global payload:",
        e
      );
    }
  });
}
