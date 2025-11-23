import { useHAStore } from "@/store/useHAStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedWeatherTile } from "@/components/weather/AnimatedWeatherTile";
import { UniversalEntityTileWrapper } from "@/components/UniversalEntityTileWrapper";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { Home as HomeIcon } from "lucide-react";

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
      const reg = entityRegistry.find(r => r.entity_id === device.entity_id);
      let areaId = reg?.area_id;

      // Si pas d'area_id direct, récupérer l'area via le device
      if (!areaId && reg?.device_id) {
        const dev = devices.find(d => d.id === reg.device_id);
        if (dev?.area_id) {
          areaId = dev.area_id;
        }
      }
      
      // Si toujours rien, tenter les attributs de l'entité
      if (!areaId && (device as any).attributes?.area_id) {
        areaId = (device as any).attributes.area_id;
      }
      
      const groupKey = areaId || "no_area";
      
      if (!groups[groupKey]) {
        const area = areaId ? areas.find(a => a.area_id === areaId) || null : null;
        const floor = area?.floor_id ? floors.find(f => f.floor_id === area.floor_id) || null : null;
        groups[groupKey] = { area, floor, devices: [] };
      }
      
      groups[groupKey].devices.push(device);
    });
    
    return Object.entries(groups).sort(([, a], [, b]) => {
      const floorA = a.floor?.level ?? 999;
      const floorB = b.floor?.level ?? 999;
      if (floorA !== floorB) return floorA - floorB;
      return (a.area?.name || "Sans pièce").localeCompare(b.area?.name || "Sans pièce");
    });
  }, [activeDevices, areas, floors, devices, entityRegistry]);

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

  const rootClassName = displayMode === "mobile" 
    ? `min-h-screen bg-background pb-24 ${ptClass}`
    : "w-full flex flex-col items-stretch";

  if (!isConnected) {
    return (
      <div className={rootClassName}>
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  // Grille 3 colonnes en Panel/Tablet
  const contentClass = displayMode === "mobile"
    ? "max-w-2xl mx-auto px-4 py-4 space-y-6"
    : "grid grid-cols-3 gap-4 p-4";

  return (
    <div className={rootClassName}>
      <TopBar title="Accueil" />
      
      <div className={contentClass}>
        {displayMode === "mobile" ? (
          <>
            {/* Version Mobile - Layout vertical */}
            <div className="animate-fade-in">
              <AnimatedWeatherTile />
            </div>

            <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-xl font-semibold">Appareils actifs</h2>
              
              {groupedDevices.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun appareil actif
                </p>
              ) : (
                groupedDevices.flatMap(([areaId, { area, floor, devices }]) =>
                  devices.map((entity) => (
                    <UniversalEntityTileWrapper
                      key={entity.entity_id}
                      entity={entity}
                      floor={floor}
                      area={area}
                    />
                  ))
                )
              )}
            </div>
          </>
        ) : (
          <>
            {/* Version Panel/Tablet - Grille 3 colonnes */}
            {/* Tuile météo - 1 colonne */}
            <div className="animate-fade-in">
              <AnimatedWeatherTile />
            </div>

            {/* Appareils actifs - grille 3 colonnes complète */}
            {groupedDevices.length === 0 ? (
              <div className="col-span-2 flex items-center justify-center">
                <p className="text-muted-foreground text-center py-8">
                  Aucun appareil actif
                </p>
              </div>
            ) : (
              groupedDevices.flatMap(([areaId, { area, floor, devices }]) =>
                devices.map((entity) => (
                  <UniversalEntityTileWrapper
                    key={entity.entity_id}
                    entity={entity}
                    floor={floor}
                    area={area}
                  />
                ))
              )
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
