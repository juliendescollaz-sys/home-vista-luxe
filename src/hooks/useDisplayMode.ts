import { useEffect, useState } from "react";

export type DisplayMode = "mobile" | "tablet" | "panel";

/**
 * Détermine le mode d'affichage :
 * Priorité :
 * 1) Override manuel window.NEOLIA_PANEL_MODE === true
 * 2) Mode de build Vite (import.meta.env.MODE === "panel")
 * 3) Fallback responsive (largeur)
 *
 * IMPORTANT :
 * - Le mode PANEL doit être déterminé par le build (mode Vite),
 *   pas par une détection runtime (Capacitor), trop instable sur certains panels.
 */
export function useDisplayMode(): { displayMode: DisplayMode } {
  const isPanelBuild = (): boolean => {
    // Vite garantit cette valeur : "panel" quand tu fais `vite build --mode panel`
    return (import.meta as any)?.env?.MODE === "panel";
  };

  const computeFromWidth = (): DisplayMode => {
    const width = window.innerWidth;
    if (width < 600) return "mobile";
    if (width < 1100) return "tablet";
    return "tablet";
  };

  const shouldUsePanel = (): boolean => {
    if ((window as any).NEOLIA_PANEL_MODE === true) return true;
    if (isPanelBuild()) return true;
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
