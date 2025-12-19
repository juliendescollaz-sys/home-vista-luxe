import { Capacitor } from "@capacitor/core";

/**
 * Détecte si l'app tourne sur Android.
 * - Capacitor peut renvoyer "web" si l'injection native n'est pas dispo à ce moment-là,
 *   donc on garde un fallback UA.
 */
export function isAndroidDevice(): boolean {
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    return /Android/i.test(ua);
  } catch {
    return false;
  }
}

/**
 * Détecte si l'application tourne dans une WebView native Android (Capacitor ou équivalent).
 * On évite de dépendre de window.Capacitor (qui peut être absent/tardif sur certains panels).
 */
export function isNativeAndroid(): boolean {
  try {
    // 1) Source la plus fiable quand dispo
    const platform = Capacitor.getPlatform();
    if (platform === "android") return true;

    // 2) Fallback : panel Android (UA Android) + contexte "app" typique (localhost / file / capacitor)
    if (!isAndroidDevice()) return false;

    const proto = typeof window !== "undefined" ? window.location?.protocol : "";
    const host = typeof window !== "undefined" ? window.location?.hostname : "";

    // Sur Capacitor c'est souvent localhost (avec androidScheme http) ou capacitor://localhost
    if (proto === "capacitor:" || proto === "file:") return true;
    if (host === "localhost" || host === "127.0.0.1") return true;

    // Dernier fallback : Android + pas de contexte web classique (utile sur certains panels/kiosk)
    // (On reste prudent : le gate VITE_NEOLIA_APP_TARGET="panel" empêche l'APK mobile d'être impacté.)
    return true;
  } catch {
    return false;
  }
}

/**
 * Mode Panel activé :
 * L'application fonctionne en mode Panel lorsqu'elle tourne sur Android natif.
 * (Le gate de build VITE_NEOLIA_APP_TARGET="panel" est appliqué côté useDisplayMode.)
 */
export function isPanelMode(): boolean {
  return isNativeAndroid();
}
