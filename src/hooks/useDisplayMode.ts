import { useEffect, useState } from "react";
import { isPanelMode } from "@/lib/platform";

export type DisplayMode = "mobile" | "tablet" | "panel";

/**
 * Hook central pour déterminer le mode d'affichage :
 * - "panel" : APK Android (Panel) ou flag global NEOLIA_PANEL_MODE = true
 * - "tablet" / "mobile" : en fonction de la largeur de l'écran
 *
 * Priorité :
 * 1) Environnement Panel natif (isPanelMode() === true)
 * 2) Flag global window.NEOLIA_PANEL_MODE === true
 * 3) Fallback responsive sur la largeur de l'écran
 */
export function useDisplayMode(): { displayMode: DisplayMode } {
  const [mode, setMode] = useState<DisplayMode>(() => {
    if (typeof window === "undefined") return "mobile";

    // 1) Priorité au runtime natif Panel (APK Android)
    if (isPanelMode()) {
      (window as any).NEOLIA_PANEL_MODE = true;
      return "panel";
    }

    const width = window.innerWidth;

    // 2) Flag global forcé (debug ou configuration manuelle)
    if ((window as any).NEOLIA_PANEL_MODE === true) {
      return "panel";
    }

    // 3) Fallback responsive
    if (width < 600) return "mobile";
    if (width < 1100) return "tablet";
    return "tablet";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const computeFromWidth = (): DisplayMode => {
      const width = window.innerWidth;
      if (width < 600) return "mobile";
      if (width < 1100) return "tablet";
      return "tablet";
    };

    const applyMode = () => {
      // 1) Environnement Panel natif (APK Android via Capacitor)
      if (isPanelMode()) {
        if ((window as any).NEOLIA_PANEL_MODE !== true) {
          (window as any).NEOLIA_PANEL_MODE = true;
        }
        setMode("panel");
        return;
      }

      // 2) Flag global forcé pour le debug (ex. dans la console du navigateur)
      if ((window as any).NEOLIA_PANEL_MODE === true) {
        setMode("panel");
        return;
      }

      // 3) Fallback responsive
      setMode(computeFromWidth());
    };

    // Application immédiate au montage
    applyMode();

    const onResize = () => {
      applyMode();
    };

    // On garde un interval pour détecter un éventuel changement
    // de NEOLIA_PANEL_MODE depuis la console ou un script externe.
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
