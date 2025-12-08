import { useEffect, useState } from "react";
import { useHAStore } from "@/store/useHAStore";
import { getHACredentials } from "@/lib/crypto";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { 
  CLOUD_BASE_URL, 
  DEV_SHARED_TOKEN, 
  getDevInitialHaUrl 
} from "@/config/networkDefaults";

export function useInitializeConnection() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { displayMode } = useDisplayMode();

  useEffect(() => {
    const initializeConnection = async () => {
      const isPanel = displayMode === "panel";
      const devHaUrl = getDevInitialHaUrl();
      
      // En mode Panel, on utilise l'URL de dev si disponible, sinon on attend l'onboarding
      if (isPanel) {
        console.log("[NEOLIA][PANEL] Initialisation connexion HA en mode Panel");
        
        if (devHaUrl && DEV_SHARED_TOKEN) {
          console.log("[NEOLIA][PANEL] URL de dev disponible:", devHaUrl);
          useHAStore.getState().setConnection({
            url: devHaUrl,
            token: DEV_SHARED_TOKEN,
            connected: false,
          });
        } else {
          console.log("[NEOLIA][PANEL] Pas de config de dev, onboarding requis");
          // Ne pas définir de connexion - l'onboarding sera déclenché
        }
        
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
            // Fallback sur le cloud par défaut (ou URL de dev)
            const fallbackUrl = devHaUrl || CLOUD_BASE_URL;
            const fallbackToken = DEV_SHARED_TOKEN;
            
            if (fallbackToken) {
              console.log("[NEOLIA] Pas de credentials stockés, utilisation fallback:", fallbackUrl);
              useHAStore.getState().setConnection({
                url: fallbackUrl,
                token: fallbackToken,
                connected: false,
              });
            } else {
              console.log("[NEOLIA] Pas de credentials, onboarding requis");
            }
          }
        } catch (error) {
          console.error("❌ Erreur lors de la restauration des credentials:", error);
        }
      }
      
      setIsInitialized(true);
    };

    initializeConnection();
  }, [displayMode]);

  return isInitialized;
}
