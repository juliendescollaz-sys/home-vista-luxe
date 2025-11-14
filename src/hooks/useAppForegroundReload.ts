import { useEffect, useRef } from "react";

export function useAppForegroundReload() {
  const hasMountedRef = useRef(false);
  const lastReloadRef = useRef(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // On ignore la toute première fois (montage initial de l'app)
        if (!hasMountedRef.current) {
          hasMountedRef.current = true;
          return;
        }

        const now = Date.now();
        // Anti-boucle : pas plus d'un reload toutes les 5 secondes
        if (now - lastReloadRef.current > 5000) {
          lastReloadRef.current = now;
          console.log("🔁 App revenue au premier plan, rechargement complet...");
          window.location.reload();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
