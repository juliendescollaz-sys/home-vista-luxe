import { useEffect, useState } from "react";
import { getHaConfig } from "@/services/haConfig";

export type ConnectionMode = "local" | "remote";

export interface ConnectionInfo {
  connectionMode: ConnectionMode;
  haBaseUrl: string | null;
  isLocal: boolean;
  isRemote: boolean;
  isChecking: boolean;
  error?: string;
}


export function useConnectionMode(): ConnectionInfo {
  const [state, setState] = useState<ConnectionInfo>({
    connectionMode: "local",
    haBaseUrl: null,
    isLocal: false,
    isRemote: false,
    isChecking: true,
    error: undefined,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const config = await getHaConfig();

      if (cancelled) return;

      if (!config || !config.localHaUrl || !config.token) {
        setState({
          connectionMode: "remote",
          haBaseUrl: null,
          isLocal: false,
          isRemote: true,
          isChecking: false,
          error: "Configuration Home Assistant incomplète.",
        });
        return;
      }

      // Utiliser l'URL configurée (qui sera toujours l'URL cloud maintenant)
      const haBaseUrl = config.localHaUrl;

      setState({
        connectionMode: "remote",
        haBaseUrl,
        isLocal: false,
        isRemote: true,
        isChecking: false,
        error: undefined,
      });
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
