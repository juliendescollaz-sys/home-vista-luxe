import { useHAStore } from "@/store/useHAStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedWeatherTile } from "@/components/weather/AnimatedWeatherTile";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableCoverEntityTile } from "@/components/entities/SortableCoverEntityTile";
import { MediaPlayerCard } from "@/components/MediaPlayerCard";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { isControllableEntity, isEntityActive } from "@/lib/entityUtils";
const Home = () => {
  const client = useHAStore((state) => state.client);
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const devices = useHAStore((state) => state.devices);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const favorites = useHAStore((state) => state.favorites);
  const isConnected = useHAStore((state) => state.isConnected);
  const { displayMode } = useDisplayMode();
  const contentPaddingTop = displayMode === "mobile" ? "pt-[138px]" : "pt-[24px]";

  // Trouver les device_id des media_players pour filtrer leurs entités associées
  const mediaPlayerDeviceIds = new Set(
    entities
      ?.filter((entity) => entity.entity_id.startsWith("media_player."))
      .map((entity) => {
        const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
        return reg?.device_id;
      })
      .filter(Boolean) || [],
  );

  // Appareils actifs uniquement - utilise le filtre centralisé isControllableEntity
  const activeDevices = useMemo(() => {
    if (!entities || entities.length === 0) return [];

    return entities.filter((e) => {
      const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
      const deviceId = reg?.device_id;

      // Filtre centralisé : entités contrôlables (inclut whitelist ZWA2, exclut mesures/états)
      if (!isControllableEntity(e, reg)) return false;

      // Exclure les entités "techniques" liées aux media_players
      if (deviceId && mediaPlayerDeviceIds.has(deviceId)) {
        if (!e.entity_id.startsWith("media_player.")) {
          return false;
        }
      }

      // Vérifier si l'entité est active
      return isEntityActive(e);
    });
  }, [entities, entityRegistry, mediaPlayerDeviceIds]);

  // Enrichir les appareils actifs avec leurs infos de pièce/étage
  const enrichedActiveDevices = useMemo(() => {
    return activeDevices.map((device) => {
      const reg = entityRegistry.find((r) => r.entity_id === device.entity_id);
      let areaId = reg?.area_id;

      if (!areaId && reg?.device_id) {
        const dev = devices.find((d) => d.id === reg.device_id);
        if (dev?.area_id) {
          areaId = dev.area_id;
        }
      }

      const area = areaId ? areas.find((a) => a.area_id === areaId) || null : null;
      const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) || null : null;

      return { entity: device, area, floor };
    });
  }, [activeDevices, areas, floors, devices, entityRegistry]);

  // Handler de toggle simple (comme Maison/Favoris)
  const handleDeviceToggle = async (entityId: string) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }

    const entity = entities?.find((e) => e.entity_id === entityId);
    if (!entity) return;

    const domain = entityId.split(".")[0];
    const isOn = entity.state === "on";
    const service = isOn ? "turn_off" : "turn_on";

    try {
      await client.callService(domain, service, {}, { entity_id: entityId });
    } catch (error) {
      console.error("[Neolia Accueil] Erreur toggle", error);
      toast.error("Erreur lors du contrôle");
    }
  };

  useEffect(() => {
    if (!isConnected) {
      toast.error("Connexion à Home Assistant perdue");
    }
  }, [isConnected]);

  const rootClassName = displayMode === "mobile" ? "min-h-screen bg-background pb-20" : "min-h-screen bg-background";

  if (!client || !entities || entities.length === 0) {
    return (
      <div className={rootClassName}>
        <TopBar title="Accueil" />
        <div className={`w-full ${displayMode === "mobile" ? "px-[26px]" : "px-4"} pb-[26px] ${contentPaddingTop} space-y-4`}>
          <Skeleton className="h-56 w-full rounded-3xl" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <TopBar title="Accueil" />

      <div className={`w-full ${displayMode === "mobile" ? "px-[26px]" : "px-4"} pb-[26px] ${contentPaddingTop} space-y-6`}>
        {/* Section météo */}
        <div className="animate-fade-in">
          <AnimatedWeatherTile />
        </div>

        {/* Appareils actifs */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-xl font-semibold">Appareils actifs</h2>

          {enrichedActiveDevices.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <p className="text-muted-foreground">Aucun appareil actif</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrichedActiveDevices.map(({ entity, area, floor }) => {
                const isMediaPlayer = entity.entity_id.startsWith("media_player.");
                const isCover = entity.entity_id.startsWith("cover.");
                
                if (isMediaPlayer) {
                  return <MediaPlayerCard key={entity.entity_id} entity={entity} floor={floor} area={area} />;
                }
                
                if (isCover) {
                  return (
                    <SortableCoverEntityTile
                      key={entity.entity_id}
                      entity={entity}
                      floor={floor}
                      area={area}
                    />
                  );
                }
                
                return (
                  <SortableDeviceCard
                    key={entity.entity_id}
                    entity={entity}
                    onToggle={handleDeviceToggle}
                    floor={floor}
                    area={area}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
