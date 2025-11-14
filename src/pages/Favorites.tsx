import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { DeviceCard } from "@/components/DeviceCard";
import { MediaPlayerCard } from "@/components/MediaPlayerCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { callHAService } from "@/lib/haService";

const Favorites = () => {
  const entities = useHAStore((state) => state.entities);
  const favorites = useHAStore((state) => state.favorites);

  // Filtrer les entités favorites
  const favoriteEntities = entities?.filter(e => favorites.includes(e.entity_id)) || [];

  const handleDeviceToggle = async (entityId: string) => {
    const entity = entities?.find((e) => e.entity_id === entityId);
    if (!entity) return;

    const domain = entityId.split(".")[0];
    const isOn = entity.state === "on";
    const service = isOn ? "turn_off" : "turn_on";

    try {
      await callHAService(domain, service, { entity_id: entityId });
      toast.success(isOn ? "Éteint" : "Allumé");
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      toast.error("Erreur lors du contrôle de l'appareil");
    }
  };

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
