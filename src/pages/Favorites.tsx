import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { Home as HomeIcon } from "lucide-react";
import { getGridClasses } from "@/lib/gridLayout";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

const Favorites = () => {
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const devices = useHAStore((state) => state.devices);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const favorites = useHAStore((state) => state.favorites);
  const isConnected = useHAStore((state) => state.isConnected);
  const entityOrder = useHAStore((state) => state.entityOrder);
  const setEntityOrder = useHAStore((state) => state.setEntityOrder);
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-10";

  const contextId = "favorites";
  
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filtrer les entités favorites
  const favoriteEntities = entities?.filter(e => favorites.includes(e.entity_id)) || [];

  // Initialiser l'ordre si nécessaire
  useEffect(() => {
    if (favoriteEntities.length > 0 && (!entityOrder[contextId] || entityOrder[contextId].length === 0)) {
      setEntityOrder(contextId, favoriteEntities.map(e => e.entity_id));
    }
  }, [favoriteEntities.length, entityOrder, contextId, setEntityOrder]);

  // Trier les entités selon l'ordre personnalisé
  const sortedEntities = useMemo(() => {
    if (!entityOrder[contextId] || entityOrder[contextId].length === 0) return favoriteEntities;
    
    const orderMap = new Map(entityOrder[contextId].map((id, index) => [id, index]));
    return [...favoriteEntities].sort((a, b) => {
      const orderA = orderMap.get(a.entity_id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.entity_id) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [favoriteEntities, entityOrder, contextId]);

  // Grouper les favoris par pièce/étage
  const groupedFavorites = useMemo(() => {
    const groups: Record<string, { area: typeof areas[0] | null; floor: typeof floors[0] | null; devices: typeof sortedEntities }> = {};
    
    sortedEntities.forEach(device => {
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
  }, [sortedEntities, areas, floors, devices, entityRegistry]);

  const client = useHAStore((state) => state.client);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedEntities.findIndex((e) => e.entity_id === active.id);
      const newIndex = sortedEntities.findIndex((e) => e.entity_id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedEntities, oldIndex, newIndex);
        setEntityOrder(contextId, newOrder.map(e => e.entity_id));
      }
    }

    setActiveId(null);
  };

  const activeEntity = sortedEntities.find((e) => e.entity_id === activeId);

  if (!isConnected) {
    return (
      <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
        <TopBar title="Favoris" />
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar title="Favoris" />
      
      <div className="max-w-2xl mx-auto px-4 py-4">
        {favoriteEntities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun favori
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedEntities.map(e => e.entity_id)}
              strategy={rectSortingStrategy}
            >
              <div className={getGridClasses("devices", displayMode)}>
                {sortedEntities.map((entity) => {
                  const reg = entityRegistry.find(r => r.entity_id === entity.entity_id);
                  let areaId = reg?.area_id;

                  if (!areaId && reg?.device_id) {
                    const dev = devices.find(d => d.id === reg.device_id);
                    if (dev?.area_id) {
                      areaId = dev.area_id;
                    }
                  }

                  if (!areaId && (entity as any).attributes?.area_id) {
                    areaId = (entity as any).attributes.area_id as string;
                  }

                  const area = areaId ? areas.find(a => a.area_id === areaId) || null : null;
                  const floor = area?.floor_id ? floors.find(f => f.floor_id === area.floor_id) || null : null;

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
            </SortableContext>
            
            <DragOverlay dropAnimation={null}>
              {activeEntity ? (
                <div className="opacity-90 rotate-3 scale-105">
                  {activeEntity.entity_id.startsWith("media_player.") ? (
                    <SortableMediaPlayerCard entity={activeEntity} />
                  ) : (
                    <SortableDeviceCard
                      entity={activeEntity}
                      onToggle={() => {}}
                    />
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Favorites;
