import { useEffect, useRef } from "react";

/**
 * Composant global pour stabiliser l'app PWA sur iOS
 * 
 * Détecte quand l'app revient au premier plan après une longue période
 * d'inactivité et force un reload pour garantir un état propre.
 * 
 * Ce composant doit être monté une seule fois dans l'AppShell/layout principal.
 * 
 * IMPORTANT: Respect strict des règles des hooks React
 * - Tous les hooks sont appelés inconditionnellement en haut du composant
 * - L'ordre des hooks est toujours identique entre les rendus
 */
export function IOSVisibilityGuard() {
  const lastHiddenTimeRef = useRef<number>(0);
  const hasReloadedRef = useRef<boolean>(false);

  useEffect(() => {
    // Détection iOS PWA standalone
    const isIOSPWA =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) &&
      (
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true
      );

    if (!isIOSPWA) {
      // Pas iOS PWA, rien à faire
      return;
    }

    const handleVisibilityChange = () => {
      const now = Date.now();

      if (document.visibilityState === "hidden") {
        // App passe en arrière-plan
        lastHiddenTimeRef.current = now;
        hasReloadedRef.current = false;
      } else if (document.visibilityState === "visible") {
        // App revient au premier plan
        const hiddenDuration = now - lastHiddenTimeRef.current;
        const twoMinutesInMs = 2 * 60 * 1000;

        // Si l'app était en arrière-plan depuis plus de 2 minutes
        // et qu'on n'a pas déjà reload durant cette session de visibilité
        if (hiddenDuration > twoMinutesInMs && !hasReloadedRef.current) {
          console.log("🔁 iOS PWA : retour après >2min, reload pour stabilité");
          hasReloadedRef.current = true;
          window.location.reload();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // Dépendances vides : setup une seule fois au mount

  // Composant invisible, aucun rendu
  return null;
}
