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

function isNativeAndroidCapacitor(): boolean {
  try {
    return Capacitor.getPlatform() === "android" && typeof (window as any).Capacitor !== "undefined";
  } catch {
    return false;
  }
}

/**
 * ✅ Source de vérité: Capacitor.getConfig() si disponible
 * Fallback: tenter un fetch du capacitor.config.json via plusieurs URLs probables.
 */
async function getRuntimeTarget(): Promise<RuntimeTarget> {
  // 1) Capacitor.getConfig() (le plus fiable)
  try {
    const anyCap = Capacitor as any;
    if (typeof anyCap.getConfig === "function") {
      const cfg = anyCap.getConfig();
      const target = String(cfg?.appTarget || cfg?.APP_TARGET || "").toLowerCase();
      if (target === "panel") return "panel";
      if (target === "mobile") return "mobile";
    }
  } catch {
    // ignore
  }

  // 2) Fallback fetch (certaines WebViews ne servent pas /capacitor.config.json de la même façon)
  const candidates = [
    "/capacitor.config.json",
    "capacitor.config.json",
    "http://localhost/capacitor.config.json",
    "http://localhost/assets/capacitor.config.json",
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      const target = String(json?.appTarget || json?.APP_TARGET || "").toLowerCase();
      if (target === "panel") return "panel";
      if (target === "mobile") return "mobile";
    } catch {
      // try next
    }
  }

  return "unknown";
}

export function useDisplayMode(): { displayMode: DisplayMode } {
  const [mode, setMode] = useState<DisplayMode>(() => {
    if (typeof window === "undefined") return "mobile";
    if ((window as any).NEOLIA_PANEL_MODE === true) return "panel";
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

      // Sur Android Capacitor: décider via target runtime
      if (isNativeAndroidCapacitor()) {
        const target = await getRuntimeTarget();
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

    const onResize = () => apply();
    const interval = window.setInterval(() => apply(), 1000);

    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return { displayMode: mode };
}
