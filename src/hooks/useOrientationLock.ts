import { useState, useEffect } from "react";

type DisplayMode = "mobile" | "tablet" | "panel";

interface OrientationLockResult {
  showRotateOverlay: boolean;
  showPortraitSuggestion: boolean;
  isPortrait: boolean;
}

/**
 * Hook pour gérer le verrouillage d'orientation selon le mode d'affichage
 * 
 * - MOBILE: overlay bloquant en mode paysage
 * - TABLET/PANEL: suggestion non bloquante en mode portrait
 */
export const useOrientationLock = (mode: DisplayMode): OrientationLockResult => {
  const [isPortrait, setIsPortrait] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsPortrait(e.matches);
    };

    // Vérifier l'orientation initiale
    handleChange(mql);

    // Écouter les changements
    mql.addEventListener("change", handleChange);

    return () => {
      mql.removeEventListener("change", handleChange);
    };
  }, []);

  // Mobile: overlay bloquant si paysage
  const showRotateOverlay = mode === "mobile" && !isPortrait;

  // Tablet/Panel: suggestion non bloquante si portrait
  const showPortraitSuggestion = (mode === "tablet" || mode === "panel") && isPortrait;

  return {
    showRotateOverlay,
    showPortraitSuggestion,
    isPortrait,
  };
};
