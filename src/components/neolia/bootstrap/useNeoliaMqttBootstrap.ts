// src/components/neolia/bootstrap/useNeoliaMqttBootstrap.ts

import { useEffect, useMemo, useRef, useState } from "react";
import type { MqttClient } from "mqtt";
import {
  connectNeoliaMqtt,
  connectNeoliaMqttPanel,
  subscribeNeoliaConfigGlobal,
  NeoliaMqttConnectOptions,
} from "./neoliaMqttClient";
import { useNeoliaBootstrap } from "./useNeoliaBootstrap";
import { setHaConfig } from "@/services/haConfig";
import { isPanelMode } from "@/lib/platform";

export interface UseNeoliaMqttBootstrapOptions extends NeoliaMqttConnectOptions {
  autoStart?: boolean;
}

export type NeoliaMqttBootstrapStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

export interface UseNeoliaMqttBootstrapResult {
  mqttStatus: NeoliaMqttBootstrapStatus;
  mqttError?: string;
  lastPayloadAt?: Date;
  start: () => void;
  stop: () => void;
  // Re-expose bootstrap state
  status: "idle" | "valid" | "invalid";
  rawConfig: import("./neoliaConfigTypes").NeoliaGlobalConfig | null;
  haConnection: import("./neoliaConfigTypes").NeoliaHaConnection | null;
  error?: string;
}

/**
 * Hook de haut niveau pour :
 * - se connecter au broker MQTT Neolia (WebSocket)
 * - s'abonner à `neolia/config/global`
 * - alimenter automatiquement useNeoliaBootstrap avec le payload reçu
 * - enregistrer automatiquement la configuration HA si présente dans le payload
 *
 * Mode Panel : Zero-Config avec fallback automatique sur ports 1884/9001
 * Mode Mobile/Tablet : utilise les options fournies par l'appelant
 */
export function useNeoliaMqttBootstrap(
  options: UseNeoliaMqttBootstrapOptions
): UseNeoliaMqttBootstrapResult {
  const { autoStart = false, ...mqttOptions } = options;

  const [mqttStatus, setMqttStatus] =
    useState<NeoliaMqttBootstrapStatus>("idle");
  const [mqttError, setMqttError] = useState<string | undefined>(undefined);
  const [lastPayloadAt, setLastPayloadAt] = useState<Date | undefined>(
    undefined
  );

  const clientRef = useRef<MqttClient | null>(null);
  const haConfigStoredRef = useRef<boolean>(false);

  const {
    status,
    rawConfig,
    haConnection,
    error,
    applyFromPayload,
    reset: resetBootstrap,
  } = useNeoliaBootstrap();

  /**
   * Configure les handlers de message sur le client MQTT connecté.
   */
  const setupClientHandlers = (client: MqttClient) => {
    subscribeNeoliaConfigGlobal(client, async (payload) => {
      setLastPayloadAt(new Date());
      applyFromPayload(payload);

      // Extract HA credentials from payload
      const haUrl = payload?.home_structure?.ha?.url;
      const haToken = payload?.home_structure?.ha?.token;

      console.log(
        "[NeoliaBootstrap] MQTT payload received, haUrl:",
        haUrl,
        "hasToken:",
        !!haToken
      );

      // If valid HA credentials and not already stored in this session
      if (haUrl && haToken && !haConfigStoredRef.current) {
        haConfigStoredRef.current = true;
        try {
          await setHaConfig({
            url: haUrl,
            token: haToken,
          });
          console.log(
            "[NeoliaBootstrap] HA config stored from MQTT bootstrap"
          );
        } catch (error) {
          console.error(
            "[NeoliaBootstrap] Error while storing HA config from MQTT bootstrap:",
            error
          );
        }
      }
    });
  };

  const start = async () => {
    if (clientRef.current) {
      // déjà connecté ou en cours, on ne recommence pas
      return;
    }

    // Reset the flag when starting a new connection
    haConfigStoredRef.current = false;

    setMqttStatus("connecting");
    setMqttError(undefined);

    // Mode Panel : connexion Zero-Config avec fallback automatique
    if (isPanelMode()) {
      console.log("[NeoliaBootstrap] Mode Panel détecté → connexion Zero-Config");

      try {
        const connection = await connectNeoliaMqttPanel(
          () => {
            setMqttStatus("connected");
          },
          (err) => {
            setMqttStatus("error");
            setMqttError(err?.message ?? "Erreur de connexion MQTT Panel.");
          }
        );

        if (connection.client) {
          clientRef.current = connection.client;
          setMqttStatus("connected");
          setupClientHandlers(connection.client);
        } else {
          setMqttStatus("error");
          setMqttError("Impossible de se connecter au broker MQTT (ports 1884 et 9001 testés).");
        }
      } catch (err) {
        setMqttStatus("error");
        setMqttError(err instanceof Error ? err.message : "Erreur de connexion MQTT Panel.");
      }

      return;
    }

    // Mode Mobile/Tablet : connexion standard avec options fournies
    const connection = connectNeoliaMqtt(
      mqttOptions,
      () => {
        setMqttStatus("connected");
        const client = (connection as { client: MqttClient | null }).client;
        if (!client) return;
        setupClientHandlers(client);
      },
      (err) => {
        setMqttStatus("error");
        setMqttError(err?.message ?? "Erreur de connexion MQTT.");
      }
    );

    // Pour le mode standard, connection est synchrone
    if ('client' in connection && connection.client) {
      clientRef.current = connection.client;
    }
  };

  const stop = () => {
    if (clientRef.current) {
      try {
        clientRef.current.end(true);
      } catch {
        // ignore
      }
      clientRef.current = null;
    }
    haConfigStoredRef.current = false;
    setMqttStatus("idle");
    setMqttError(undefined);
    setLastPayloadAt(undefined);
    resetBootstrap();
  };

  // Auto-start si demandé
  useEffect(() => {
    if (autoStart) {
      start();
    }
    return () => {
      // Cleanup à l'unmount
      if (clientRef.current) {
        try {
          clientRef.current.end(true);
        } catch {
          // ignore
        }
        clientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, mqttOptions.host, mqttOptions.port]);

  return useMemo(
    () => ({
      mqttStatus,
      mqttError,
      lastPayloadAt,
      start,
      stop,
      status,
      rawConfig,
      haConnection,
      error,
    }),
    [
      mqttStatus,
      mqttError,
      lastPayloadAt,
      status,
      rawConfig,
      haConnection,
      error,
    ]
  );
}
