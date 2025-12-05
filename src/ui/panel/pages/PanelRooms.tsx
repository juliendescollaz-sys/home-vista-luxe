// src/ui/panel/pages/PanelRooms.tsx

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHAStore } from "@/store/useHAStore";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";
import { MaisonTabletPanelView } from "@/pages/Rooms";

/**
 * Page "Maison" pour le mode PANEL
 * Logique alignée sur la version Tablet (Rooms),
 * mais sans TopBar ni BottomNav (gérés par PanelRootLayout / PanelSidebar).
 */
export function PanelRooms() {
  const connection = useHAStore((state) => state.connection);
  const floors = useHAStore((state) => state.floors);
  const isLoadingNeoliaPlans = useHAStore((state) => state.isLoadingNeoliaPlans);
  const loadNeoliaPlans = useHAStore((state) => state.loadNeoliaPlans);
  const neoliaFloorPlans = useHAStore((state) => state.neoliaFloorPlans);
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);

  const rootClassName = "w-full h-full flex flex-col overflow-hidden";
  const ptClass = "pt-[24px]";

  // État "HA initialisé" pour éviter le flash de HomeOverviewByTypeAndArea
  const isHAInitialized = !!connection && floors.length > 0;

  // Vérifier si au moins un plan est complet (PNG + JSON)
  const hasUsablePlans = neoliaFloorPlans.some((plan) => plan.hasPng && plan.hasJson);

  // Timeout local pour éviter un spinner infini si quelque chose se passe mal
  const [loadTimeoutReached, setLoadTimeoutReached] = useState(false);

  // Charger les plans Neolia au démarrage (si possible)
  useEffect(() => {
    if (
      isHAInitialized &&
      !isLoadingNeoliaPlans &&
      neoliaFloorPlans.length === 0
    ) {
      console.info("[Neolia PANEL] Chargement initial des plans Neolia (Panel)");
      loadNeoliaPlans(connection!, floors);
    }
  }, [
    isHAInitialized,
    isLoadingNeoliaPlans,
    neoliaFloorPlans.length,
    loadNeoliaPlans,
    connection,
    floors,
  ]);

  // Timeout de sécurité : si ça “charge” trop longtemps, on arrête le spinner
  useEffect(() => {
    if (!isHAInitialized) {
      // Si HA n'est pas initialisé, on laisse le spinner (sinon la page serait vide)
      return;
    }

    if (isLoadingNeoliaPlans) {
      setLoadTimeoutReached(false);
      const timer = setTimeout(() => {
        console.warn("[Neolia PANEL] Timeout de chargement des plans atteint → arrêt du spinner");
        setLoadTimeoutReached(true);
      }, 8000); // 8 secondes de marge

      return () => clearTimeout(timer);
    } else {
      // Dès que le chargement est terminé, on reset le flag
      setLoadTimeoutReached(false);
    }
  }, [isHAInitialized, isLoadingNeoliaPlans]);

  // Spinner pendant l'init HA, ou pendant le chargement des plans
  // tant que le timeout n'est pas atteint
  const shouldShowPlansSpinner =
    !isHAInitialized || (isLoadingNeoliaPlans && !loadTimeoutReached);

  console.debug("[Neolia PANEL] State PanelRooms", {
    isHAInitialized,
    isLoadingNeoliaPlans,
    loadTimeoutReached,
    floorsCount: floors.length,
    plansCount: neoliaFloorPlans.length,
    hasUsablePlans,
  });

  return (
    <div className={rootClassName}>
      {/* Pas de TopBar ici : le titre "Maison" est géré par PanelSidebar via pageTitle */}
      <div className={cn("w-full px-4", ptClass)}>
        {shouldShowPlansSpinner ? (
          <div className="flex items-center justify-center w-full h-full min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Chargement des plans...
              </p>
            </div>
          </div>
        ) : !hasUsablePlans ? (
          <HomeOverviewByTypeAndArea
            entities={entities || []}
            areas={areas}
            floors={floors}
            entityRegistry={entityRegistry}
            devices={devices}
            contextId="home-overview"
            filterFavorites={false}
          />
        ) : (
          <MaisonTabletPanelView />
        )}
      </div>
    </div>
  );
}

export default PanelRooms;
