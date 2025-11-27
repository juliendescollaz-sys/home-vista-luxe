import { useMemo, useState, useEffect, useCallback } from "react";
import { useHAStore } from "@/store/useHAStore";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { DeviceEntitiesDrawer } from "@/components/DeviceEntitiesDrawer";
import { getGridClasses } from "@/lib/gridLayout";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { toast } from "sonner";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
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
  
  // State for device details drawer
  const [detailsEntity, setDetailsEntity] = useState<HAEntity | null>(null);
  
  // Lazy init from localStorage to avoid flash
  const [deviceOrder, setDeviceOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`neolia_sidebar_devices_order_${areaId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sensors with long press for touch and distance for pointer
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 400,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 400,
        tolerance: 8,
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

  // Filtrer les entités de cette pièce (sans tri custom)
  const baseRoomEntities = useMemo(() => {
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
    return filterPrimaryControlEntities(areaFiltered, entityRegistry, devices);
  }, [entities, entityRegistry, devices, areaId]);

  // Appliquer l'ordre custom - une seule liste plate
  const roomEntities = useMemo(() => {
    if (!enableDragAndDrop || deviceOrder.length === 0) {
      return baseRoomEntities;
    }

    // Créer une map pour accès rapide
    const entityMap = new Map(baseRoomEntities.map(e => [e.entity_id, e]));
    const ordered: HAEntity[] = [];
    
    // Ajouter les entités dans l'ordre sauvegardé
    deviceOrder.forEach(id => {
      const e = entityMap.get(id);
      if (e) {
        ordered.push(e);
        entityMap.delete(id);
      }
    });
    
    // Ajouter les nouvelles entités à la fin
    entityMap.forEach(e => ordered.push(e));
    
    return ordered;
  }, [baseRoomEntities, enableDragAndDrop, deviceOrder]);

  // Synchroniser deviceOrder quand les entités changent
  useEffect(() => {
    if (!enableDragAndDrop || baseRoomEntities.length === 0) return;
    
    const currentIds = baseRoomEntities.map(e => e.entity_id);
    const currentSet = new Set(currentIds);
    
    // Nettoyer les IDs qui n'existent plus et ajouter les nouveaux
    const cleanedOrder = deviceOrder.filter(id => currentSet.has(id));
    const newIds = currentIds.filter(id => !deviceOrder.includes(id));
    
    const updatedOrder = [...cleanedOrder, ...newIds];
    
    // Seulement mettre à jour si différent
    if (updatedOrder.length !== deviceOrder.length || 
        !updatedOrder.every((id, i) => deviceOrder[i] === id)) {
      setDeviceOrder(updatedOrder);
    }
  }, [baseRoomEntities, enableDragAndDrop]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save device order to localStorage
  useEffect(() => {
    if (enableDragAndDrop && deviceOrder.length > 0) {
      localStorage.setItem(`neolia_sidebar_devices_order_${areaId}`, JSON.stringify(deviceOrder));
    }
  }, [deviceOrder, areaId, enableDragAndDrop]);

  const handleDeviceToggle = useCallback(async (entityId: string) => {
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
  }, [client, entities]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    // Utiliser roomEntities directement pour les indices (liste affichée)
    const currentIds = roomEntities.map(e => e.entity_id);
    const oldIndex = currentIds.indexOf(active.id as string);
    const newIndex = currentIds.indexOf(over.id as string);
    
    if (oldIndex === -1 || newIndex === -1) {
      console.warn("[Neolia] DnD: index non trouvé", { active: active.id, over: over.id, currentIds });
      return;
    }
    
    const newOrder = arrayMove(currentIds, oldIndex, newIndex);
    console.log("[Neolia] DnD réordonné", { oldIndex, newIndex, newOrder });
    setDeviceOrder(newOrder);
  }, [roomEntities]);

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

        const area = entityAreaId ? areas.find((a) => a.area_id === entityAreaId) || null : null;
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
            onOpenDetails={(e) => setDetailsEntity(e)}
          />
        );
      })}
    </>
  );

  const drawerElement = detailsEntity && entities ? (
    <DeviceEntitiesDrawer
      primaryEntity={detailsEntity}
      entities={entities}
      entityRegistry={entityRegistry}
      devices={devices}
      onClose={() => setDetailsEntity(null)}
    />
  ) : null;

  // Items pour SortableContext = exactement les IDs affichés, dans l'ordre
  const sortableItems = roomEntities.map((e) => e.entity_id);

  if (enableDragAndDrop) {
    return (
      <>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableItems}
            strategy={verticalListSortingStrategy}
          >
            <div className={singleColumn ? `grid grid-cols-1 gap-4 ${className}` : `${getGridClasses("devices", displayMode)} ${className}`}>
              {renderDeviceCards()}
            </div>
          </SortableContext>
        </DndContext>
        {drawerElement}
      </>
    );
  }

  return (
    <>
      <div className={singleColumn ? `grid grid-cols-1 gap-4 ${className}` : `${getGridClasses("devices", displayMode)} ${className}`}>
        {renderDeviceCards()}
      </div>
      {drawerElement}
    </>
  );
};
