import { Capacitor } from "@capacitor/core";

/**
 * Détecte si l'application tourne dans une WebView Capacitor
 * sur un appareil Android natif (ex : Panel S563 en APK).
 */
export function isNativeAndroid(): boolean {
  try {
    const platform = Capacitor.getPlatform();
    return platform === "android" && typeof (window as any).Capacitor !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Mode Panel activé :
 * L'application fonctionne en mode Panel lorsqu'elle tourne
 * dans un runtime Android natif (APK via Capacitor).
 */
export function isPanelMode(): boolean {
  return isNativeAndroid();
}
