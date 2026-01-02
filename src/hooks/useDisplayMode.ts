import { useEffect, useState } from "react";

export type DisplayMode = "mobile" | "tablet" | "panel";

function computeFromWidth(): DisplayMode {
  const width = window.innerWidth;
  if (width < 600) return "mobile";
  if (width < 1100) return "tablet";
  return "tablet";
}

function isNativeAndroid(): boolean {
  try {
    // Lazy import de Capacitor pour éviter les erreurs au chargement
    const Capacitor = (window as any).Capacitor;
    if (!Capacitor || typeof Capacitor.isNativePlatform !== "function") {
      return false;
    }
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

/**
 * ⚠️ IMPORTANT (Vite):
 * On doit accéder DIRECTEMENT à import.meta.env.MODE et import.meta.env.VITE_*
 * sinon Vite ne remplace pas les valeurs au build (et tu obtiens "unknown/undefined").
 */
const BUILD_MODE = import.meta.env.MODE; // ex: "panel" si build --mode panel
const APP_TARGET = import.meta.env.VITE_NEOLIA_APP_TARGET; // ex: "panel" si .env.panel le définit

function isPanelBuild(): boolean {
  return BUILD_MODE === "panel" || APP_TARGET === "panel";
}

export function useDisplayMode(): { displayMode: DisplayMode } {
  const shouldUsePanel = (): boolean => {
    // Override manuel debug
    if ((window as any).NEOLIA_PANEL_MODE === true) return true;

    // Panel = build panel + Android natif
    if (isPanelBuild() && isNativeAndroid()) return true;

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
    const interval = window.setInterval(() => applyMode(), 1000);

    window.addEventListener("resize", onResize);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return { displayMode: mode };
}
