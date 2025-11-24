import { useHAStore } from "@/store/useHAStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedWeatherTile } from "@/components/weather/AnimatedWeatherTile";
import { UniversalEntityTile } from "@/components/entities/UniversalEntityTile";
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
      .filter(Boolean) || [],
  );

  // Appareils actifs uniquement (lumières, switches actifs + media_player en lecture)
  const activeDevices =
    entities?.filter((e) => {
      const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
      const deviceId = reg?.device_id;

      const domain = e.entity_id.split(".")[0];

      if (!["light", "switch", "media_player", "cover", "climate", "fan"].includes(domain)) {
        return false;
      }

      // Exclure les entités "techniques" liées aux media_players (groupes, volumes, etc.)
      if (deviceId && mediaPlayerDeviceIds.has(deviceId)) {
        // On garde seulement l'entité principale media_player.*
        if (!e.entity_id.startsWith("media_player.")) {
          return false;
        }
      }

      // logiques d'état "actif"
      if (domain === "light" || domain === "switch" || domain === "fan") {
        return e.state === "on";
      }
      if (domain === "cover") {
        return e.state !== "closed";
      }
      if (domain === "climate") {
        return e.state !== "off";
      }
      if (domain === "media_player") {
        return e.state === "playing";
      }

      return false;
    }) || [];

  // Grouper les appareils actifs par pièce/étage
  const groupedDevices = useMemo(() => {
    const groups: Record<
      string,
      { area: (typeof areas)[0] | null; floor: (typeof floors)[0] | null; devices: typeof activeDevices }
    > = {};

    activeDevices.forEach((device) => {
      const reg = entityRegistry.find((r) => r.entity_id === device.entity_id);
      let areaId = reg?.area_id;

      // Si pas d'area_id direct, récupérer l'area via le device
      if (!areaId && reg?.device_id) {
        const dev = devices.find((d) => d.id === reg.device_id);
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
        const area = areaId ? areas.find((a) => a.area_id === areaId) || null : null;

        // Trouver l'étage associé à cette area
        const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) || null : null;

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
        <div className="max-w-2xl mx-auto px-[26px] py-[26px] space-y-4">
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

      <div className="max-w-2xl mx-auto px-[26px] py-[26px] space-y-6">
        {/* Section météo */}
        <div className="animate-fade-in">
          <AnimatedWeatherTile />
        </div>

        {/* Appareils actifs */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-xl font-semibold">Appareils actifs</h2>

          {groupedDevices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun appareil actif</p>
          ) : (
            groupedDevices.flatMap(([areaId, { area, floor, devices }]) =>
              devices.map((entity) => (
                <UniversalEntityTile key={entity.entity_id} entity={entity} floor={floor} area={area} />
              )),
            )
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
