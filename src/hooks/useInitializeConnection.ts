import { useEffect, useState } from "react";
import { useHAStore } from "@/store/useHAStore";
import { getHACredentials } from "@/lib/crypto";

export function useInitializeConnection() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeConnection = async () => {
      const connection = useHAStore.getState().connection;
      
      console.log("🔍 État actuel de la connexion:", connection);
      
      // Si pas de connexion dans le store, essayer de charger depuis le storage chiffré
      if (!connection || !connection.url || !connection.token) {
        try {
          console.log("🔄 Tentative de restauration des credentials...");
          const credentials = await getHACredentials();
          console.log("📦 Credentials récupérés:", credentials ? "✅ Oui" : "❌ Non");
          
          if (credentials) {
            console.log("🔄 Restauration de la connexion depuis le storage");
            useHAStore.getState().setConnection({
              url: credentials.baseUrl,
              token: credentials.token,
              connected: false, // Le hook useHAClient se chargera de la connexion
            });
            console.log("✅ Connexion restaurée dans le store");
          }
        } catch (error) {
          console.error("❌ Erreur lors de la restauration des credentials:", error);
        }
      } else {
        console.log("✅ Connexion déjà présente dans le store");
      }
      
      setIsInitialized(true);
      console.log("✅ Initialisation terminée");
    };

    initializeConnection();
  }, []);

  return isInitialized;
}
