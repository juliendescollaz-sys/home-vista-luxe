import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";

const Favorites = () => {
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const devices = useHAStore((state) => state.devices);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const isConnected = useHAStore((state) => state.isConnected);
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-32" : "pt-[24px]";

  const rootClassName = displayMode === "mobile" 
    ? `min-h-screen bg-background pb-24 ${ptClass}`
    : "w-full flex flex-col items-stretch";

  if (!isConnected) {
    return (
      <div className={rootClassName}>
        <TopBar title="Favoris" />
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <TopBar title="Favoris" />
      
      <HomeOverviewByTypeAndArea
        entities={entities || []}
        areas={areas}
        floors={floors}
        entityRegistry={entityRegistry}
        devices={devices}
        contextId="favorites"
        filterFavorites={true}
      />

      <BottomNav />
    </div>
  );
};

export default Favorites;
