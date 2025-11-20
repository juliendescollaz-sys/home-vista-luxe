import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { SortableGroupTile } from "@/components/groups/SortableGroupTile";
import { GroupTile } from "@/components/groups/GroupTile";
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
  const groups = useGroupStore((state) => state.groups);
  const groupFavorites = useGroupStore((state) => state.groupFavorites);
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
        delay: 400,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filtrer les entités favorites et les groupes favoris
  const favoriteEntities = entities?.filter(e => favorites.includes(e.entity_id)) || [];
  const favoriteGroups = groups.filter(g => groupFavorites.includes(g.id));

  // Créer un tableau unifié de tous les items (groupes + entités)
  const allFavoriteItems = useMemo(() => {
    const groupItems = favoriteGroups.map(g => ({ type: 'group' as const, id: `group-${g.id}`, data: g }));
    const entityItems = favoriteEntities.map(e => ({ type: 'entity' as const, id: e.entity_id, data: e }));
    return [...groupItems, ...entityItems];
  }, [favoriteGroups, favoriteEntities]);

  // Initialiser l'ordre unifié si nécessaire
  useEffect(() => {
    const allIds = allFavoriteItems.map(item => item.id);
    if (allIds.length > 0 && (!entityOrder[contextId] || entityOrder[contextId].length === 0)) {
      setEntityOrder(contextId, allIds);
    }
  }, [allFavoriteItems.length, entityOrder, contextId, setEntityOrder]);

  // Trier tous les items selon l'ordre personnalisé unifié
  const sortedAllItems = useMemo(() => {
    if (!entityOrder[contextId] || entityOrder[contextId].length === 0) return allFavoriteItems;
    
    const orderMap = new Map(entityOrder[contextId].map((id, index) => [id, index]));
    return [...allFavoriteItems].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [allFavoriteItems, entityOrder, contextId]);


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
      const activeId = active.id as string;
      const overId = over.id as string;

      const oldIndex = sortedAllItems.findIndex((item) => item.id === activeId);
      const newIndex = sortedAllItems.findIndex((item) => item.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedAllItems, oldIndex, newIndex);
        setEntityOrder(contextId, newOrder.map(item => item.id));
      }
    }

    setActiveId(null);
  };

  const activeItem = sortedAllItems.find((item) => item.id === activeId);
  const activeEntity = activeItem?.type === 'entity' ? activeItem.data : null;
  const activeGroup = activeItem?.type === 'group' ? activeItem.data : null;

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
      
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        {sortedAllItems.length === 0 ? (
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
              items={sortedAllItems.map(item => item.id)}
              strategy={rectSortingStrategy}
            >
              <div className={getGridClasses("devices", displayMode)}>
                {sortedAllItems.map((item) => {
                  if (item.type === 'group') {
                    return (
                      <SortableGroupTile key={item.id} group={item.data} hideEditButton />
                    );
                  }

                  const entity = item.data;
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
              {activeGroup ? (
                <div className="opacity-90 rotate-3 scale-105">
                  <GroupTile group={activeGroup} showBadge />
                </div>
              ) : activeEntity ? (
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
