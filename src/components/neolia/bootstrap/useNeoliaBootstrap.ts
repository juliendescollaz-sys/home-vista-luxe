// src/components/neolia/bootstrap/useNeoliaBootstrap.ts

import { useCallback, useState } from "react";
import type {
  NeoliaGlobalConfig,
  NeoliaHaConnection,
} from "./neoliaConfigTypes";
import { parseNeoliaConfig, extractHaConnection } from "./neoliaBootstrap";

export type NeoliaBootstrapStatus = "idle" | "valid" | "invalid";

export interface NeoliaBootstrapState {
  status: NeoliaBootstrapStatus;
  rawConfig: NeoliaGlobalConfig | null;
  haConnection: NeoliaHaConnection | null;
  error?: string;
}

export interface UseNeoliaBootstrapResult extends NeoliaBootstrapState {
  applyFromPayload: (payload: unknown) => void;
  reset: () => void;
}

/**
 * Hook centralisé pour gérer le bootstrap Neolia à partir d'un payload brut,
 * typiquement reçu depuis le topic MQTT `neolia/config/global`.
 *
 * Ce hook ne gère PAS lui-même la connexion MQTT. Il suppose qu'on lui fournit
 * déjà un payload JSON (objet) ou qu'on a déjà fait JSON.parse côté appelant.
 */
export function useNeoliaBootstrap(): UseNeoliaBootstrapResult {
  const [state, setState] = useState<NeoliaBootstrapState>({
    status: "idle",
    rawConfig: null,
    haConnection: null,
    error: undefined,
  });

  const applyFromPayload = useCallback((payload: unknown) => {
    const config = parseNeoliaConfig(payload);
    if (!config) {
      setState({
        status: "invalid",
        rawConfig: null,
        haConnection: null,
        error: "Payload Neolia invalide ou incomplet.",
      });
      return;
    }

    const haConn = extractHaConnection(config);
    if (!haConn) {
      setState({
        status: "invalid",
        rawConfig: config,
        haConnection: null,
        error: "Impossible d'extraire la configuration Home Assistant (url/token manquants).",
      });
      return;
    }

    setState({
      status: "valid",
      rawConfig: config,
      haConnection: haConn,
      error: undefined,
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      status: "idle",
      rawConfig: null,
      haConnection: null,
      error: undefined,
    });
  }, []);

  return {
    ...state,
    applyFromPayload,
    reset,
  };
}
