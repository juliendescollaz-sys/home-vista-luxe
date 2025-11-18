import { useState, useEffect } from "react";

/**
 * Type de mode d'affichage pour l'application
 * - mobile: smartphone (< 600px)
 * - tablet: tablette iPad/Galaxy Tab (600-1100px)
 * - panel: panneau mural S563 (>= 1100px ou flag NEOLIA_PANEL_MODE)
 */
export type DisplayMode = "mobile" | "tablet" | "panel";

/**
 * Configuration des seuils de breakpoints en pixels logiques
 */
const BREAKPOINTS = {
  MOBILE_MAX: 600,
  TABLET_MAX: 1100,
} as const;

/**
 * Détecte le mode d'affichage actuel de l'application
 * 
 * Stratégie de détection (dans l'ordre) :
 * 1. Flag forcé window.NEOLIA_PANEL_MODE === true → "panel"
 * 2. Largeur viewport (window.innerWidth) :
 *    - < 600px → "mobile"
 *    - 600-1100px → "tablet"
 *    - >= 1100px → "tablet" (ou "panel" si flag présent)
 * 
 * Note : Intégration future possible avec Capacitor Device.getInfo()
 * pour détecter automatiquement les modèles (iPad, iPhone, S563)
 */
export function detectDisplayMode(): DisplayMode {
  // 1. Vérifier le flag forcé pour les panneaux
  if (typeof window !== "undefined" && (window as any).NEOLIA_PANEL_MODE === true) {
    return "panel";
  }

  // 2. Détection par largeur de viewport (fonctionne en web et Capacitor)
  if (typeof window !== "undefined") {
    const width = window.innerWidth;

    if (width < BREAKPOINTS.MOBILE_MAX) {
      return "mobile";
    }

    if (width < BREAKPOINTS.TABLET_MAX) {
      return "tablet";
    }

    // Pour les très larges écrans, retourner tablet par défaut
    // (sauf si NEOLIA_PANEL_MODE est défini)
    return "tablet";
  }

  // Fallback par défaut (SSR ou environnement sans window)
  return "mobile";
}

/**
 * Hook React pour obtenir le mode d'affichage actuel
 * 
 * Ce hook :
 * - Détecte le mode au montage
 * - Écoute les changements de taille de fenêtre
 * - Met à jour le mode automatiquement lors du redimensionnement
 * 
 * @returns { displayMode: DisplayMode } - Le mode d'affichage actuel
 * 
 * @example
 * ```tsx
 * const { displayMode } = useDisplayMode();
 * 
 * if (displayMode === "panel") {
 *   return <PanelLayout />;
 * }
 * 
 * return <MobileLayout />;
 * ```
 */
export function useDisplayMode() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => detectDisplayMode());

  useEffect(() => {
    // Fonction de mise à jour du mode
    const updateDisplayMode = () => {
      const newMode = detectDisplayMode();
      setDisplayMode((currentMode) => {
        // Ne mettre à jour que si le mode a vraiment changé
        if (currentMode !== newMode) {
          console.log(`[DisplayMode] Changement de mode: ${currentMode} → ${newMode}`);
          return newMode;
        }
        return currentMode;
      });
    };

    // Écouter les changements de taille
    window.addEventListener("resize", updateDisplayMode);

    // Vérifier aussi le flag NEOLIA_PANEL_MODE au cas où il serait défini après le montage
    const checkPanelMode = setInterval(() => {
      if ((window as any).NEOLIA_PANEL_MODE === true && displayMode !== "panel") {
        setDisplayMode("panel");
      }
    }, 1000);

    return () => {
      window.removeEventListener("resize", updateDisplayMode);
      clearInterval(checkPanelMode);
    };
  }, [displayMode]);

  return { displayMode };
}

/**
 * Configuration pour forcer le mode Panel
 * À utiliser dans les builds spécifiques pour le S563
 * 
 * @example
 * ```tsx
 * // Dans index.html ou au démarrage de l'app
 * window.NEOLIA_PANEL_MODE = true;
 * ```
 */
declare global {
  interface Window {
    NEOLIA_PANEL_MODE?: boolean;
  }
}
