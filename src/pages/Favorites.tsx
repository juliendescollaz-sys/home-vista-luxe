import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { DeviceCard } from "@/components/DeviceCard";
import { MediaPlayerCard } from "@/components/MediaPlayerCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const Favorites = () => {
  const entities = useHAStore((state) => state.entities);
  const favorites = useHAStore((state) => state.favorites);
  const isConnected = useHAStore((state) => state.isConnected);

  // Filtrer les entités favorites
  const favoriteEntities = entities?.filter(e => favorites.includes(e.entity_id)) || [];

  const handleDeviceToggle = (entityId: string) => {
    toast.info("Contrôle de l'appareil à venir");
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-20">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Favoris</h2>
        
        {favoriteEntities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun favori configuré
            <br />
            <span className="text-sm">Ajoutez des favoris en cliquant sur l'étoile des appareils</span>
          </p>
        ) : (
          <div className="space-y-3">
            {favoriteEntities.map((entity) => {
              const isMediaPlayer = entity.entity_id.startsWith("media_player.");
              return isMediaPlayer ? (
                <MediaPlayerCard
                  key={entity.entity_id}
                  entity={entity}
                />
              ) : (
                <DeviceCard
                  key={entity.entity_id}
                  entity={entity}
                  onToggle={handleDeviceToggle}
                />
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Favorites;
