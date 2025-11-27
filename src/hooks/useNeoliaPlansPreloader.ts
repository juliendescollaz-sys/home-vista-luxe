import { useEffect, useRef } from "react";
import { useHAStore } from "@/store/useHAStore";

/**
 * Hook de préchargement des plans Neolia pour les modes TABLET et PANEL.
 * Doit être appelé une seule fois dans les layouts Tablet/Panel.
 * 
 * Déclenche le chargement des plans dès que :
 * - La connexion HA est établie
 * - Les floors sont disponibles
 * - Les plans ne sont pas déjà chargés/en cours de chargement
 */
export function useNeoliaPlansPreloader() {
  const connection = useHAStore((state) => state.connection);
  const floors = useHAStore((state) => state.floors);
  const isConnected = useHAStore((state) => state.isConnected);
  const neoliaFloorPlans = useHAStore((state) => state.neoliaFloorPlans);
  const isLoadingNeoliaPlans = useHAStore((state) => state.isLoadingNeoliaPlans);
  const loadNeoliaPlans = useHAStore((state) => state.loadNeoliaPlans);

  // Flag pour éviter les appels multiples
  const hasTriggeredLoad = useRef(false);

  useEffect(() => {
    // Conditions de préchargement
    const shouldLoad =
      isConnected &&
      connection &&
      floors.length > 0 &&
      neoliaFloorPlans.length === 0 &&
      !isLoadingNeoliaPlans &&
      !hasTriggeredLoad.current;

    if (shouldLoad) {
      hasTriggeredLoad.current = true;
      console.info("[Neolia Preloader] Démarrage du préchargement des plans", {
        floorsCount: floors.length,
      });
      loadNeoliaPlans(connection, floors);
    }
  }, [isConnected, connection, floors, neoliaFloorPlans.length, isLoadingNeoliaPlans, loadNeoliaPlans]);

  // Reset le flag si on se déconnecte (pour permettre un rechargement après reconnexion)
  useEffect(() => {
    if (!isConnected) {
      hasTriggeredLoad.current = false;
    }
  }, [isConnected]);
}
