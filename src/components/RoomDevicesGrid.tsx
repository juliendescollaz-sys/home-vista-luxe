import { useMemo, useState, useEffect } from "react";
import { useHAStore } from "@/store/useHAStore";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { DeviceEntitiesDrawer } from "@/components/DeviceEntitiesDrawer";
import { getGridClasses } from "@/lib/gridLayout";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { toast } from "sonner";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { filterPrimaryControlEntities } from "@/lib/entityUtils";

interface RoomDevicesGridProps {
  areaId: string;
  className?: string;
  singleColumn?: boolean;
  enableDragAndDrop?: boolean;
}

export const RoomDevicesGrid = ({ areaId, className = "", singleColumn = false, enableDragAndDrop = false }: RoomDevicesGridProps) => {
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const client = useHAStore((state) => state.client);
  const { displayMode } = useDisplayMode();
  
  // Lazy init from localStorage to avoid flash
  const [deviceOrder, setDeviceOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`neolia_sidebar_devices_order_${areaId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedEntityForDetails, setSelectedEntityForDetails] = useState<HAEntity | null>(null);

  // Long press sensor (500ms)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 5,
      },
    })
  );

  // Reload order when areaId changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`neolia_sidebar_devices_order_${areaId}`);
      setDeviceOrder(saved ? JSON.parse(saved) : []);
    } catch {
      setDeviceOrder([]);
    }
  }, [areaId]);

  // Save device order to localStorage
  useEffect(() => {
    if (deviceOrder.length > 0) {
      localStorage.setItem(`neolia_sidebar_devices_order_${areaId}`, JSON.stringify(deviceOrder));
    }
  }, [deviceOrder, areaId]);

  // Filtrer les entités de cette pièce
  const roomEntities = useMemo(() => {
    if (!entities) return [];
    
    // D'abord filtrer par zone
    const areaFiltered = entities.filter((entity) => {
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

    // Ensuite appliquer le filtre des entités de contrôle principales
    const filtered = filterPrimaryControlEntities(areaFiltered, entityRegistry, devices);

    // Apply ordering if drag and drop is enabled
    if (enableDragAndDrop && deviceOrder.length > 0) {
      const entityMap = new Map(filtered.map(e => [e.entity_id, e]));
      const ordered: typeof filtered = [];
      deviceOrder.forEach(id => {
        const e = entityMap.get(id);
        if (e) ordered.push(e);
        entityMap.delete(id);
      });
      entityMap.forEach(e => ordered.push(e));
      return ordered;
    }

    return filtered;
  }, [entities, entityRegistry, devices, areaId, enableDragAndDrop, deviceOrder]);

  // Initialize device order if not set
  useEffect(() => {
    if (enableDragAndDrop && deviceOrder.length === 0 && roomEntities.length > 0) {
      setDeviceOrder(roomEntities.map(e => e.entity_id));
    }
  }, [enableDragAndDrop, roomEntities, deviceOrder.length]);

  const handleDeviceToggle = async (entityId: string) => {
    console.info("[Neolia Maison] onToggle appelé (RoomDevicesGrid)", { entityId });
    
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
      console.error("[Neolia Maison] Erreur lors du contrôle:", error);
      toast.error("Erreur lors du contrôle de l'appareil");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over || active.id === over.id) return;
    
    setDeviceOrder((items) => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  if (roomEntities.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        Aucun appareil dans cette pièce.
      </p>
    );
  }

  const renderDeviceCards = () => (
    <>
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
              onOpenDetails={(e) => setSelectedEntityForDetails(e)}
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
            onOpenDetails={(e) => setSelectedEntityForDetails(e)}
          />
        );
      })}
    </>
  );

  if (enableDragAndDrop) {
    return (
      <>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveDragId(e.active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={roomEntities.map((e) => e.entity_id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={singleColumn ? `grid grid-cols-1 gap-4 ${className}` : `${getGridClasses("devices", displayMode)} ${className}`}>
              {renderDeviceCards()}
            </div>
          </SortableContext>
        </DndContext>
        
        {selectedEntityForDetails && entities && (
          <DeviceEntitiesDrawer
            primaryEntity={selectedEntityForDetails}
            entities={entities}
            entityRegistry={entityRegistry}
            devices={devices}
            onClose={() => setSelectedEntityForDetails(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className={singleColumn ? `grid grid-cols-1 gap-4 ${className}` : `${getGridClasses("devices", displayMode)} ${className}`}>
        {renderDeviceCards()}
      </div>
      
      {selectedEntityForDetails && entities && (
        <DeviceEntitiesDrawer
          primaryEntity={selectedEntityForDetails}
          entities={entities}
          entityRegistry={entityRegistry}
          devices={devices}
          onClose={() => setSelectedEntityForDetails(null)}
        />
      )}
    </>
  );
};
