import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { useHomeProjectStore } from "@/store/useHomeProjectStore";
import { WelcomeScreen } from "@/components/home-setup/WelcomeScreen";
import { HomeSetupWizard } from "@/components/home-setup/HomeSetupWizard";
import { Home, ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { SortableRoomCard } from "@/components/SortableRoomCard";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { SortableUniversalEntityTile } from "@/components/SortableUniversalEntityTile";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { ViewSelector, ViewMode } from "@/components/ViewSelector";
import { HAFloor, HAArea, HAEntity } from "@/types/homeassistant";
import { Button } from "@/components/ui/button";
import { FloorSection } from "@/components/rooms/FloorSection";
import { FloorCard } from "@/components/FloorCard";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";

type RoomViewMode = ViewMode;

interface GroupedDevices {
  area: HAArea | null;
  floor: HAFloor | null;
  devices: HAEntity[];
}

const Rooms = () => {
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const devices = useHAStore((state) => state.devices);
  const client = useHAStore((state) => state.client);
  const areaPhotos = useHAStore((state) => state.areaPhotos);
  const areaOrder = useHAStore((state) => state.areaOrder);
  const setAreaPhoto = useHAStore((state) => state.setAreaPhoto);
  const setAreaOrder = useHAStore((state) => state.setAreaOrder);
  const { displayMode } = useDisplayMode();

  const { project, isSetupComplete } = useHomeProjectStore();
  const [viewMode, setViewMode] = useState<RoomViewMode>(() => {
    // Restaurer la vue depuis sessionStorage
    const savedView = sessionStorage.getItem("rooms-view-mode") as RoomViewMode | null;
    // Par défaut, on évite la vue "Étages" tant qu'on ne sait pas si des plans existent
    if (savedView && savedView !== "floors") {
      return savedView;
    }
    return "rooms";
  });
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deviceOrder, setDeviceOrder] = useState<string[]>([]);
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-10";

  // Vérifier si au moins un étage dispose d'un plan (placeholder pour la future intégration des floorplans HA)
  const hasFloorplans = useMemo(() => {
    return floors.some((floor: any) =>
      Boolean((floor as any).floorplanUrl || (floor as any).floorplan_url || (floor as any).metadata?.floorplanUrl),
    );
  }, [floors]);

  // Vérifier si le setup est nécessaire
  const needsSetup = !project || !isSetupComplete;

  // Sauvegarder la vue dans sessionStorage
  useEffect(() => {
    sessionStorage.setItem("rooms-view-mode", viewMode);
  }, [viewMode]);

  // Réinitialiser la sélection d'étage quand on change de vue
  useEffect(() => {
    if (viewMode !== "floors") {
      setSelectedFloor(null);
    }
  }, [viewMode]);

  // Si aucun plan d'étage disponible, forcer la vue sur "Pièces"
  useEffect(() => {
    if (!hasFloorplans && viewMode === "floors") {
      setViewMode("rooms");
    }
  }, [hasFloorplans, viewMode]);

  const entityRegistry = useHAStore((state) => state.entityRegistry);

  // Trouver les device_id des media_players pour filtrer leurs entités associées
  const mediaPlayerDeviceIds = useMemo(() => {
    return new Set(
      entities
        .filter((entity) => entity.entity_id.startsWith("media_player."))
        .map((entity) => {
          const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
          return reg?.device_id;
        })
        .filter(Boolean),
    );
  }, [entities, entityRegistry]);

  // Filtrer les entités contrôlables (pas les capteurs passifs)
  // Exclure les contrôles associés aux media_players Sonos
  const controllableEntities = useMemo(() => {
    return entities.filter((entity) => {
      const domain = entity.entity_id.split(".")[0];

      // Vérifier si c'est une entité contrôlable
      if (!["light", "switch", "media_player", "cover", "climate", "fan"].includes(domain)) {
        return false;
      }

      // Si c'est un media_player, toujours l'inclure
      if (domain === "media_player") return true;

      // Exclure les entités techniques associées aux media_players Sonos
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      const deviceId = reg?.device_id;

      if (deviceId && mediaPlayerDeviceIds.has(deviceId)) {
        // Garder uniquement l'entité principale du media_player
        return false;
      }

      return true;
    });
  }, [entities, entityRegistry, mediaPlayerDeviceIds]);

  // Appliquer l'ordre personnalisé aux entités
  const orderedControllableEntities = useMemo(() => {
    if (!deviceOrder || deviceOrder.length === 0) {
      return controllableEntities;
    }

    const entityMap = new Map(controllableEntities.map((entity) => [entity.entity_id, entity]));

    const ordered = deviceOrder
      .map((id) => entityMap.get(id))
      .filter((entity): entity is HAEntity => entity !== undefined);

    const remaining = controllableEntities.filter((entity) => !deviceOrder.includes(entity.entity_id));

    return [...ordered, ...remaining];
  }, [controllableEntities, deviceOrder]);

  // Regrouper les entités par pièce/étage
  const groupedDevices = useMemo(() => {
    const groups: Record<string, GroupedDevices> = {};

    orderedControllableEntities.forEach((device) => {
      const reg = entityRegistry.find((r) => r.entity_id === device.entity_id);
      let areaId = reg?.area_id;

      if (!areaId && reg?.device_id) {
        const dev = devices.find((d) => d.id === reg.device_id);
        if (dev?.area_id) {
          areaId = dev.area_id;
        }
      }

      if (!areaId && (device as any).attributes?.area_id) {
        areaId = (device as any).attributes.area_id as string;
      }

      const area = areaId ? areas.find((a) => a.area_id === areaId) || null : null;
      const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) || null : null;

      const groupKey = areaId || "no_area";

      if (!groups[groupKey]) {
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
  }, [orderedControllableEntities, areas, floors, devices, entityRegistry]);

  const getEntityLocation = (entity: HAEntity) => {
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

    return { area, floor };
  };

  // Initialiser l'ordre des pièces si nécessaire
  useEffect(() => {
    if (areas.length > 0 && areaOrder.length === 0) {
      setAreaOrder(areas.map((a) => a.area_id));
    }
  }, [areas, areaOrder.length, setAreaOrder]);

  // Initialiser l'ordre des appareils si nécessaire
  useEffect(() => {
    if (controllableEntities.length > 0 && deviceOrder.length === 0) {
      setDeviceOrder(controllableEntities.map((e) => e.entity_id));
    }
  }, [controllableEntities, deviceOrder.length]);

  const rootClassName = displayMode === "mobile" ? "min-h-screen bg-background pb-20" : "min-h-screen bg-background";

  const handleDeviceToggle = async (entityId: string) => {
    if (!client) return;

    const entity = entities.find((e) => e.entity_id === entityId);
    if (!entity) return;

    const domain = entityId.split(".")[0];
    const isOn = entity.state === "on";
    const service = isOn ? "turn_off" : "turn_on";

    try {
      await client.callService(domain, service, {}, { entity_id: entityId });
      toast.success(isOn ? "Éteint" : "Allumé");
    } catch (error) {
      console.error("Error toggling device:", error);
      toast.error("Erreur lors de la commande");
    }
  };

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
    }),
  );

  // Initialiser l'ordre si nécessaire
  useEffect(() => {
    if (areas.length > 0 && areaOrder.length === 0) {
      setAreaOrder(areas.map((a) => a.area_id));
    }
  }, [areas, areaOrder.length, setAreaOrder]);

  const orderedAreas = useMemo(() => {
    if (!areaOrder || areaOrder.length === 0) {
      return areas;
    }

    const areaMap = new Map(areas.map((area) => [area.area_id, area]));
    const ordered = areaOrder.map((id) => areaMap.get(id)).filter((area): area is HAArea => area !== undefined);
    const remaining = areas.filter((area) => !areaOrder.includes(area.area_id));

    return [...ordered, ...remaining];
  }, [areas, areaOrder]);

  const handlePhotoChange = async (areaId: string, file: File) => {
    try {
      const compressedDataUrl = await compressImage(file);
      setAreaPhoto(areaId, compressedDataUrl);

      // Debug taille du localStorage
      setTimeout(() => {
        const stored = localStorage.getItem("ha-storage");
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("📸 AreaPhotos keys:", Object.keys(parsed.state?.areaPhotos || {}));
        }
      }, 100);
    } catch (error) {
      console.error("❌ Error compressing image:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    if (viewMode === "rooms") {
      setAreaOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    if (viewMode === "devices") {
      setDeviceOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const activeArea = viewMode === "rooms" ? orderedAreas.find((area) => area.area_id === activeId) || null : null;

  const activeDevice = viewMode === "devices" ? entities.find((e) => e.entity_id === activeId) || null : null;

  // Écran d’onboarding (si projet non configuré)
  if (needsSetup) {
    return (
      <div className={rootClassName}>
        <TopBar title="Maison" />
        {!project ? <WelcomeScreen /> : <HomeSetupWizard />}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <TopBar title="Maison" />
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        {/* Sélecteur de vue */}
        <div className="mb-4">
          <ViewSelector selectedView={viewMode} onViewChange={setViewMode} hideFloors={!hasFloorplans} />
        </div>

        {areas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune pièce configurée</p>
            <p className="text-sm text-muted-foreground mt-2">
              Configurez d'abord votre maison dans Home Assistant, puis revenez ici pour organiser vos pièces et
              appareils.
            </p>
          </div>
        ) : (
          <>
            {/* Vue Étages */}
            {viewMode === "floors" && hasFloorplans && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {floors.map((floor) => (
                    <FloorCard
                      key={floor.floor_id}
                      floor={floor}
                      isSelected={selectedFloor === floor.floor_id}
                      onSelect={() => setSelectedFloor(selectedFloor === floor.floor_id ? null : floor.floor_id)}
                    />
                  ))}
                </div>

                <FloorSection
                  floors={floors}
                  areas={areas}
                  entities={entities}
                  devices={devices}
                  entityRegistry={entityRegistry}
                  selectedFloor={selectedFloor}
                />
              </div>
            )}

            {/* Vue Pièces (regroupées par étage) */}
            {viewMode === "rooms" && (
              <div className="space-y-6">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={orderedAreas.map((a) => a.area_id)} strategy={verticalListSortingStrategy}>
                    {orderedAreas.map((area) => (
                      <SortableRoomCard
                        key={area.area_id}
                        areaId={area.area_id}
                        name={area.name}
                        deviceCount={getDeviceCount(area.area_id)}
                        customPhoto={areaPhotos[area.area_id]}
                        onPhotoChange={(file) => handlePhotoChange(area.area_id, file)}
                        displayMode={displayMode}
                      />
                    ))}
                  </SortableContext>

                  <DragOverlay dropAnimation={null}>
                    {activeArea ? (
                      <div className="opacity-90 rotate-3 scale-105">
                        <SortableRoomCard
                          areaId={activeArea.area_id}
                          name={activeArea.name}
                          deviceCount={getDeviceCount(activeArea.area_id)}
                          customPhoto={areaPhotos[activeArea.area_id]}
                          onPhotoChange={() => {}}
                          displayMode={displayMode}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            )}

            {/* Vue Appareils */}
            {viewMode === "devices" && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedControllableEntities.map((e) => e.entity_id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {orderedControllableEntities.map((entity) => {
                      const { area, floor } = getEntityLocation(entity);
                      return (
                        <SortableUniversalEntityTile key={entity.entity_id} entity={entity} floor={floor} area={area} />
                      );
                    })}
                  </div>
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                  {activeDevice ? (
                    <div className="opacity-90 rotate-1 scale-105">
                      <SortableUniversalEntityTile entity={activeDevice} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Rooms;
