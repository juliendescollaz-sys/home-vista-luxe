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
      const config = await getHaConfig(); // { localHaUrl, remoteHaUrl, token } ou null

      if (cancelled) return;

      if (!config || !config.localHaUrl || !config.token) {
        setState({
          connectionMode: "local",
          haBaseUrl: null,
          isLocal: false,
          isRemote: false,
          isChecking: false,
          error: "Configuration Home Assistant incomplète.",
        });
        return;
      }

      // Priorité à l'URL cloud pour le moment
      const { localHaUrl, remoteHaUrl } = config;
      const useCloudFirst = true; // Flag pour tester uniquement en cloud
      
      const haBaseUrl = (useCloudFirst && remoteHaUrl) ? remoteHaUrl : localHaUrl;
      const isRemote = (useCloudFirst && remoteHaUrl) ? true : false;

      setState({
        connectionMode: isRemote ? "remote" : "local",
        haBaseUrl,
        isLocal: !isRemote,
        isRemote,
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
