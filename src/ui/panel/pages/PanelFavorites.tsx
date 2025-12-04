/**
 * Page Favoris pour le mode PANEL
 * Copie complète de la version Tablet (src/pages/Favorites.tsx)
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
      <div className="w-full flex flex-col items-stretch">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-stretch">
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
