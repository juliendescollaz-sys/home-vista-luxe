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
} from "@dnd-kit/sortable";

const Favorites = () => {
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
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
      const floorA = a.floor?.level ?? 999;
      const floorB = b.floor?.level ?? 999;
      if (floorA !== floorB) return floorA - floorB;
      return (a.area?.name || "Sans pièce").localeCompare(b.area?.name || "Sans pièce");
    });
  }, [sortedEntities, areas, floors, entityRegistry]);

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
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {groupedFavorites.map(([areaId, { area, floor, devices }]) => (
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

                    {/* Appareils de la pièce avec drag & drop */}
                    <div className="space-y-3">
                      {devices.map((entity) => {
                        if (entity.entity_id.startsWith("media_player.")) {
                          return (
                            <SortableMediaPlayerCard
                              key={entity.entity_id}
                              entity={entity}
                            />
                          );
                        }
                        return (
                          <SortableDeviceCard
                            key={entity.entity_id}
                            entity={entity}
                            onToggle={handleDeviceToggle}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
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
