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

/**
 * Teste la connexion à Home Assistant sur baseUrl (/api/config)
 * Toute erreur (timeout, CORS, mixed content, 4xx/5xx) = false
 */
async function testHaConnection(
  baseUrl: string,
  token: string,
  timeoutMs: number
): Promise<boolean> {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${trimmed}/api/config`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    // On essaie de parser le JSON pour s'assurer que ce n'est pas une réponse foireuse
    await response.json();
    return true;
  } catch (_err) {
    // Erreur réseau, CORS, mixed content, AbortError, etc. => KO
    return false;
  } finally {
    clearTimeout(timer);
  }
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

    async function check() {
      try {
        const config = await getHaConfig(); // { localHaUrl, remoteHaUrl, token } ou null

        if (!config || !config.localHaUrl || !config.token) {
          if (!cancelled) {
            setState({
              connectionMode: "local",
              haBaseUrl: null,
              isLocal: false,
              isRemote: false,
              isChecking: false,
              error: "Configuration Home Assistant incomplète.",
            });
          }
          return;
        }

        const { localHaUrl, remoteHaUrl, token } = config;

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isChecking: true,
            error: undefined,
          }));
        }

        // 1) TENTER LE LOCAL
        const localOk = await testHaConnection(localHaUrl, token, 3000);

        if (!cancelled && localOk) {
          setState({
            connectionMode: "local",
            haBaseUrl: localHaUrl,
            isLocal: true,
            isRemote: false,
            isChecking: false,
            error: undefined,
          });
          return;
        }

        // 2) SI LOCAL KO → TENTER CLOUD SI DISPONIBLE
        if (remoteHaUrl) {
          const remoteOk = await testHaConnection(remoteHaUrl, token, 5000);

          if (!cancelled && remoteOk) {
            setState({
              connectionMode: "remote",
              haBaseUrl: remoteHaUrl,
              isLocal: false,
              isRemote: true,
              isChecking: false,
              error: undefined,
            });
            return;
          }
        }

        // 3) SI LOCAL + CLOUD KO, OU CLOUD NON CONFIGURÉ
        if (!cancelled) {
          let errorMessage = "Impossible de contacter Home Assistant en local.";
          if (!remoteHaUrl) {
            errorMessage += " Aucun accès cloud n'est configuré.";
          } else {
            errorMessage += " L'accès cloud a également échoué.";
          }

          setState({
            connectionMode: "local",
            haBaseUrl: null,
            isLocal: false,
            isRemote: false,
            isChecking: false,
            error: errorMessage,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            connectionMode: "local",
            haBaseUrl: null,
            isLocal: false,
            isRemote: false,
            isChecking: false,
            error:
              err instanceof Error
                ? err.message
                : "Erreur inattendue lors de la détection de la connexion.",
          });
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
