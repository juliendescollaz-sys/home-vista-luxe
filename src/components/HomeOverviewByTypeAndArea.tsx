import { useMemo, useState } from "react";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { SortableGroupTile } from "@/components/groups/SortableGroupTile";
import { GroupTile } from "@/components/groups/GroupTile";
import { DeviceEntitiesDrawer } from "@/components/DeviceEntitiesDrawer";
import { getGridClasses } from "@/lib/gridLayout";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { FavoritesViewSelector, FavoritesViewMode } from "@/components/FavoritesViewSelector";
import { getEntityDomain, filterPrimaryControlEntities } from "@/lib/entityUtils";
import { toast } from "sonner";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import type { HAEntity, HAArea, HAFloor, HADevice } from "@/types/homeassistant";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";

type HomeOverviewByTypeAndAreaProps = {
  entities: HAEntity[];
  areas: HAArea[];
  floors: HAFloor[];
  entityRegistry: any[];
  devices: HADevice[];
  contextId?: string;
  filterFavorites?: boolean;
};

export function HomeOverviewByTypeAndArea({
  entities,
  areas,
  floors,
  entityRegistry,
  devices,
  contextId = "home-overview",
  filterFavorites = false,
}: HomeOverviewByTypeAndAreaProps) {
  const { displayMode } = useDisplayMode();
  const client = useHAStore((state) => state.client);
  const favorites = useHAStore((state) => state.favorites);
  const entityOrder = useHAStore((state) => state.entityOrder);
  const setEntityOrder = useHAStore((state) => state.setEntityOrder);
  const groups = useGroupStore((state) => state.groups);
  const groupFavorites = useGroupStore((state) => state.groupFavorites);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<FavoritesViewMode>("type");
  const [detailsEntity, setDetailsEntity] = useState<HAEntity | null>(null);

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

  // Filtrer les entités : d'abord par favoris si nécessaire, puis par entités de contrôle principales
  const baseFilteredEntities = filterFavorites
    ? entities.filter((e) => favorites.includes(e.entity_id))
    : entities;
  
  // Appliquer le filtre des entités de contrôle principales
  const filteredEntities = filterPrimaryControlEntities(baseFilteredEntities, entityRegistry, devices);
  
  const filteredGroups = filterFavorites
    ? groups.filter((g) => groupFavorites.includes(g.id))
    : groups;

  // Créer un tableau unifié de tous les items (groupes + entités)
  const allItems = useMemo(() => {
    const groupItems = filteredGroups.map((g) => ({
      type: "group" as const,
      id: `group-${g.id}`,
      data: g,
    }));
    const entityItems = filteredEntities.map((e) => ({
      type: "entity" as const,
      id: e.entity_id,
      data: e,
    }));
    return [...groupItems, ...entityItems];
  }, [filteredGroups, filteredEntities]);

  // Trier tous les items selon l'ordre personnalisé unifié
  const sortedAllItems = useMemo(() => {
    if (!entityOrder[contextId] || entityOrder[contextId].length === 0) return allItems;

    const orderMap = new Map(entityOrder[contextId].map((id, index) => [id, index]));
    return [...allItems].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [allItems, entityOrder, contextId]);

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
        setEntityOrder(contextId, newOrder.map((item) => item.id));
      }
    }

    setActiveId(null);
  };

  const activeItem = sortedAllItems.find((item) => item.id === activeId);
  const activeEntity = activeItem?.type === "entity" ? activeItem.data : null;
  const activeGroup = activeItem?.type === "group" ? activeItem.data : null;

  // Grouper les items selon le mode de vue
  const groupedItems = useMemo(() => {
    if (viewMode === "type") {
      const groups: Record<string, typeof sortedAllItems> = {};

      sortedAllItems.forEach((item) => {
        if (item.type === "group") {
          if (!groups["Groupes"]) groups["Groupes"] = [];
          groups["Groupes"].push(item);
        } else {
          const domain = getEntityDomain(item.data.entity_id);
          const typeLabels: Record<string, string> = {
            light: "Éclairages",
            switch: "Interrupteurs",
            cover: "Volets",
            climate: "Climatisation",
            fan: "Ventilateurs",
            lock: "Serrures",
            media_player: "Lecteurs média",
            scene: "Scènes",
            script: "Scripts",
          };
          const label = typeLabels[domain] || "Autres";
          if (!groups[label]) groups[label] = [];
          groups[label].push(item);
        }
      });

      return groups;
    } else {
      // Mode location
      const groups: Record<string, typeof sortedAllItems> = {};

      sortedAllItems.forEach((item) => {
        if (item.type === "group") {
          if (!groups["Groupes"]) groups["Groupes"] = [];
          groups["Groupes"].push(item);
        } else {
          const entity = item.data;
          const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
          let areaId = reg?.area_id;

          if (!areaId && reg?.device_id) {
            const dev = devices.find((d) => d.id === reg.device_id);
            if (dev?.area_id) areaId = dev.area_id;
          }

          if (!areaId && (entity as any).attributes?.area_id) {
            areaId = (entity as any).attributes.area_id as string;
          }

          const area = areaId ? areas.find((a) => a.area_id === areaId) : null;
          const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) : null;

          let label = "Sans localisation";
          if (floor && area) {
            label = `${floor.name} - ${area.name}`;
          } else if (area) {
            label = area.name;
          }

          if (!groups[label]) groups[label] = [];
          groups[label].push(item);
        }
      });

      return groups;
    }
  }, [sortedAllItems, viewMode, entityRegistry, devices, areas, floors]);

  if (sortedAllItems.length === 0) {
    const emptyMessage = filterFavorites 
      ? "Vos appareils Favoris apparaîtront ici..." 
      : "Aucune entité disponible";
    
    return (
      <div className={displayMode === "mobile" ? "py-8 text-center" : "w-full h-full flex items-center justify-center"}>
        <div className="max-w-screen-xl mx-auto px-6 py-6 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={displayMode === "mobile" ? "max-w-2xl mx-auto px-4 py-4 space-y-6" : "px-4 pt-[24px] space-y-6"}>
      <FavoritesViewSelector selectedView={viewMode} onViewChange={setViewMode} />

      <div className="space-y-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortedAllItems.map((item) => item.id)} strategy={rectSortingStrategy}>
            {Object.entries(groupedItems).map(([groupName, items]) => (
              <div key={groupName} className="space-y-3">
                <h3 className={displayMode === "mobile" ? "text-lg font-semibold text-foreground px-1" : "text-2xl font-semibold text-foreground"}>
                  {groupName}
                </h3>
                <div className={getGridClasses("devices", displayMode)}>
                  {items.map((item) => {
                    if (item.type === "group") {
                      return <SortableGroupTile key={item.id} group={item.data} hideEditButton />;
                    }

                    const entity = item.data;
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
                        onOpenDetails={(e) => setDetailsEntity(e)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeGroup ? (
              <div className="opacity-90 rotate-3 scale-105">
                <GroupTile group={activeGroup} />
              </div>
            ) : activeEntity ? (
              <div className="opacity-90 rotate-3 scale-105">
                {activeEntity.entity_id.startsWith("media_player.") ? (
                  <SortableMediaPlayerCard entity={activeEntity} />
                ) : (
                  <SortableDeviceCard entity={activeEntity} onToggle={() => {}} />
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {detailsEntity && (
        <DeviceEntitiesDrawer
          primaryEntity={detailsEntity}
          entities={entities}
          entityRegistry={entityRegistry}
          devices={devices}
          onClose={() => setDetailsEntity(null)}
        />
      )}
    </div>
  );
}
