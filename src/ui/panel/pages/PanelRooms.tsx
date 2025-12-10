// src/ui/panel/pages/PanelRooms.tsx

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHAStore } from "@/store/useHAStore";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";
import { MaisonTabletPanelView } from "@/pages/Rooms";

/**
 * Page "Maison" pour le mode PANEL
 * Logique alignée sur la branche Tablet de Rooms.tsx
 * mais sans TopBar / BottomNav (gérés par PanelRootLayout).
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

  // Layout Panel: marges uniformes sur les 4 côtés (24px)
  const rootClassName = "w-full h-full flex flex-col overflow-hidden";
  const isHAInitialized = !!connection && floors.length > 0;

  // On considère qu'on a des plans utilisables dès qu'on en a au moins 1
  const hasUsablePlans = neoliaFloorPlans.length > 0;

  // Charger les plans au démarrage (au cas où le preloader n'a pas encore déclenché)
  useEffect(() => {
    if (
      isHAInitialized &&
      !isLoadingNeoliaPlans &&
      neoliaFloorPlans.length === 0
    ) {
      console.info(
        "[Neolia PANEL] Chargement initial des plans (fallback du preloader)"
      );
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

  const shouldShowPlansSpinner =
    !isHAInitialized || isLoadingNeoliaPlans || neoliaFloorPlans.length === 0;

  return (
    <div className={rootClassName}>
      {/* Conteneur avec marges uniformes (24px) sur les 4 côtés */}
      <div className="w-full h-full p-6 overflow-hidden">
        {shouldShowPlansSpinner ? (
          <div className="flex items-center justify-center w-full h-full min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Chargement des plans...
              </p>
            </div>
          </div>
        ) : hasUsablePlans ? (
          <div className="w-full h-full">
            <MaisonTabletPanelView />
          </div>
        ) : (
          <HomeOverviewByTypeAndArea
            entities={entities || []}
            areas={areas}
            floors={floors}
            entityRegistry={entityRegistry}
            devices={devices}
            contextId="home-overview"
            filterFavorites={false}
          />
        )}
      </div>
    </div>
  );
}

export default PanelRooms;
