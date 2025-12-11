// src/hooks/useNeoliaPanelConfigLoader.ts

import { useEffect, useRef } from "react";
import { isPanelMode } from "@/lib/platform";
import { useEffectiveHAConfig } from "@/hooks/useEffectiveHAConfig";
import { useNeoliaPanelConfigStore } from "@/store/useNeoliaPanelConfigStore";
import { fetchNeoliaPanelConfig } from "@/api/neoliaHaClient";

/**
 * Hook qui charge automatiquement la configuration Neolia Panel depuis Home Assistant
 * au démarrage en mode Panel uniquement.
 * 
 * Ce hook doit être appelé une seule fois dans le layout racine Panel.
 * Il ne modifie pas l'UI et gère les erreurs silencieusement (logs uniquement).
 */
export function useNeoliaPanelConfigLoader(): void {
  const { baseUrl, token, configured } = useEffectiveHAConfig();
  const { setConfig, setError, setLoading, loading, loaded } = useNeoliaPanelConfigStore();
  
  // Ref pour éviter les appels multiples
  const fetchAttempted = useRef(false);

  useEffect(() => {
    // Ne rien faire si on n'est pas en mode Panel
    if (!isPanelMode()) {
      return;
    }

    // Ne rien faire si la config HA n'est pas disponible
    if (!configured || !baseUrl || !token) {
      console.log("[NeoliaPanelConfig] Config HA non disponible, chargement différé");
      return;
    }

    // Ne pas relancer si déjà chargé ou en cours
    if (loaded || loading || fetchAttempted.current) {
      return;
    }

    fetchAttempted.current = true;

    const loadConfig = async () => {
      console.log("[NeoliaPanelConfig] Chargement de la config depuis HA:", baseUrl);
      setLoading(true);

      try {
        const config = await fetchNeoliaPanelConfig({ baseUrl, token });
        
        console.log("[NeoliaPanelConfig] Config chargée avec succès:", {
          neoliaCode: config.neoliaCode,
          panelHost: config.panelHost,
          mqttWsPort: config.mqttWsPort,
        });
        
        setConfig(config);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        
        console.error(
          "[NeoliaPanelConfig] Failed to load panel config from HA",
          error
        );
        
        setError(errorMessage);
      }
    };

    loadConfig();
  }, [baseUrl, token, configured, loaded, loading, setConfig, setError, setLoading]);
}
