import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHAStore } from "@/store/useHAStore";

// URLs configurées
const PANEL_BASE_URL = "http://192.168.1.219:8123";
const CLOUD_BASE_URL = "https://bl09dhclkeomkczlb0b7ktsssxmevmdq.ui.nabu.casa";
const SHARED_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmMTIyYzA5MGZkOGY0OGZlYjcxZjM5MjgzMjgwZTdmMSIsImlhdCI6MTc2Mjc2OTcxNSwiZXhwIjoyMDc4MTI5NzE1fQ.x7o25AkxgP8PXjTijmXkYOZeMDneeSZVPJT5kUi0emM";

export interface EffectiveHAConfig {
  baseUrl: string;
  token: string;
  isPanel: boolean;
}

/**
 * Hook centralisé pour obtenir la configuration HA effective selon le mode d'affichage.
 * En mode Panel: force l'URL LAN locale (ignore le store).
 * En mode Mobile/Tablet: utilise les valeurs du store ou fallback sur le cloud.
 */
export function useEffectiveHAConfig(): EffectiveHAConfig {
  const { displayMode } = useDisplayMode();
  const connection = useHAStore((state) => state.connection);
  
  const isPanel = displayMode === "panel";
  
  // En mode Panel, on force toujours l'URL LAN et le token partagé
  if (isPanel) {
    if (typeof window !== "undefined") {
      console.log("[NEOLIA][PANEL] Mode Panel détecté, forçage URL LAN:", PANEL_BASE_URL);
    }
    return {
      baseUrl: PANEL_BASE_URL,
      token: SHARED_TOKEN,
      isPanel: true,
    };
  }
  
  // En mode Mobile/Tablet, on utilise le store ou les valeurs par défaut cloud
  return {
    baseUrl: connection?.url || CLOUD_BASE_URL,
    token: connection?.token || SHARED_TOKEN,
    isPanel: false,
  };
}

/**
 * Version non-hook pour usage dans des contextes non-React (initialisation, etc.)
 * Utilise une détection basique du mode Panel.
 */
export function getEffectiveHAConfigSync(displayMode: "mobile" | "tablet" | "panel"): EffectiveHAConfig {
  const isPanel = displayMode === "panel";
  
  if (isPanel) {
    return {
      baseUrl: PANEL_BASE_URL,
      token: SHARED_TOKEN,
      isPanel: true,
    };
  }
  
  // Pour mobile/tablet, on retourne les valeurs cloud par défaut
  // Le store sera utilisé si disponible dans le contexte React
  return {
    baseUrl: CLOUD_BASE_URL,
    token: SHARED_TOKEN,
    isPanel: false,
  };
}

// Export des constantes pour usage externe
export { PANEL_BASE_URL, CLOUD_BASE_URL, SHARED_TOKEN };
