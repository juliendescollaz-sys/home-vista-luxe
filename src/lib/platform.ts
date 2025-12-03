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
 * Mode "Panel" :
 *
 * ⚠️ TEMPORAIREMENT DÉSACTIVÉ
 * On force false pour que l'app utilise le même chemin de connexion
 * que sur PC (connectNeoliaMqttStandard + UI classique),
 * même lorsqu'elle tourne dans l'APK panel Android.
 *
 * Dès que l'on aura validé que la connexion MQTT fonctionne bien
 * sur le panel avec ce mode "standard", on pourra réactiver
 * la logique native Android en remettant:
 *
 *   return isNativeAndroid();
 */
export function isPanelMode(): boolean {
  return false;
  // return isNativeAndroid(); // à réactiver plus tard
}
