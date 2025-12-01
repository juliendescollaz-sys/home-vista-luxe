import { Capacitor } from "@capacitor/core";

/**
 * Détecte si l'application tourne en mode Panel (APK natif Capacitor sur Android)
 * vs PWA/navigateur web.
 * 
 * Panel = APK natif Capacitor sur Android
 * PWA tablette = plateforme "web"
 */
export function isPanelMode(): boolean {
  try {
    const platform = Capacitor.getPlatform();
    return platform === "android" && !!(window as any).Capacitor;
  } catch {
    return false;
  }
}
