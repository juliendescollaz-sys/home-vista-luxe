// src/components/neolia/bootstrap/neoliaMqttClient.ts

import mqtt, { MqttClient } from "mqtt";
import type { NeoliaGlobalConfig } from "./neoliaConfigTypes";
import { isPanelMode } from "@/lib/platform";
import { useNeoliaSettings } from "@/store/useNeoliaSettings";
import { useNeoliaPanelConfigStore } from "@/store/useNeoliaPanelConfigStore";
import { DEFAULT_MQTT_PORT } from "@/config/networkDefaults";

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                          URL BUILDER (WS/WSS)                              */
/* -------------------------------------------------------------------------- */

export function buildNeoliaMqttWsUrl(options: NeoliaMqttConnectOptions): string {
  const scheme = options.useSecure ? "wss" : "ws";
  return `${scheme}://${options.host}:${options.port}/mqtt`;
}

/* -------------------------------------------------------------------------- */
/*                         TRY CONNECT (ONE PORT)                             */
/* -------------------------------------------------------------------------- */

function tryConnectMqttPort(
  url: string,
  username?: string,
  password?: string,
  timeoutMs: number = 5000
): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(url, {
      username,
      password,
      reconnectPeriod: 0,
      connectTimeout: timeoutMs,
      protocol: "ws",
    });

    const timeout = setTimeout(() => {
      console.warn("[MQTT PANEL] Timeout for", url);
      try {
        client.end(true);
      } catch {}
      reject(new Error(`Timeout MQTT sur ${url}`));
    }, timeoutMs);

    client.on("connect", () => {
      clearTimeout(timeout);
      console.log("[MQTT PANEL] Connecté →", url);
      resolve(client);
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.warn("[MQTT PANEL] Échec →", url, err?.message);
      try {
        client.end(true);
      } catch {}
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

/* -------------------------------------------------------------------------- */
/*                     PANEL MODE ZERO-CONFIG CONNECTION                      */
/* -------------------------------------------------------------------------- */

export async function connectNeoliaMqttPanel(
  onConnect?: () => void,
  onError?: (error: Error) => void
): Promise<NeoliaMqttConnection> {
  const panelConfig = useNeoliaPanelConfigStore.getState().config;
  const {
    mqttUsername,
    mqttPassword,
    mqttUseSecure,
    mqttHost,
    setMqttPort
  } = useNeoliaSettings.getState();

  /* ------------------------- 1) PRIORITÉ → PanelConfig ------------------------- */

  if (panelConfig && panelConfig.panelHost && panelConfig.mqttWsPort > 0) {
    const host = panelConfig.panelHost;
    const port = panelConfig.mqttWsPort;
    const secure = !!mqttUseSecure;
    const scheme = secure ? "wss" : "ws";
    const url = `${scheme}://${host}:${port}/mqtt`;

    console.log(
      "[MQTT PANEL] Tentative via PanelConfig →",
      url,
      "(user:", mqttUsername || "<none>", ")"
    );

    try {
      const client = await tryConnectMqttPort(url, mqttUsername, mqttPassword);

      client.options.reconnectPeriod = 5000;
      setMqttPort(port);

      console.log("[MQTT PANEL] Succès via PanelConfig");
      onConnect?.();

      return { client };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error("[MQTT PANEL] Échec PanelConfig:", e.message);
      onError?.(e);
      // On tente ensuite le fallback
    }
  }

  /* -------------------- 2) FALLBACK → useNeoliaSettings ----------------------- */

  if (!mqttHost) {
    const error = new Error(
      "Aucun host MQTT configuré. L'étape SN / discovery doit être réalisée."
    );
    console.error("[MQTT PANEL]", error.message);
    onError?.(error);
    throw error;
  }

  const scheme = mqttUseSecure ? "wss" : "ws";
  const tryPorts = [1884, 9001];

  console.log("[MQTT PANEL] Fallback sur settings MQTT, host:", mqttHost);

  for (const port of tryPorts) {
    const url = `${scheme}://${mqttHost}:${port}/mqtt`;

    console.log("[MQTT PANEL] Test port", port, "→", url);

    try {
      const client = await tryConnectMqttPort(url, mqttUsername, mqttPassword);

      console.log("[MQTT PANEL] Connecté via fallback sur port", port);
      setMqttPort(port);
      client.options.reconnectPeriod = 5000;

      onConnect?.();
      return { client };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.warn(`[MQTT PANEL] Port ${port} KO →`, e.message);
      onError?.(e);
    }
  }

  const finalError = new Error("Impossible de joindre MQTT via WebSocket (Panel Mode)");
  console.error("[MQTT PANEL]", finalError.message);
  onError?.(finalError);

  throw finalError;
}

/* -------------------------------------------------------------------------- */
/*                   MOBILE/TABLET MODE (STANDARD MQTT)                       */
/* -------------------------------------------------------------------------- */

export function connectNeoliaMqttStandard(
  options: NeoliaMqttConnectOptions,
  onConnect?: () => void,
  onError?: (error: Error) => void
): NeoliaMqttConnection {
  if (!options.host) {
    const error = new Error("Aucun host MQTT fourni.");
    onError?.(error);
    console.error("[MQTT STD]", error.message);
    return { client: null };
  }

  const finalPort = options.port || (options.useSecure ? 8884 : DEFAULT_MQTT_PORT);

  const finalOpts = {
    host: options.host,
    port: finalPort,
    username: options.username,
    password: options.password,
    useSecure: options.useSecure ?? false,
  };

  const url = buildNeoliaMqttWsUrl(finalOpts);
  console.log("[MQTT STD] Connexion →", url);

  const client = mqtt.connect(url, {
    username: finalOpts.username,
    password: finalOpts.password,
    reconnectPeriod: 5000,
    protocol: "ws",
  });

  client.on("connect", () => {
    console.log("[MQTT STD] Connecté");
    onConnect?.();
  });

  client.on("error", (err) => {
    console.error("[MQTT STD] Erreur MQTT:", err);
    onError?.(err);
  });

  client.on("close", () => {
    console.log("[MQTT STD] Fermeture connexion");
  });

  return { client };
}

/* -------------------------------------------------------------------------- */
/*                       POINT D'ENTRÉE PRINCIPAL MQTT                         */
/* -------------------------------------------------------------------------- */

export function connectNeoliaMqtt(
  options: NeoliaMqttConnectOptions,
  onConnect?: () => void,
  onError?: (error: Error) => void
): NeoliaMqttConnection | Promise<NeoliaMqttConnection> {
  if (isPanelMode()) {
    console.log("[MQTT] Mode PANEL détecté → Zero-Config activé");
    return connectNeoliaMqttPanel(onConnect, onError);
  }

  console.log("[MQTT] Mode non-panel → Standard");
  return connectNeoliaMqttStandard(options, onConnect, onError);
}

/* -------------------------------------------------------------------------- */
/*                  SUBSCRIPTION TOPIC neolia/config/global                    */
/* -------------------------------------------------------------------------- */

export type NeoliaConfigHandler = (payload: NeoliaGlobalConfig) => void;

export function subscribeNeoliaConfigGlobal(
  client: MqttClient,
  handler: NeoliaConfigHandler
): void {
  const topic = "neolia/config/global";

  client.subscribe(topic, { qos: 0 }, (err) => {
    if (err) {
      console.error("[MQTT] Subscription error:", topic, err);
      return;
    }
    console.log("[MQTT] Subscribed →", topic);
  });

  client.on("message", (receivedTopic, payload) => {
    if (receivedTopic !== topic) return;

    try {
      const text = payload.toString("utf-8");
      const json = JSON.parse(text) as NeoliaGlobalConfig;
      console.log("[MQTT] Payload config/global reçu:", json);
      handler(json);
    } catch (e) {
      console.error("[MQTT] Erreur parsing payload:", e);
    }
  });
}
