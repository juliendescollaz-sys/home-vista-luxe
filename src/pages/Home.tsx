import { useHAStore } from "@/store/useHAStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedWeatherTile } from "@/components/weather/AnimatedWeatherTile";
import { DeviceCard } from "@/components/DeviceCard";
import { MediaPlayerCard } from "@/components/MediaPlayerCard";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { Home as HomeIcon } from "lucide-react";

const Home = () => {
  const client = useHAStore((state) => state.client);
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const favorites = useHAStore((state) => state.favorites);
  const isConnected = useHAStore((state) => state.isConnected);
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-10";

  // Trouver les device_id des media_players pour filtrer leurs entités associées
  const mediaPlayerDeviceIds = new Set(
    entities
      ?.filter((entity) => entity.entity_id.startsWith("media_player."))
      .map((entity) => {
        const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
        return reg?.device_id;
      })
      .filter(Boolean) || []
  );

  // Appareils actifs uniquement (lumières, switches actifs + media_player en lecture)
  const activeDevices = entities?.filter(e => {
    const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
    const deviceId = reg?.device_id;
    
    if (deviceId && mediaPlayerDeviceIds.has(deviceId) && !e.entity_id.startsWith("media_player.")) {
      return false;
    }

    if (e.entity_id.startsWith("light.") || e.entity_id.startsWith("switch.")) {
      return e.state === "on";
    }
    if (e.entity_id.startsWith("media_player.")) {
      return e.state === "playing";
    }
    return false;
  }) || [];

  // Grouper les appareils actifs par pièce/étage
  const groupedDevices = useMemo(() => {
    const groups: Record<string, { area: typeof areas[0] | null; floor: typeof floors[0] | null; devices: typeof activeDevices }> = {};
    
    activeDevices.forEach(device => {
      // Chercher l'area depuis l'entityRegistry ou directement depuis l'entité
      const reg = entityRegistry.find(r => r.entity_id === device.entity_id);
      let areaId = reg?.area_id;
      
      // Si pas trouvé dans le registry, chercher dans les attributs de l'entité
      if (!areaId && device.attributes?.area_id) {
        areaId = device.attributes.area_id;
      }
      
      // Utiliser "no_area" seulement si vraiment aucune area n'est trouvée
      const groupKey = areaId || "no_area";
      
      if (!groups[groupKey]) {
        const area = areaId ? areas.find(a => a.area_id === areaId) || null : null;
        const floor = area?.floor_id ? floors.find(f => f.floor_id === area.floor_id) || null : null;
        groups[groupKey] = { area, floor, devices: [] };
      }
      
      groups[groupKey].devices.push(device);
    });
    
    return Object.entries(groups).sort(([, a], [, b]) => {
      // Trier par étage puis par pièce
      const floorA = a.floor?.level ?? 999;
      const floorB = b.floor?.level ?? 999;
      if (floorA !== floorB) return floorA - floorB;
      return (a.area?.name || "Sans pièce").localeCompare(b.area?.name || "Sans pièce");
    });
  }, [activeDevices, areas, floors, entityRegistry]);

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
      toast.success(isOn ? "Éteint" : "Allumé");
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      toast.error("Erreur lors du contrôle de l'appareil");
    }
  };

  if (!isConnected) {
    return (
      <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar title="Accueil" />
      
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* Section météo */}
        <div className="animate-fade-in">
          <AnimatedWeatherTile />
        </div>

        {/* Appareils actifs regroupés par pièce */}
        <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl font-semibold">Appareils actifs</h2>
          
          {groupedDevices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun appareil actif
            </p>
          ) : (
            groupedDevices.map(([areaId, { area, floor, devices }]) => (
              <div key={areaId} className="space-y-3">
                {/* En-tête de groupe avec étage et pièce */}
                <div className="flex items-center gap-2">
                  <HomeIcon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-baseline gap-2">
                    {floor && (
                      <span className="text-sm text-muted-foreground">
                        {floor.name}
                      </span>
                    )}
                    <span className="text-base font-medium">
                      {area?.name || "Sans pièce"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({devices.length})
                    </span>
                  </div>
                </div>

                {/* Appareils de la pièce */}
                <div className="space-y-3">
                  {devices.map((entity) => {
                    if (entity.entity_id.startsWith("media_player.")) {
                      return (
                        <MediaPlayerCard
                          key={entity.entity_id}
                          entity={entity}
                        />
                      );
                    }
                    return (
                      <DeviceCard
                        key={entity.entity_id}
                        entity={entity}
                        onToggle={handleDeviceToggle}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
