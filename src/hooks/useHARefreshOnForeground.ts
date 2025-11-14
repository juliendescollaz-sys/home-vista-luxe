import { useEffect, useRef } from "react";
import { useHAStore } from "@/store/useHAStore";

/**
 * Hook global : à utiliser une seule fois dans l'app (dans le composant racine).
 * 
 * Son rôle :
 * - détecter quand l'app revient au premier plan (onglet redevenu visible),
 * - appeler client.getStates(),
 * - mettre à jour les entités dans le store.
 *
 * On ne touche pas à la logique de connexion, ni aux hooks existants.
 */
export function useHARefreshOnForeground() {
  const client = useHAStore((state) => state.client);
  const setEntities = useHAStore((state) => state.setEntities);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      // Anti-spam : pas plus d'un refresh toutes les 3 secondes
      if (now - lastRefreshRef.current < 3000) {
        return;
      }
      lastRefreshRef.current = now;

      if (!client || typeof client.getStates !== "function") {
        return;
      }

      try {
        const states = await client.getStates();
        setEntities(states);
      } catch (error) {
        console.error("Erreur lors du rafraîchissement des états HA au retour au premier plan :", error);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [client, setEntities]);
}
