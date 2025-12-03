import { useEffect, useState } from "react";
import { useHAStore } from "@/store/useHAStore";
import { getHACredentials } from "@/lib/crypto";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { PANEL_BASE_URL, CLOUD_BASE_URL, SHARED_TOKEN } from "@/hooks/useEffectiveHAConfig";

export function useInitializeConnection() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { displayMode } = useDisplayMode();

  useEffect(() => {
    const initializeConnection = async () => {
      const isPanel = displayMode === "panel";
      
      // En mode Panel, on force toujours l'URL LAN et le token partagé
      if (isPanel) {
        console.log("[NEOLIA][PANEL] Initialisation connexion HA en mode Panel");
        console.log("[NEOLIA][PANEL] URL forcée:", PANEL_BASE_URL);
        console.log("[NEOLIA][PANEL] Tentative de connexion à Home Assistant...");
        
        useHAStore.getState().setConnection({
          url: PANEL_BASE_URL,
          token: SHARED_TOKEN,
          connected: false,
        });
        
        setIsInitialized(true);
        return;
      }
      
      // En mode Mobile/Tablet, on utilise les credentials stockés ou le cloud par défaut
      const connection = useHAStore.getState().connection;
      
      if (!connection || !connection.url || !connection.token) {
        try {
          const credentials = await getHACredentials();
          
          if (credentials) {
            console.log("[NEOLIA] Restauration credentials stockés:", credentials.baseUrl);
            useHAStore.getState().setConnection({
              url: credentials.baseUrl,
              token: credentials.token,
              connected: false,
            });
          } else {
            // Fallback sur le cloud par défaut
            console.log("[NEOLIA] Pas de credentials stockés, utilisation cloud par défaut:", CLOUD_BASE_URL);
            useHAStore.getState().setConnection({
              url: CLOUD_BASE_URL,
              token: SHARED_TOKEN,
              connected: false,
            });
          }
        } catch (error) {
          console.error("❌ Erreur lors de la restauration des credentials:", error);
          // Fallback sur le cloud en cas d'erreur
          useHAStore.getState().setConnection({
            url: CLOUD_BASE_URL,
            token: SHARED_TOKEN,
            connected: false,
          });
        }
      }
      
      setIsInitialized(true);
    };

    initializeConnection();
  }, [displayMode]);

  return isInitialized;
}
