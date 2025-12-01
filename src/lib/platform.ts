import { Capacitor } from "@capacitor/core";

/**
 * Retourne true si l'application tourne dans une WebView Capacitor
 * sur Android (cas des panneaux type S563 / APK Panel).
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
 * Mode "Panel" = runtime natif Android via Capacitor.
 * Cette fonction est utilisée à la fois par l'onboarding et par le hook useDisplayMode.
 */
export function isPanelMode(): boolean {
  return isNativeAndroid();
}
