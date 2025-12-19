import { useEffect, useState } from "react";

export type DisplayMode = "mobile" | "tablet" | "panel";

/**
 * Hook central pour déterminer le mode d'affichage :
 * - "panel" : si build "panel" (flag env) OU flag global forcé
 * - "tablet" / "mobile" : en fonction de la largeur de l'écran
 *
 * Priorité :
 * 1) Flag global window.NEOLIA_PANEL_MODE === true (debug/override)
 * 2) Build "panel" explicite (VITE_NEOLIA_APP_TARGET === "panel")
 * 3) Fallback responsive sur la largeur de l'écran
 *
 * IMPORTANT :
 * - On ne dépend PAS du runtime (Capacitor) pour activer le mode panel,
 *   car certains panels/kiosk n'exposent pas correctement les signaux Capacitor.
 * - L'APK mobile reste mobile car son build est "mobile".
 */
export function useDisplayMode(): { displayMode: DisplayMode } {
  const getIsPanelBuild = (): boolean => {
    const target = (import.meta as any)?.env?.VITE_NEOLIA_APP_TARGET;
    return target === "panel";
  };

  const computeFromWidth = (): DisplayMode => {
    const width = window.innerWidth;
    if (width < 600) return "mobile";
    if (width < 1100) return "tablet";
    return "tablet";
  };

  const shouldUsePanel = (): boolean => {
    // 1) Override manuel (debug)
    if ((window as any).NEOLIA_PANEL_MODE === true) return true;

    // 2) Build panel = UI panel, quoi qu'il arrive
    if (getIsPanelBuild()) return true;

    return false;
  };

  const [mode, setMode] = useState<DisplayMode>(() => {
    if (typeof window === "undefined") return "mobile";
    return shouldUsePanel() ? "panel" : computeFromWidth();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyMode = () => {
      setMode(shouldUsePanel() ? "panel" : computeFromWidth());
    };

    applyMode();

    const onResize = () => applyMode();

    // Permet de basculer via console si besoin
    const interval = window.setInterval(() => {
      applyMode();
    }, 1000);

    window.addEventListener("resize", onResize);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return { displayMode: mode };
}
