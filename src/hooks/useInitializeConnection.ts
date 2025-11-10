import { useEffect, useState } from "react";
import { useHAStore } from "@/store/useHAStore";
import { getHACredentials } from "@/lib/crypto";

export function useInitializeConnection() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeConnection = async () => {
      const connection = useHAStore.getState().connection;
      
      if (!connection || !connection.url || !connection.token) {
        try {
          const credentials = await getHACredentials();
          
          if (credentials) {
            useHAStore.getState().setConnection({
              url: credentials.baseUrl,
              token: credentials.token,
              connected: false,
            });
          }
        } catch (error) {
          console.error("❌ Erreur lors de la restauration des credentials:", error);
        }
      }
      
      setIsInitialized(true);
    };

    initializeConnection();
  }, []);

  return isInitialized;
}
