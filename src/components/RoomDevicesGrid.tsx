import { useMemo } from "react";
import { useHAStore } from "@/store/useHAStore";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { getGridClasses } from "@/lib/gridLayout";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { toast } from "sonner";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface RoomDevicesGridProps {
  areaId: string;
  className?: string;
  singleColumn?: boolean;
}

export const RoomDevicesGrid = ({ areaId, className = "", singleColumn = false }: RoomDevicesGridProps) => {
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const client = useHAStore((state) => state.client);
  const { displayMode } = useDisplayMode();

  // Filtrer les entités de cette pièce
  const roomEntities = useMemo(() => {
    if (!entities) return [];
    
    return entities.filter((entity) => {
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      let entityAreaId = reg?.area_id;

      if (!entityAreaId && reg?.device_id) {
        const dev = devices.find((d) => d.id === reg.device_id);
        if (dev?.area_id) {
          entityAreaId = dev.area_id;
        }
      }

      if (!entityAreaId && (entity as any).attributes?.area_id) {
        entityAreaId = (entity as any).attributes.area_id as string;
      }

      return entityAreaId === areaId;
    });
  }, [entities, entityRegistry, devices, areaId]);

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

  if (roomEntities.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        Aucun appareil dans cette pièce.
      </p>
    );
  }

  return (
    <div className={singleColumn ? `grid grid-cols-1 gap-4 ${className}` : `${getGridClasses("devices", displayMode)} ${className}`}>
      {roomEntities.map((entity) => {
        const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
        let areaId = reg?.area_id;

        if (!areaId && reg?.device_id) {
          const dev = devices.find((d) => d.id === reg.device_id);
          if (dev?.area_id) {
            areaId = dev.area_id;
          }
        }

        if (!areaId && (entity as any).attributes?.area_id) {
          areaId = (entity as any).attributes.area_id as string;
        }

        const area = areaId ? areas.find((a) => a.area_id === areaId) || null : null;
        const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) || null : null;

        if (entity.entity_id.startsWith("media_player.")) {
          return (
            <SortableMediaPlayerCard
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
  );
};
