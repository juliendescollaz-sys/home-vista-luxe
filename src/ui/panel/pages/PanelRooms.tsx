/**
 * Page Maison pour le mode PANEL
 * Utilise le même composant que le mode Tablet (MaisonTabletPanelView)
 */
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { MaisonTabletPanelView } from "@/pages/Rooms";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";

export function PanelRooms() {
  const connection = useHAStore((state) => state.connection);
  const floors = useHAStore((state) => state.floors);
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);
  const neoliaFloorPlans = useHAStore((state) => state.neoliaFloorPlans);
  const isLoadingNeoliaPlans = useHAStore((state) => state.isLoadingNeoliaPlans);
  const loadNeoliaPlans = useHAStore((state) => state.loadNeoliaPlans);

  // État "HA initialisé" pour éviter le flash
  const isHAInitialized = !!connection && floors.length > 0;

  // Vérifier si au moins un plan est complet (PNG + JSON)
  const hasUsablePlans = neoliaFloorPlans.some((plan) => plan.hasPng && plan.hasJson);

  // Charger les plans Neolia au démarrage (identique à Tablet)
  useEffect(() => {
    if (
      isHAInitialized &&
      !isLoadingNeoliaPlans &&
      neoliaFloorPlans.length === 0
    ) {
      console.info("[PanelRooms] Chargement initial des plans Neolia");
      loadNeoliaPlans(connection, floors);
    }
  }, [
    isHAInitialized,
    isLoadingNeoliaPlans,
    neoliaFloorPlans.length,
    loadNeoliaPlans,
    connection,
    floors,
  ]);

  // Spinner pendant toute l'init (HA + plans)
  const shouldShowSpinner =
    !isHAInitialized ||
    isLoadingNeoliaPlans ||
    neoliaFloorPlans.length === 0;

  if (shouldShowSpinner) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="w-full px-4 pt-[24px] flex-1">
          <div className="flex items-center justify-center w-full h-full min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback si aucun plan utilisable
  if (!hasUsablePlans) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="w-full px-4 pt-[24px]">
          <HomeOverviewByTypeAndArea
            entities={entities || []}
            areas={areas}
            floors={floors}
            entityRegistry={entityRegistry}
            devices={devices}
            contextId="panel-rooms-fallback"
            filterFavorites={false}
          />
        </div>
      </div>
    );
  }

  // Affichage des plans Neolia (même composant que Tablet)
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="w-full px-4 pt-[24px] flex-1 flex flex-col overflow-hidden">
        <MaisonTabletPanelView />
      </div>
    </div>
  );
}
