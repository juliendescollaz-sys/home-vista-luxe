import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHAStore } from "@/store/useHAStore";
import { useEffect, useMemo, useState, useCallback } from "react";
import { MapPin, Grid3x3, ArrowLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RoomDevicesGrid } from "@/components/RoomDevicesGrid";
import { getEntityDomain } from "@/lib/entityUtils";
import { cn } from "@/lib/utils";
import { DraggableRoomLabel } from "@/components/DraggableRoomLabel";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, DragOverlay } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableRoomCard } from "@/components/SortableRoomCard";
import { SortableUniversalEntityTile } from "@/components/SortableUniversalEntityTile";
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

// Generic Sortable Item wrapper
const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      {children}
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

  const [viewMode, setViewMode] = useState<"room" | "type">("room");

  // Sélection courante
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>();
  const [selectedTypeName, setSelectedTypeName] = useState<string | undefined>();

  // Ordres persistés
  const [areaOrder, setAreaOrder] = useState<string[]>([]);
  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [deviceOrderByArea, setDeviceOrderByArea] = useState<Record<string, string[]>>({});
  const [deviceOrderByType, setDeviceOrderByType] = useState<Record<string, string[]>>({});

  // --- Utils persistence localStorage ---
  const LS_AREA_ORDER = "neolia_mobile_area_order";
  const LS_TYPE_ORDER = "neolia_mobile_type_order";
  const LS_DEVICE_AREA_ORDER = "neolia_mobile_device_order_by_area";
  const LS_DEVICE_TYPE_ORDER = "neolia_mobile_device_order_by_type";

  useEffect(() => {
    try {
      const a = window.localStorage.getItem(LS_AREA_ORDER);
      if (a) setAreaOrder(JSON.parse(a));
    } catch {}
    try {
      const t = window.localStorage.getItem(LS_TYPE_ORDER);
      if (t) setTypeOrder(JSON.parse(t));
    } catch {}
    try {
      const da = window.localStorage.getItem(LS_DEVICE_AREA_ORDER);
      if (da) setDeviceOrderByArea(JSON.parse(da));
    } catch {}
    try {
      const dt = window.localStorage.getItem(LS_DEVICE_TYPE_ORDER);
      if (dt) setDeviceOrderByType(JSON.parse(dt));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_AREA_ORDER, JSON.stringify(areaOrder));
    } catch {}
  }, [areaOrder]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_TYPE_ORDER, JSON.stringify(typeOrder));
    } catch {}
  }, [typeOrder]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_DEVICE_AREA_ORDER, JSON.stringify(deviceOrderByArea));
    } catch {}
  }, [deviceOrderByArea]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_DEVICE_TYPE_ORDER, JSON.stringify(deviceOrderByType));
    } catch {}
  }, [deviceOrderByType]);

  // --- Helpers génériques drag & drop ---

  const moveInArray = (arr: string[], from: number, to: number): string[] => {
    const copy = [...arr];
    const item = copy.splice(from, 1)[0];
    copy.splice(to, 0, item);
    return copy;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // --- Ordre des pièces ---

  const orderedAreas = useMemo(() => {
    if (!areas || areas.length === 0) return [];
    if (areaOrder.length === 0) return areas;
    const map = new Map(areas.map((a) => [a.area_id, a]));
    const ordered: typeof areas = [];
    areaOrder.forEach((id) => {
      const a = map.get(id);
      if (a) {
        ordered.push(a);
        map.delete(id);
      }
    });
    map.forEach((a) => ordered.push(a));
    return ordered;
  }, [areas, areaOrder]);

  const onDropArea = (fromIndex: number, toIndex: number) => {
    const ids = orderedAreas.map((a) => a.area_id);
    const newOrder = moveInArray(ids, fromIndex, toIndex);
    setAreaOrder(newOrder);
  };

  // --- Groupement par type ---

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

  const orderedTypeNames = useMemo(() => {
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

  const onDropType = (fromIndex: number, toIndex: number) => {
    const newOrder = moveInArray(orderedTypeNames, fromIndex, toIndex);
    setTypeOrder(newOrder);
  };

  // --- Appareils d'une pièce ---

  const devicesForArea = useMemo(() => {
    if (!entities || !selectedAreaId) return [];
    const list = entities.filter((entity) => {
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      let areaId = reg?.area_id;

      if (!areaId && reg?.device_id) {
        const dev = devices.find((d) => d.id === reg.device_id);
        if (dev?.area_id) areaId = dev.area_id;
      }
      return areaId === selectedAreaId;
    });

    const order = deviceOrderByArea[selectedAreaId];
    if (!order || order.length === 0) return list;

    const map = new Map(list.map((e) => [e.entity_id, e]));
    const ordered: typeof list = [];
    order.forEach((id) => {
      const e = map.get(id);
      if (e) {
        ordered.push(e);
        map.delete(id);
      }
    });
    map.forEach((e) => ordered.push(e));
    return ordered;
  }, [entities, selectedAreaId, entityRegistry, devices, deviceOrderByArea]);

  const onDropDeviceInArea = (fromIndex: number, toIndex: number) => {
    if (!selectedAreaId) return;
    const ids = devicesForArea.map((e) => e.entity_id);
    const newOrder = moveInArray(ids, fromIndex, toIndex);
    setDeviceOrderByArea((prev) => ({
      ...prev,
      [selectedAreaId]: newOrder,
    }));
  };

  // --- Appareils d'un type ---

  const devicesForType = useMemo(() => {
    if (!entitiesByType || !selectedTypeName) return [];
    const list = entitiesByType[selectedTypeName] || [];
    const order = deviceOrderByType[selectedTypeName];
    if (!order || order.length === 0) return list;

    const map = new Map(list.map((e) => [e.entity_id, e]));
    const ordered: typeof list = [];
    order.forEach((id) => {
      const e = map.get(id);
      if (e) {
        ordered.push(e);
        map.delete(id);
      }
    });
    map.forEach((e) => ordered.push(e));
    return ordered;
  }, [entitiesByType, selectedTypeName, deviceOrderByType]);

  const onDropDeviceInType = (fromIndex: number, toIndex: number) => {
    if (!selectedTypeName) return;
    const ids = devicesForType.map((e) => e.entity_id);
    const newOrder = moveInArray(ids, fromIndex, toIndex);
    setDeviceOrderByType((prev) => ({
      ...prev,
      [selectedTypeName]: newOrder,
    }));
  };

  if (floors.length === 0) {
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

  // --- Rendu ---

  return (
    <div className="space-y-6">
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "room" | "type")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="room">Pièces</TabsTrigger>
          <TabsTrigger value="type">Types</TabsTrigger>
        </TabsList>

        {/* ---- Vue PIÈCES ---- */}
        <TabsContent value="room" className="mt-4 space-y-4">
          {selectedAreaId ? (
            <>
              {/* Header retour + nom pièce */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAreaId(undefined)}
                  className="text-sm text-primary hover:underline"
                >
                  ← Retour aux pièces
                </button>
                <span className="font-semibold truncate">
                  {areas.find((a) => a.area_id === selectedAreaId)?.name || selectedAreaId}
                </span>
              </div>

              {/* Liste des appareils de la pièce (drag & drop) */}
              <div className="space-y-3 mt-4">
                {devicesForArea.map((entity, index) => (
                  <div
                    key={entity.entity_id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      onDropDeviceInArea(from, index);
                    }}
                    className="p-3 rounded-lg border border-border/50 bg-background/80 flex items-center justify-between cursor-grab active:cursor-grabbing"
                  >
                    <div>
                      <div className="font-medium">
                        {entity.attributes.friendly_name || entity.entity_id}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {entity.state}
                    </Badge>
                  </div>
                ))}
                {devicesForArea.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm mt-4">
                    Aucun appareil dans cette pièce.
                  </p>
                )}
              </div>
            </>
          ) : (
            // Liste des pièces (drag & drop)
            <div className="space-y-3">
              {orderedAreas.map((area, index) => {
                const floor = area.floor_id
                  ? floors.find((f) => f.floor_id === area.floor_id)
                  : undefined;
                return (
                  <div
                    key={area.area_id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      onDropArea(from, index);
                    }}
                    className="p-4 rounded-lg border border-border/60 bg-background/80 flex items-center justify-between cursor-grab active:cursor-grabbing"
                  >
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => setSelectedAreaId(area.area_id)}
                    >
                      <div className="font-medium">{area.name}</div>
                      {floor && (
                        <div className="text-xs text-muted-foreground">{floor.name}</div>
                      )}
                    </button>
                    <span className="ml-3 text-muted-foreground text-lg">⋮⋮</span>
                  </div>
                );
              })}
              {orderedAreas.length === 0 && (
                <p className="text-center text-muted-foreground text-sm mt-4">
                  Aucune pièce configurée.
                </p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ---- Vue TYPES ---- */}
        <TabsContent value="type" className="mt-4 space-y-4">
          {selectedTypeName ? (
            <>
              {/* Header retour + nom du type */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTypeName(undefined)}
                  className="text-sm text-primary hover:underline"
                >
                  ← Retour aux types
                </button>
                <span className="font-semibold truncate">{selectedTypeName}</span>
              </div>

              {/* Liste des appareils du type (drag & drop) */}
              <div className="space-y-3 mt-4">
                {devicesForType.map((entity, index) => (
                  <div
                    key={entity.entity_id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      onDropDeviceInType(from, index);
                    }}
                    className="p-3 rounded-lg border border-border/50 bg-background/80 flex items-center justify-between cursor-grab active:cursor-grabbing"
                  >
                    <div>
                      <div className="font-medium">
                        {entity.attributes.friendly_name || entity.entity_id}
                      </div>
                      {/* On peut afficher la pièce associée */}
                      {(() => {
                        const reg = entityRegistry.find(
                          (r) => r.entity_id === entity.entity_id,
                        );
                        let areaId = reg?.area_id;
                        if (!areaId && reg?.device_id) {
                          const dev = devices.find((d) => d.id === reg.device_id);
                          if (dev?.area_id) areaId = dev.area_id;
                        }
                        const area = areaId
                          ? areas.find((a) => a.area_id === areaId)
                          : null;
                        const floor =
                          area?.floor_id && floors.find((f) => f.floor_id === area.floor_id);
                        return area ? (
                          <div className="text-xs text-muted-foreground">
                            {floor ? `${floor.name} · ` : ""}
                            {area.name}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {entity.state}
                    </Badge>
                  </div>
                ))}
                {devicesForType.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm mt-4">
                    Aucun appareil pour ce type.
                  </p>
                )}
              </div>
            </>
          ) : (
            // Liste des types (drag & drop)
            <div className="space-y-3">
              {orderedTypeNames.map((typeName, index) => (
                <div
                  key={typeName}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    const from = Number(e.dataTransfer.getData("text/plain"));
                    onDropType(from, index);
                  }}
                  className="p-4 rounded-lg border border-border/60 bg-background/80 flex items-center justify-between cursor-grab active:cursor-grabbing"
                >
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => setSelectedTypeName(typeName)}
                  >
                    <div className="font-medium">{typeName}</div>
                    <div className="text-xs text-muted-foreground">
                      {entitiesByType[typeName]?.length || 0} appareil(s)
                    </div>
                  </button>
                  <span className="ml-3 text-muted-foreground text-lg">⋮⋮</span>
                </div>
              ))}
              {orderedTypeNames.length === 0 && (
                <p className="text-center text-muted-foreground text-sm mt-4">
                  Aucun appareil disponible.
                </p>
              )}
            </div>
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
  const hasUsablePlans =
    displayMode !== "mobile" &&
    neoliaFloorPlans.some((plan) => plan.hasPng && plan.hasJson);

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
        {displayMode === "mobile" ? (
          <MaisonMobileView />
        ) : isLoadingNeoliaPlans ? (
          <Card className="animate-fade-in">
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center">
                Chargement des plans Neolia...
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
        ) : (
          <MaisonTabletPanelView />
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Rooms;
