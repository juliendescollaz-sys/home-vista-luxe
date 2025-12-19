import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export type DisplayMode = "mobile" | "tablet" | "panel";

type RuntimeTarget = "panel" | "mobile" | "unknown";

function computeFromWidth(): DisplayMode {
  const width = window.innerWidth;
  if (width < 600) return "mobile";
  if (width < 1100) return "tablet";
  return "tablet";
}

/**
 * Lit le capacitor.config.json runtime pour déterminer la cible d'app.
 * C'est fiable sur Android car ce fichier est embarqué dans l'APK.
 */
async function readRuntimeTarget(): Promise<RuntimeTarget> {
  try {
    // Sur Android Capacitor, on peut fetch le fichier de config embarqué.
    // Il est copié dans android/app/src/main/assets/capacitor.config.json
    const res = await fetch("/capacitor.config.json", { cache: "no-store" });
    if (!res.ok) return "unknown";
    const json = await res.json();
    const target = (json?.appTarget || json?.APP_TARGET || "").toString().toLowerCase();
    if (target === "panel") return "panel";
    if (target === "mobile") return "mobile";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function useDisplayMode(): { displayMode: DisplayMode } {
  const [mode, setMode] = useState<DisplayMode>(() => {
    if (typeof window === "undefined") return "mobile";

    // Override manuel (debug)
    if ((window as any).NEOLIA_PANEL_MODE === true) return "panel";

    // Première passe : responsive (on corrigera dès qu'on a lu la config runtime)
    return computeFromWidth();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const apply = async () => {
      // Override manuel (debug)
      if ((window as any).NEOLIA_PANEL_MODE === true) {
        setMode("panel");
        return;
      }

      // Si on est dans un runtime Capacitor Android, on lit la config runtime
      const isAndroid = Capacitor.getPlatform() === "android";
      const isCapacitor = typeof (window as any).Capacitor !== "undefined";

      if (isAndroid && isCapacitor) {
        const target = await readRuntimeTarget();
        if (cancelled) return;

        if (target === "panel") {
          setMode("panel");
          return;
        }
      }

      // Fallback responsive
      setMode(computeFromWidth());
    };

    apply();

    const onResize = () => {
      apply();
    };

    const interval = window.setInterval(() => {
      apply();
    }, 1000);

    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return { displayMode: mode };
}
