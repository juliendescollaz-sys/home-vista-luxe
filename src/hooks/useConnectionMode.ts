import { useState, useEffect } from "react";
import { getHaConfig, testHaConnection } from "@/services/haConfig";

export type ConnectionMode = "local" | "remote";

export interface ConnectionInfo {
  connectionMode: ConnectionMode | null;
  haBaseUrl: string | null;
  isLocal: boolean;
  isRemote: boolean;
  isChecking: boolean;
  error?: string;
}

/**
 * Hook pour déterminer automatiquement le mode de connexion (local vs remote)
 * pour les modes MOBILE et TABLET uniquement.
 * 
 * Logique :
 * 1. Teste d'abord la connexion locale (si localHaUrl existe)
 * 2. Si échec, bascule sur la connexion distante (si remoteHaUrl existe)
 * 3. Retourne l'URL effective à utiliser pour les appels HA
 * 
 * IMPORTANT : Ce hook ne doit PAS être utilisé en mode PANEL
 */
export function useConnectionMode(): ConnectionInfo {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    connectionMode: null,
    haBaseUrl: null,
    isLocal: false,
    isRemote: false,
    isChecking: true,
    error: undefined,
  });

  useEffect(() => {
    let isMounted = true;

    const detectConnectionMode = async () => {
      try {
        // Récupérer la configuration HA
        const config = await getHaConfig();

        if (!config || !config.token) {
          if (isMounted) {
            setConnectionInfo({
              connectionMode: null,
              haBaseUrl: null,
              isLocal: false,
              isRemote: false,
              isChecking: false,
              error: "Configuration Home Assistant manquante",
            });
          }
          return;
        }

        const { localHaUrl, remoteHaUrl, token } = config;

        // localHaUrl est TOUJOURS présent (obligatoire)
        // On teste d'abord la connexion locale
        const isLocalAvailable = await testHaConnection(localHaUrl, token, 3000);

        if (isLocalAvailable) {
          if (isMounted) {
            setConnectionInfo({
              connectionMode: "local",
              haBaseUrl: localHaUrl,
              isLocal: true,
              isRemote: false,
              isChecking: false,
            });
          }
          return;
        }

        // Local échoue - tester le cloud si disponible
        if (remoteHaUrl) {
          const isRemoteAvailable = await testHaConnection(remoteHaUrl, token, 5000);

          if (isRemoteAvailable) {
            if (isMounted) {
              setConnectionInfo({
                connectionMode: "remote",
                haBaseUrl: remoteHaUrl,
                isLocal: false,
                isRemote: true,
                isChecking: false,
              });
            }
            return;
          }

          // Les deux ont échoué
          if (isMounted) {
            setConnectionInfo({
              connectionMode: "remote",
              haBaseUrl: remoteHaUrl,
              isLocal: false,
              isRemote: true,
              isChecking: false,
              error: "Impossible de contacter Home Assistant ni en local ni via le cloud.",
            });
          }
          return;
        }

        // Pas d'URL cloud configurée et local échoue
        if (isMounted) {
          setConnectionInfo({
            connectionMode: null,
            haBaseUrl: null,
            isLocal: false,
            isRemote: false,
            isChecking: false,
            error: "Impossible de contacter Home Assistant en local et aucun accès cloud n'est configuré.",
          });
        }
      } catch (error) {
        if (isMounted) {
          setConnectionInfo({
            connectionMode: null,
            haBaseUrl: null,
            isLocal: false,
            isRemote: false,
            isChecking: false,
            error:
              error instanceof Error
                ? error.message
                : "Erreur lors de la détection du mode de connexion",
          });
        }
      }
    };

    detectConnectionMode();

    return () => {
      isMounted = false;
    };
  }, []);

  return connectionInfo;
}
