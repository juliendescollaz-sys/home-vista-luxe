import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHAStore } from "@/store/useHAStore";
import { 
  CLOUD_BASE_URL, 
  DEV_SHARED_TOKEN, 
  getDevInitialHaUrl 
} from "@/config/networkDefaults";

export interface EffectiveHAConfig {
  baseUrl: string;
  token: string;
  isPanel: boolean;
  /** Indique si la configuration HA est prête (URL et token disponibles) */
  configured: boolean;
}

/**
 * Hook centralisé pour obtenir la configuration HA effective selon le mode d'affichage.
 * 
 * En mode Panel: utilise la config du store (remplie par onboarding MQTT).
 * En mode Mobile/Tablet: utilise les valeurs du store ou fallback sur le cloud en dev.
 * 
 * IMPORTANT: Plus aucune IP codée en dur. Tout vient du store (onboarding) ou des variables d'env.
 */
export function useEffectiveHAConfig(): EffectiveHAConfig {
  const { displayMode } = useDisplayMode();
  const connection = useHAStore((state) => state.connection);
  
  const isPanel = displayMode === "panel";
  
  // Récupérer l'URL et le token du store
  const storeUrl = connection?.url || "";
  const storeToken = connection?.token || "";
  
  // En mode Panel, on utilise uniquement le store (rempli par onboarding)
  if (isPanel) {
    const hasConfig = Boolean(storeUrl && storeToken);
    
    if (hasConfig) {
      console.log("[NEOLIA][PANEL] Config HA depuis store:", storeUrl);
    } else {
      console.log("[NEOLIA][PANEL] Aucune config HA disponible, onboarding requis");
    }
    
    return {
      baseUrl: storeUrl,
      token: storeToken,
      isPanel: true,
      configured: hasConfig,
    };
  }
  
  // En mode Mobile/Tablet, on utilise le store ou les valeurs de dev/cloud
  const devHaUrl = getDevInitialHaUrl();
  const effectiveUrl = storeUrl || devHaUrl || CLOUD_BASE_URL;
  const effectiveToken = storeToken || DEV_SHARED_TOKEN;
  
  return {
    baseUrl: effectiveUrl,
    token: effectiveToken,
    isPanel: false,
    configured: Boolean(effectiveUrl && effectiveToken),
  };
}

/**
 * Version non-hook pour usage dans des contextes non-React (initialisation, etc.)
 * Utilise une détection basique du mode Panel.
 * 
 * ATTENTION: Cette version ne peut pas accéder au store, 
 * elle retourne donc les valeurs de dev uniquement.
 */
export function getEffectiveHAConfigSync(displayMode: "mobile" | "tablet" | "panel"): EffectiveHAConfig {
  const isPanel = displayMode === "panel";
  const devHaUrl = getDevInitialHaUrl();
  
  if (isPanel) {
    // En mode Panel sync, on ne peut pas accéder au store
    // Retourne non-configuré (l'appelant doit utiliser le hook dans un contexte React)
    return {
      baseUrl: devHaUrl,
      token: DEV_SHARED_TOKEN,
      isPanel: true,
      configured: Boolean(devHaUrl && DEV_SHARED_TOKEN),
    };
  }
  
  // Pour mobile/tablet, on retourne les valeurs cloud/dev par défaut
  const effectiveUrl = devHaUrl || CLOUD_BASE_URL;
  
  return {
    baseUrl: effectiveUrl,
    token: DEV_SHARED_TOKEN,
    isPanel: false,
    configured: Boolean(effectiveUrl && DEV_SHARED_TOKEN),
  };
}

// Export des constantes pour usage externe (compatibilité)
export { CLOUD_BASE_URL };
