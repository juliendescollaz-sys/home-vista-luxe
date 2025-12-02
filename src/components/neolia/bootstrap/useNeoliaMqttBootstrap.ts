// src/components/neolia/bootstrap/useNeoliaMqttBootstrap.ts

import { useEffect, useMemo, useRef, useState } from "react";
import type { MqttClient } from "mqtt";
import {
  connectNeoliaMqtt,
  subscribeNeoliaConfigGlobal,
  NeoliaMqttConnectOptions,
} from "./neoliaMqttClient";
import { useNeoliaBootstrap } from "./useNeoliaBootstrap";
import { setHaConfig } from "@/services/haConfig";

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
 * Il ne gère PAS la découverte automatique du host/port ici :
 * on suppose qu'on lui fournit les options de connexion.
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

  const start = () => {
    if (clientRef.current) {
      // déjà connecté ou en cours, on ne recommence pas
      return;
    }

    // Reset the flag when starting a new connection
    haConfigStoredRef.current = false;

    setMqttStatus("connecting");
    setMqttError(undefined);

    const connection = connectNeoliaMqtt(
      mqttOptions,
      () => {
        setMqttStatus("connected");
        const client = connection.client;
        if (!client) return;

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
      },
      (err) => {
        setMqttStatus("error");
        setMqttError(err?.message ?? "Erreur de connexion MQTT.");
      }
    );

    clientRef.current = connection.client;
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
