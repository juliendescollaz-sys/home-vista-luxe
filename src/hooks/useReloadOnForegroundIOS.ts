import { useEffect } from "react";

/**
 * Sur iOS uniquement :
 * - détecte le retour de l'app au premier plan (document.visibilityState === "visible"),
 * - force un reload complet de la page pour repartir d'un état propre,
 *   ce qui simule un "kill + relance" de l'app.
 *
 * On ne touche pas à HAClient, ni à useHAClient, ni au store.
 */
export function useReloadOnForegroundIOS() {
  useEffect(() => {
    if (typeof document === "undefined" || typeof navigator === "undefined" || typeof window === "undefined") {
      return;
    }

    const ua = navigator.userAgent || (navigator as any).vendor || (window as any).opera || "";
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as any).MSStream;

    // Si ce n'est pas iOS, on ne fait rien.
    if (!isIOS) {
      return;
    }

    let lastReload = 0;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      // Protection anti-boucle : ne pas recharger plusieurs fois dans un laps de temps très court.
      if (now - lastReload < 2000) {
        return;
      }
      lastReload = now;

      console.log("🔁 iOS : retour au premier plan, reload complet de l'application");
      window.location.reload();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
