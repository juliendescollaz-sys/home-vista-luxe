// src/components/neolia/bootstrap/neoliaMqttClient.ts

import { connect, MqttClient } from "mqtt";

export interface NeoliaMqttConnection {
  client: MqttClient | null;
  isConnected: boolean;
}

export interface NeoliaMqttConnectOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  useSecure?: boolean;
}

/**
 * Construit l'URL WebSocket du broker MQTT à partir de host/port et d'un flag de sécurité.
 * Exemple: ws://192.168.1.219:9001 ou wss://...
 */
function buildWsUrl(options: NeoliaMqttConnectOptions): string {
  const scheme = options.useSecure ? "wss" : "ws";
  return `${scheme}://${options.host}:${options.port}/mqtt`;
}

/**
 * Établit une connexion MQTT (WebSocket) basique.
 * Ne gère pas encore la reconnexion avancée, c'est volontairement simple à ce stade.
 */
export function connectNeoliaMqtt(
  options: NeoliaMqttConnectOptions,
  onConnect?: () => void,
  onError?: (err: Error) => void
): NeoliaMqttConnection {
  const url = buildWsUrl(options);

  const client = connect(url, {
    username: options.username,
    password: options.password,
  });

  const connection: NeoliaMqttConnection = {
    client,
    isConnected: false,
  };

  client.on("connect", () => {
    connection.isConnected = true;
    if (onConnect) onConnect();
  });

  client.on("error", (err) => {
    if (onError) onError(err);
  });

  client.on("close", () => {
    connection.isConnected = false;
  });

  return connection;
}

/**
 * S'abonne au topic `neolia/config/global` et appelle onMessage
 * avec le payload JSON parsé, ou null si erreur de parsing.
 */
export function subscribeNeoliaConfigGlobal(
  client: MqttClient,
  onMessage: (payload: unknown) => void
): void {
  const topic = "neolia/config/global";

  client.subscribe(topic, { qos: 0 }, (err) => {
    if (err) {
      console.error("[NeoliaMQTT] Subscribe error:", err);
    }
  });

  client.on("message", (receivedTopic, message) => {
    if (receivedTopic !== topic) return;

    try {
      const text = message.toString("utf-8");
      const parsed = JSON.parse(text);
      onMessage(parsed);
    } catch (e) {
      console.error("[NeoliaMQTT] Invalid JSON payload on neolia/config/global:", e);
      onMessage(null);
    }
  });
}
