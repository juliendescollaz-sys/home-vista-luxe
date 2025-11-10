import { useEffect, useState } from "react";
import { useHAStore } from "@/store/useHAStore";
import { getHACredentials } from "@/lib/crypto";

export function useInitializeConnection() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeConnection = async () => {
      const connection = useHAStore.getState().connection;
      
      // Si pas de connexion dans le store, essayer de charger depuis le storage chiffré
      if (!connection || !connection.url || !connection.token) {
        try {
          const credentials = await getHACredentials();
          if (credentials) {
            console.log("🔄 Restauration de la connexion depuis le storage");
            useHAStore.getState().setConnection({
              url: credentials.baseUrl,
              token: credentials.token,
              connected: false, // Le hook useHAClient se chargera de la connexion
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
