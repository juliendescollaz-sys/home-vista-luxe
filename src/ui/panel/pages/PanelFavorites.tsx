/**
 * Page Favoris pour le mode PANEL
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 */
import { useHAStore } from "@/store/useHAStore";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";

export function PanelFavorites() {
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const devices = useHAStore((state) => state.devices);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const isConnected = useHAStore((state) => state.isConnected);

  if (!isConnected) {
    return (
      <div className="w-full h-full bg-background p-4">
        <h1 className="text-2xl font-semibold mb-6">Favoris</h1>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background p-4 overflow-y-auto">
      <h1 className="text-2xl font-semibold mb-6">Favoris</h1>
      
      <HomeOverviewByTypeAndArea
        entities={entities || []}
        areas={areas}
        floors={floors}
        entityRegistry={entityRegistry}
        devices={devices}
        contextId="panel-favorites"
        filterFavorites={true}
      />
    </div>
  );
}
