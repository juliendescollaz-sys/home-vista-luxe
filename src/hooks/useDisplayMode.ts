import { useEffect, useState } from "react";
import { isPanelMode } from "@/lib/platform";

export type DisplayMode = "mobile" | "tablet" | "panel";

/**
 * Hook central pour déterminer le mode d'affichage :
 * - "panel" : UNIQUEMENT si build "panel" (flag env) + runtime natif, OU flag global forcé
 * - "tablet" / "mobile" : en fonction de la largeur de l'écran
 *
 * Priorité :
 * 1) Flag global window.NEOLIA_PANEL_MODE === true (debug/override)
 * 2) Build "panel" explicite + runtime natif panel (Capacitor)
 * 3) Fallback responsive sur la largeur de l'écran
 *
 * IMPORTANT :
 * - On NE doit PAS basculer en "panel" juste parce que l'app tourne sur Android,
 *   sinon un téléphone Android (Samsung) se retrouve en UI panel.
 */
export function useDisplayMode(): { displayMode: DisplayMode } {
  const getIsPanelBuild = (): boolean => {
    // Vite: import.meta.env.* est défini au build.
    // Mets VITE_NEOLIA_APP_TARGET=panel dans l'APK "panel",
    // et VITE_NEOLIA_APP_TARGET=mobile (ou rien) dans l'APK mobile.
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

    // 2) Panel uniquement si on est sur une build "panel" + runtime natif
    if (getIsPanelBuild() && isPanelMode()) return true;

    return false;
  };

  const [mode, setMode] = useState<DisplayMode>(() => {
    if (typeof window === "undefined") return "mobile";

    if (shouldUsePanel()) return "panel";

    return computeFromWidth();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyMode = () => {
      if (shouldUsePanel()) {
        setMode("panel");
        return;
      }
      setMode(computeFromWidth());
    };

    applyMode();

    const onResize = () => applyMode();

    // Si tu veux garder la possibilité de basculer via console:
    // window.NEOLIA_PANEL_MODE = true/false
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
