import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHAStore } from "@/store/useHAStore";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Grid3x3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RoomDevicesGrid } from "@/components/RoomDevicesGrid";
import { getEntityDomain } from "@/lib/entityUtils";
import { cn } from "@/lib/utils";
import { DraggableRoomLabel } from "@/components/DraggableRoomLabel";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter, DragOverlay } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";

// ============== MaisonTabletPanelView ==============
const MaisonTabletPanelView = () => {
  const connection = useHAStore((state) => state.connection);
  const floors = useHAStore((state) => state.floors);
  const areas = useHAStore((state) => state.areas);
  const neoliaFloorPlans = useHAStore((state) => state.neoliaFloorPlans);
  const selectedFloorId = useHAStore((state) => state.selectedFloorId);
  const selectedAreaId = useHAStore((state) => state.selectedAreaId);
  const setSelectedFloorId = useHAStore((state) => state.setSelectedFloorId);
  const setSelectedAreaId = useHAStore((state) => state.setSelectedAreaId);
  const labelPositions = useHAStore((state) => state.labelPositions);
  const setLabelPosition = useHAStore((state) => state.setLabelPosition);

  // Réinitialiser selectedAreaId quand on change d'étage
  useEffect(() => {
    setSelectedAreaId(null);
  }, [selectedFloorId, setSelectedAreaId]);

  const selectedPlan = useMemo(() => {
    const plan = neoliaFloorPlans.find((p) => p.floorId === selectedFloorId);
    if (plan) {
      console.debug("[Neolia] currentPlan", plan);
      console.debug("[Neolia] polygons pour l'étage sélectionné", plan.json?.polygons);
    }
    return plan;
  }, [neoliaFloorPlans, selectedFloorId]);

  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return areas.find((a) => a.area_id === selectedAreaId) || null;
  }, [selectedAreaId, areas]);

  if (!connection || floors.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">
            Aucun étage disponible. Vérifiez la configuration Home Assistant.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (neoliaFloorPlans.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-2xl">Plans Neolia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Impossible de charger les plans Neolia pour le moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculer le centroïde d'un polygon
  const getPolygonCenter = (relative: [number, number][]): { x: number; y: number } => {
    const sumX = relative.reduce((sum, [x]) => sum + x, 0);
    const sumY = relative.reduce((sum, [, y]) => sum + y, 0);
    return {
      x: sumX / relative.length,
      y: sumY / relative.length,
    };
  };

  return (
    <Card className="animate-fade-in flex flex-col h-full">
      <CardContent className="flex flex-col flex-1 pt-6 overflow-hidden">
        {/* Header : boutons d'étage + titre de la pièce */}
        <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
          {/* Boutons d'étage */}
          <div className="flex flex-wrap gap-2">
            {neoliaFloorPlans.map((plan) => {
              const isSelected = plan.floorId === selectedFloorId;
              const isIncomplete = !plan.hasPng || !plan.hasJson;

              return (
                <button
                  key={plan.floorId}
                  type="button"
                  onClick={() => setSelectedFloorId(plan.floorId)}
                  disabled={isIncomplete}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-all border relative",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : isIncomplete
                      ? "bg-muted text-muted-foreground border-border opacity-60 cursor-not-allowed"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  )}
                >
                  {plan.floorName}
                  {isIncomplete && (
                    <Badge
                      variant="destructive"
                      className="ml-2 text-xs"
                    >
                      Incomplet
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone principale : plan plein écran + sidebar slide-over */}
        <div className="relative flex-1 overflow-hidden">
          {/* Conteneur plan */}
          <div className="w-full h-full flex items-start justify-center">
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted/40 border border-border/40">
              {selectedPlan?.hasPng && selectedPlan?.imageUrl ? (
                <>
                  {/* Image du plan */}
                  <img
                    src={selectedPlan.imageUrl}
                    alt={`Plan de ${selectedPlan.floorName}`}
                    className="w-full h-full object-contain"
                  />

                  {/* Overlay des zones cliquables */}
                  {selectedPlan?.hasJson && selectedPlan?.json?.polygons ? (
                    (() => {
                      const polygons = selectedPlan.json.polygons;
                      const areasFromJson = selectedPlan.json.areas;

                      return (
                        <div className="absolute inset-0 z-30 pointer-events-none">
                          {polygons.map((polygon, index) => {
                            const points = polygon.relative ?? [];
                            if (points.length === 0) return null;

                            // centroïde (position de base)
                            let sumX = 0;
                            let sumY = 0;
                            points.forEach(([x, y]) => {
                              sumX += x;
                              sumY += y;
                            });
                            const baseX = sumX / points.length;
                            const baseY = sumY / points.length;

                            const area = areasFromJson.find(
                              (a) => a.areaId === polygon.areaId,
                            );
                            const roomName = area?.name ?? `Pièce ${index + 1}`;

                            const key = `${selectedPlan.floorId}:${polygon.areaId}`;
                            const overridePos = labelPositions[key];

                            return (
                              <DraggableRoomLabel
                                key={key}
                                floorId={selectedPlan.floorId}
                                areaId={polygon.areaId}
                                roomName={roomName}
                                baseX={baseX}
                                baseY={baseY}
                                overridePos={overridePos}
                                isSelected={selectedAreaId === polygon.areaId}
                                onPositionChange={(x, y) => {
                                  setLabelPosition(selectedPlan.floorId, polygon.areaId, x, y);
                                }}
                                onClickRoom={() => {
                                  setSelectedAreaId(polygon.areaId);
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="absolute inset-0 flex items-end justify-center pb-4 z-20">
                      <p className="text-xs text-muted-foreground bg-background/90 backdrop-blur px-3 py-1.5 rounded-full border border-border/60 shadow-sm">
                        {selectedPlan?.hasJson === false 
                          ? "Aucune zone définie pour ce plan (JSON manquant)"
                          : "Zones non configurées pour cet étage"}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground text-center px-4">
                    Plan non disponible pour cet étage (PNG manquant).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Overlay semi-transparent */}
          {selectedAreaId && (
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setSelectedAreaId(null)}
            />
          )}

          {/* Sidebar slide-over */}
          <div
            className={cn(
              "absolute top-0 right-0 h-full w-[380px] bg-background/95 backdrop-blur-xl border-l border-border shadow-xl z-50 flex flex-col transition-transform duration-300 ease-out",
              selectedAreaId ? "translate-x-0" : "translate-x-full"
            )}
          >
            {selectedArea && (
              <>
                <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                  <h2 className="font-semibold text-lg">
                    {selectedArea.name}
                  </h2>
                  <button
                    onClick={() => setSelectedAreaId(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Fermer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <RoomDevicesGrid areaId={selectedAreaId} singleColumn enableDragAndDrop />
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Sortable Item for Areas
const SortableAreaItem = ({ area, floor, deviceCount, onClick }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: area.area_id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <button
        type="button"
        onClick={onClick}
        className="w-full p-4 rounded-lg border border-border/50 bg-background text-left active:scale-[0.98] transition-transform"
      >
        <h3 className="font-medium">{area.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          {floor && <p className="text-sm text-muted-foreground">{floor.name}</p>}
          {deviceCount > 0 && (
            <>
              {floor && <span className="text-muted-foreground">•</span>}
              <p className="text-sm text-muted-foreground">{deviceCount} appareil{deviceCount > 1 ? 's' : ''}</p>
            </>
          )}
        </div>
      </button>
    </div>
  );
};

// Sortable Item for Types
const SortableTypeItem = ({ typeName, count, onClick }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: typeName });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <button
        type="button"
        onClick={onClick}
        className="w-full p-4 rounded-lg border border-border/50 bg-background text-left active:scale-[0.98] transition-transform"
      >
        <h3 className="font-medium">{typeName}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {count} appareil{count > 1 ? 's' : ''}
        </p>
      </button>
    </div>
  );
};

// ============== MaisonMobileView ==============
const MaisonMobileView = () => {
  const floors = useHAStore((state) => state.floors);
  const areas = useHAStore((state) => state.areas);
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);

  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(undefined);
  const [selectedTypeName, setSelectedTypeName] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"room" | "type">("room");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  // Order states
  const [areaOrder, setAreaOrder] = useState<string[]>([]);
  const [deviceOrderByArea, setDeviceOrderByArea] = useState<Record<string, string[]>>({});
  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [deviceOrderByType, setDeviceOrderByType] = useState<Record<string, string[]>>({});
  const [hasLoadedOrderFromStorage, setHasLoadedOrderFromStorage] = useState(false);

  // Long press sensor (500ms)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 5,
      },
    })
  );

  const { toggleEntity } = useOptimisticToggle();
  const pendingActions = useHAStore((state) => state.pendingActions);

  // Grouper les entités par type
  const entitiesByType = useMemo(() => {
    if (!entities) return {};
    const groups: Record<string, typeof entities> = {};

    entities.forEach((entity) => {
      const domain = getEntityDomain(entity.entity_id);
      const typeLabels: Record<string, string> = {
        light: "Éclairages",
        switch: "Interrupteurs",
        cover: "Volets",
        climate: "Climatisation",
        fan: "Ventilateurs",
        lock: "Serrures",
        media_player: "Lecteurs média",
        sensor: "Capteurs",
        binary_sensor: "Détecteurs",
      };
      const label = typeLabels[domain] || "Autres";
      if (!groups[label]) groups[label] = [];
      groups[label].push(entity);
    });

    return groups;
  }, [entities]);

  // Load orders from localStorage
  useEffect(() => {
    const savedAreaOrder = localStorage.getItem('neolia_mobile_area_order');
    const savedDeviceOrderByArea = localStorage.getItem('neolia_mobile_devices_order');
    const savedTypeOrder = localStorage.getItem('neolia_mobile_type_order');
    const savedDeviceOrderByType = localStorage.getItem('neolia_mobile_devices_by_type_order');
    
    if (savedAreaOrder) setAreaOrder(JSON.parse(savedAreaOrder));
    if (savedDeviceOrderByArea) setDeviceOrderByArea(JSON.parse(savedDeviceOrderByArea));
    if (savedTypeOrder) setTypeOrder(JSON.parse(savedTypeOrder));
    if (savedDeviceOrderByType) setDeviceOrderByType(JSON.parse(savedDeviceOrderByType));
    
    setHasLoadedOrderFromStorage(true);
  }, []);

  // Save orders to localStorage
  useEffect(() => {
    if (areaOrder.length > 0) {
      localStorage.setItem('neolia_mobile_area_order', JSON.stringify(areaOrder));
    }
  }, [areaOrder]);

  useEffect(() => {
    if (Object.keys(deviceOrderByArea).length > 0) {
      localStorage.setItem('neolia_mobile_devices_order', JSON.stringify(deviceOrderByArea));
    }
  }, [deviceOrderByArea]);

  useEffect(() => {
    if (typeOrder.length > 0) {
      localStorage.setItem('neolia_mobile_type_order', JSON.stringify(typeOrder));
    }
  }, [typeOrder]);

  useEffect(() => {
    if (Object.keys(deviceOrderByType).length > 0) {
      localStorage.setItem('neolia_mobile_devices_by_type_order', JSON.stringify(deviceOrderByType));
    }
  }, [deviceOrderByType]);

  // Initialize area order if not set
  useEffect(() => {
    if (!hasLoadedOrderFromStorage) return;
    if (areaOrder.length === 0 && areas.length > 0) {
      setAreaOrder(areas.map(a => a.area_id));
    }
  }, [areas, areaOrder.length, hasLoadedOrderFromStorage]);

  // Initialize type order if not set
  useEffect(() => {
    if (!hasLoadedOrderFromStorage) return;
    const typeNames = Object.keys(entitiesByType);
    if (typeOrder.length === 0 && typeNames.length > 0) {
      setTypeOrder(typeNames);
    }
  }, [entitiesByType, typeOrder.length, hasLoadedOrderFromStorage]);

  // Initialize device orders for area if not set
  useEffect(() => {
    if (selectedAreaId && !deviceOrderByArea[selectedAreaId]) {
      const areaEntities = getOrderedEntitiesForArea(selectedAreaId);
      if (areaEntities.length > 0) {
        setDeviceOrderByArea(prev => ({
          ...prev,
          [selectedAreaId]: areaEntities.map(e => e.entity_id)
        }));
      }
    }
  }, [selectedAreaId, deviceOrderByArea]);

  // Initialize device orders for type if not set
  useEffect(() => {
    if (selectedTypeName && !deviceOrderByType[selectedTypeName]) {
      const typeEntities = getOrderedEntitiesForType(selectedTypeName);
      if (typeEntities.length > 0) {
        setDeviceOrderByType(prev => ({
          ...prev,
          [selectedTypeName]: typeEntities.map(e => e.entity_id)
        }));
      }
    }
  }, [selectedTypeName, deviceOrderByType]);

  // Ordered areas
  const orderedAreas = useMemo(() => {
    if (!areas || areas.length === 0) return [];
    if (areaOrder.length === 0) return areas;
    const areaMap = new Map(areas.map(a => [a.area_id, a]));
    const ordered: typeof areas = [];
    areaOrder.forEach(id => {
      const a = areaMap.get(id);
      if (a) ordered.push(a);
      areaMap.delete(id);
    });
    areaMap.forEach(a => ordered.push(a));
    return ordered;
  }, [areas, areaOrder]);

  // Ordered types
  const orderedTypes = useMemo(() => {
    const typeNames = Object.keys(entitiesByType);
    if (typeOrder.length === 0) return typeNames;
    const set = new Set(typeNames);
    const ordered: string[] = [];
    typeOrder.forEach((name) => {
      if (set.has(name)) {
        ordered.push(name);
        set.delete(name);
      }
    });
    set.forEach((name) => ordered.push(name));
    return ordered;
  }, [entitiesByType, typeOrder]);

  // Get ordered entities for an area
  const getOrderedEntitiesForArea = (areaId: string) => {
    const areaEntities = entities?.filter((entity) => {
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      let entityAreaId = reg?.area_id;
      if (!entityAreaId && reg?.device_id) {
        const dev = devices.find((d) => d.id === reg.device_id);
        if (dev?.area_id) entityAreaId = dev.area_id;
      }
      return entityAreaId === areaId;
    }) || [];

    const order = deviceOrderByArea[areaId] || [];
    if (order.length === 0) return areaEntities;

    const entityMap = new Map(areaEntities.map(e => [e.entity_id, e]));
    const ordered: typeof areaEntities = [];
    order.forEach(id => {
      const e = entityMap.get(id);
      if (e) ordered.push(e);
      entityMap.delete(id);
    });
    entityMap.forEach(e => ordered.push(e));
    return ordered;
  };

  // Get device count for an area
  const getDeviceCountForArea = (areaId: string) => {
    return entities?.filter((entity) => {
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      let entityAreaId = reg?.area_id;
      if (!entityAreaId && reg?.device_id) {
        const dev = devices.find((d) => d.id === reg.device_id);
        if (dev?.area_id) entityAreaId = dev.area_id;
      }
      return entityAreaId === areaId;
    }).length || 0;
  };

  // Get ordered entities for a type
  const getOrderedEntitiesForType = (typeName: string) => {
    const typeEntities = entitiesByType[typeName] || [];
    const order = deviceOrderByType[typeName] || [];
    if (order.length === 0) return typeEntities;

    const entityMap = new Map(typeEntities.map(e => [e.entity_id, e]));
    const ordered: typeof typeEntities = [];
    order.forEach(id => {
      const e = entityMap.get(id);
      if (e) ordered.push(e);
      entityMap.delete(id);
    });
    entityMap.forEach(e => ordered.push(e));
    return ordered;
  };

  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return areas.find((a) => a.area_id === selectedAreaId) || null;
  }, [selectedAreaId, areas]);

  // Handle drag events for areas
  const handleDragEndAreas = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over || active.id === over.id) return;
    
    // Utiliser l'ordre courant (déduit) si l'état est encore vide
    const currentOrder = areaOrder.length > 0 ? areaOrder : orderedAreas.map((a) => a.area_id);
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    setAreaOrder(arrayMove(currentOrder, oldIndex, newIndex));
  };

  // Handle drag events for types
  const handleDragEndTypes = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over || active.id === over.id) return;
    
    const currentOrder = typeOrder.length > 0 ? typeOrder : orderedTypes;
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    setTypeOrder(arrayMove(currentOrder, oldIndex, newIndex));
  };

  // Handle drag events for devices
  const handleDragEndDevices = (event: DragEndEvent, context: 'area' | 'type', contextId: string) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over || active.id === over.id) return;
    
    if (context === 'area') {
      setDeviceOrderByArea((prev) => {
        const currentOrder = prev[contextId] || [];
        const oldIndex = currentOrder.indexOf(active.id as string);
        const newIndex = currentOrder.indexOf(over.id as string);
        return {
          ...prev,
          [contextId]: arrayMove(currentOrder, oldIndex, newIndex),
        };
      });
    } else {
      setDeviceOrderByType((prev) => {
        const currentOrder = prev[contextId] || [];
        const oldIndex = currentOrder.indexOf(active.id as string);
        const newIndex = currentOrder.indexOf(over.id as string);
        return {
          ...prev,
          [contextId]: arrayMove(currentOrder, oldIndex, newIndex),
        };
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "room" | "type")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="room" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Pièces
          </TabsTrigger>
          <TabsTrigger value="type" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="room" className="space-y-4 mt-4">
          {areas.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune pièce configurée.
            </p>
          ) : selectedAreaId ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedAreaId(undefined)}
                  className="text-sm text-primary hover:underline"
                >
                  ← Retour aux pièces
                </button>
                <h2 className="font-semibold text-base truncate">
                  {selectedArea?.name}
                </h2>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveDragId(e.active.id as string)}
                onDragEnd={(e) => handleDragEndDevices(e, 'area', selectedAreaId)}
              >
                <SortableContext
                  items={getOrderedEntitiesForArea(selectedAreaId).map((e) => e.entity_id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {getOrderedEntitiesForArea(selectedAreaId).map((entity) => {
                      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
                      let areaId = reg?.area_id;
                      if (!areaId && reg?.device_id) {
                        const dev = devices.find((d) => d.id === reg.device_id);
                        if (dev?.area_id) areaId = dev.area_id;
                      }
                      const area = areaId ? areas.find((a) => a.area_id === areaId) : null;
                      const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) : null;
                      const domain = getEntityDomain(entity.entity_id);

                      return domain === "media_player" ? (
                        <SortableMediaPlayerCard
                          key={entity.entity_id}
                          entity={entity}
                          floor={floor}
                          area={area}
                        />
                      ) : (
                        <SortableDeviceCard
                          key={entity.entity_id}
                          entity={entity}
                          onToggle={toggleEntity}
                          floor={floor}
                          area={area}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(e) => setActiveDragId(e.active.id as string)}
              onDragEnd={handleDragEndAreas}
            >
              <SortableContext
                items={orderedAreas.map((a) => a.area_id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {orderedAreas.map((area) => {
                    const floor = floors.find((f) => f.floor_id === area.floor_id);
                    const deviceCount = getDeviceCountForArea(area.area_id);
                    return (
                      <SortableAreaItem
                        key={area.area_id}
                        area={area}
                        floor={floor}
                        deviceCount={deviceCount}
                        onClick={() => setSelectedAreaId(area.area_id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </TabsContent>

        <TabsContent value="type" className="space-y-4 mt-4">
          {Object.keys(entitiesByType).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun type d'appareil trouvé.
            </p>
          ) : selectedTypeName ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedTypeName(undefined)}
                  className="text-sm text-primary hover:underline"
                >
                  ← Retour aux types
                </button>
                <h2 className="font-semibold text-base truncate">
                  {selectedTypeName}
                </h2>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveDragId(e.active.id as string)}
                onDragEnd={(e) => handleDragEndDevices(e, 'type', selectedTypeName)}
              >
                <SortableContext
                  items={getOrderedEntitiesForType(selectedTypeName).map((e) => e.entity_id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {getOrderedEntitiesForType(selectedTypeName).map((entity) => {
                      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
                      let areaId = reg?.area_id;
                      if (!areaId && reg?.device_id) {
                        const dev = devices.find((d) => d.id === reg.device_id);
                        if (dev?.area_id) areaId = dev.area_id;
                      }
                      const area = areaId ? areas.find((a) => a.area_id === areaId) : null;
                      const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) : null;
                      const domain = getEntityDomain(entity.entity_id);

                      return domain === "media_player" ? (
                        <SortableMediaPlayerCard
                          key={entity.entity_id}
                          entity={entity}
                          floor={floor}
                          area={area}
                        />
                      ) : (
                        <SortableDeviceCard
                          key={entity.entity_id}
                          entity={entity}
                          onToggle={toggleEntity}
                          floor={floor}
                          area={area}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(e) => setActiveDragId(e.active.id as string)}
              onDragEnd={handleDragEndTypes}
            >
              <SortableContext
                items={orderedTypes}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {orderedTypes.map((typeName) => {
                    const typeEntities = entitiesByType[typeName] || [];
                    return (
                      <SortableTypeItem
                        key={typeName}
                        typeName={typeName}
                        count={typeEntities.length}
                        onClick={() => setSelectedTypeName(typeName)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============== Composant principal Rooms ==============
const Rooms = () => {
  const { displayMode } = useDisplayMode();
  const connection = useHAStore((state) => state.connection);
  const floors = useHAStore((state) => state.floors);
  const isLoadingNeoliaPlans = useHAStore((state) => state.isLoadingNeoliaPlans);
  const loadNeoliaPlans = useHAStore((state) => state.loadNeoliaPlans);
  const neoliaFloorPlans = useHAStore((state) => state.neoliaFloorPlans);
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);
  
  const ptClass = displayMode === "mobile" ? "pt-32" : "pt-[24px]";
  const rootClassName = displayMode === "mobile" 
    ? `min-h-screen bg-background pb-24 ${ptClass}`
    : "w-full h-full flex flex-col overflow-hidden";
  // Vérifier si au moins un plan est complet (PNG + JSON)
  const hasUsablePlans = neoliaFloorPlans.some((plan) => plan.hasPng && plan.hasJson);

  // Charger les plans Neolia au démarrage (sauf en mode mobile)
  useEffect(() => {
    if (displayMode === "mobile") {
      return;
    }
    
    if (connection && floors.length > 0) {
      loadNeoliaPlans(connection, floors);
    }
  }, [connection, floors, loadNeoliaPlans, displayMode]);

  return (
    <div className={rootClassName}>
      <TopBar title="Maison" />
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden",
        displayMode === "mobile" ? "px-[26px] py-[26px]" : "px-4",
        displayMode !== "mobile" && ptClass
      )}>
        {isLoadingNeoliaPlans ? (
          <Card className="animate-fade-in">
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center">
                Chargement des plans...
              </p>
            </CardContent>
          </Card>
        ) : !hasUsablePlans ? (
          <HomeOverviewByTypeAndArea
            entities={entities || []}
            areas={areas}
            floors={floors}
            entityRegistry={entityRegistry}
            devices={devices}
            contextId="home-overview"
            filterFavorites={false}
          />
        ) : displayMode === "mobile" ? (
          <MaisonMobileView />
        ) : (
          <MaisonTabletPanelView />
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Rooms;
