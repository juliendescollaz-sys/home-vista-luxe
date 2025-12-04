import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHAStore } from "@/store/useHAStore";
import { useEffect, useMemo, useState, useCallback } from "react";
import { MapPin, Grid3x3, ArrowLeft, ChevronRight, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RoomDevicesGrid } from "@/components/RoomDevicesGrid";
import { getEntityDomain, filterPrimaryControlEntities } from "@/lib/entityUtils";
import { cn } from "@/lib/utils";
import { DraggableRoomLabel } from "@/components/DraggableRoomLabel";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, closestCenter, DragOverlay } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableRoomCard } from "@/components/SortableRoomCard";
import { SortableAreaCard } from "@/components/SortableAreaCard";
import { SortableTypeCard } from "@/components/SortableTypeCard";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { SortableCoverEntityTile } from "@/components/entities/SortableCoverEntityTile";
import { DeviceEntitiesDrawer } from "@/components/DeviceEntitiesDrawer";
import { RenameDialog } from "@/components/RenameDialog";
import { getGridClasses } from "@/lib/gridLayout";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { toast } from "sonner";
import type { HAEntity, HAArea } from "@/types/homeassistant";

// ============== MaisonTabletPanelView ==============
export const MaisonTabletPanelView = () => {
  const connection = useHAStore((state) => state.connection);
  const floors = useHAStore((state) => state.floors);
  const areas = useHAStore((state) => state.areas);
  const neoliaFloorPlans = useHAStore((state) => state.neoliaFloorPlans);
  const isLoadingNeoliaPlans = useHAStore((state) => state.isLoadingNeoliaPlans);
  const selectedFloorId = useHAStore((state) => state.selectedFloorId);
  const selectedAreaId = useHAStore((state) => state.selectedAreaId);
  const setSelectedFloorId = useHAStore((state) => state.setSelectedFloorId);
  const setSelectedAreaId = useHAStore((state) => state.setSelectedAreaId);
  const labelPositions = useHAStore((state) => state.labelPositions);
  const setLabelPosition = useHAStore((state) => state.setLabelPosition);
  const renameArea = useHAStore((state) => state.renameArea);
  
  const [areaToRename, setAreaToRename] = useState<HAArea | null>(null);

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

  // Safety net: spinner si chargement en cours (rarement utilisé car Rooms gère le spinner)
  if (!connection || floors.length === 0 || isLoadingNeoliaPlans || neoliaFloorPlans.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
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
    <div className="animate-fade-in flex flex-col h-full relative rounded-3xl p-4 overflow-hidden glass-card elevated-subtle border-border/50">
      {/* Header : boutons d'étage */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
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

      {/* Zone principale : plan + sidebar slide-over */}
      <div className="relative flex-1 overflow-hidden">
        {/* Conteneur plan */}
        <div className="w-full h-full flex items-start justify-center">
          <div className="relative w-full h-full overflow-hidden rounded-2xl">
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

                            // Priorité aux noms HA, fallback sur JSON
                            const haArea = areas.find((a) => a.area_id === polygon.areaId);
                            const areaFromJson = areasFromJson.find(
                              (a) => a.areaId === polygon.areaId,
                            );
                            const roomName = haArea?.name ?? areaFromJson?.name ?? `Pièce ${index + 1}`;

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
                  <h2 className="font-semibold text-lg truncate flex-1">
                    {selectedArea.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAreaToRename(selectedArea)}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border/40 bg-background/40 hover:bg-accent/60 hover:border-accent/60 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Renommer la pièce"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedAreaId(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Fermer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <RoomDevicesGrid areaId={selectedAreaId} singleColumn enableDragAndDrop />
                </div>
              </>
            )}
          </div>
        </div>

        {areaToRename && (
          <RenameDialog
            open={!!areaToRename}
            title="Renommer la pièce"
            description="Ce nouveau nom sera enregistré dans Home Assistant."
            initialValue={areaToRename.name}
            placeholder="Nom de la pièce"
            onConfirm={(newName) => renameArea(areaToRename.area_id, newName)}
            onClose={() => setAreaToRename(null)}
          />
        )}
      </div>
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
  const client = useHAStore((state) => state.client);
  const renameArea = useHAStore((state) => state.renameArea);
  const renameEntity = useHAStore((state) => state.renameEntity);

  const [viewMode, setViewMode] = useState<"room" | "type">("room");

  // Sélection courante
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>();
  const [selectedTypeName, setSelectedTypeName] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailsEntity, setDetailsEntity] = useState<HAEntity | null>(null);
  const [areaToRename, setAreaToRename] = useState<HAArea | null>(null);
  const [entityToRename, setEntityToRename] = useState<HAEntity | null>(null);

  // --- Utils persistence localStorage ---
  const LS_AREA_ORDER = "neolia_mobile_area_order";
  const LS_TYPE_ORDER = "neolia_mobile_type_order";
  const LS_DEVICE_AREA_ORDER = "neolia_mobile_device_order_by_area";
  const LS_DEVICE_TYPE_ORDER = "neolia_mobile_device_order_by_type";

  // Ordres persistés - initialisation lazy pour éviter le flash
  const [areaOrder, setAreaOrder] = useState<string[]>(() => {
    try {
      const a = window.localStorage.getItem(LS_AREA_ORDER);
      return a ? JSON.parse(a) : [];
    } catch {
      return [];
    }
  });
  const [typeOrder, setTypeOrder] = useState<string[]>(() => {
    try {
      const t = window.localStorage.getItem(LS_TYPE_ORDER);
      return t ? JSON.parse(t) : [];
    } catch {
      return [];
    }
  });
  const [deviceOrderByArea, setDeviceOrderByArea] = useState<Record<string, string[]>>(() => {
    try {
      const da = window.localStorage.getItem(LS_DEVICE_AREA_ORDER);
      return da ? JSON.parse(da) : {};
    } catch {
      return {};
    }
  });
  const [deviceOrderByType, setDeviceOrderByType] = useState<Record<string, string[]>>(() => {
    try {
      const dt = window.localStorage.getItem(LS_DEVICE_TYPE_ORDER);
      return dt ? JSON.parse(dt) : {};
    } catch {
      return {};
    }
  });

  // Sensors dnd-kit avec long-press
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

  // --- Helpers génériques drag & drop (dnd-kit) ---

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Déterminer quel type de liste on réorganise
    if (!selectedAreaId && !selectedTypeName) {
      // Liste principale (pièces ou types)
      if (viewMode === "room") {
        const oldIndex = orderedAreas.findIndex((a) => a.area_id === activeId);
        const newIndex = orderedAreas.findIndex((a) => a.area_id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const ids = orderedAreas.map((a) => a.area_id);
          const newOrder = arrayMove(ids, oldIndex, newIndex);
          setAreaOrder(newOrder);
        }
      } else {
        const oldIndex = orderedTypeNames.findIndex((t) => t === activeId);
        const newIndex = orderedTypeNames.findIndex((t) => t === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(orderedTypeNames, oldIndex, newIndex);
          setTypeOrder(newOrder);
        }
      }
    } else if (selectedAreaId) {
      // Liste des appareils d'une pièce
      const oldIndex = devicesForArea.findIndex((e) => e.entity_id === activeId);
      const newIndex = devicesForArea.findIndex((e) => e.entity_id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const ids = devicesForArea.map((e) => e.entity_id);
        const newOrder = arrayMove(ids, oldIndex, newIndex);
        setDeviceOrderByArea((prev) => ({ ...prev, [selectedAreaId]: newOrder }));
      }
    } else if (selectedTypeName) {
      // Liste des appareils d'un type
      const oldIndex = devicesForType.findIndex((e) => e.entity_id === activeId);
      const newIndex = devicesForType.findIndex((e) => e.entity_id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const ids = devicesForType.map((e) => e.entity_id);
        const newOrder = arrayMove(ids, oldIndex, newIndex);
        setDeviceOrderByType((prev) => ({ ...prev, [selectedTypeName]: newOrder }));
      }
    }
  };

  const handleDeviceToggle = async (entityId: string) => {
    console.info("[Neolia Maison] onToggle appelé (MaisonMobileView)", { entityId, domain: entityId.split(".")[0] });
    
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
      console.error("[Neolia Maison] Erreur lors du contrôle:", error);
      toast.error("Erreur lors du contrôle de l'appareil");
    }
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

  // Calculer le nombre d'appareils par pièce (utilise les entités filtrées)
  const primaryEntities = useMemo(() => {
    if (!entities) return [];
    return filterPrimaryControlEntities(entities, entityRegistry, devices);
  }, [entities, entityRegistry, devices]);

  const deviceCountByArea = useMemo(() => {
    const counts: Record<string, number> = {};
    primaryEntities.forEach((entity) => {
      const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      let areaId = reg?.area_id;

      if (!areaId && reg?.device_id) {
        const dev = devices.find((d) => d.id === reg.device_id);
        if (dev?.area_id) areaId = dev.area_id;
      }

      if (areaId) {
        counts[areaId] = (counts[areaId] || 0) + 1;
      }
    });
    return counts;
  }, [primaryEntities, entityRegistry, devices]);

  // --- Groupement par type (sur les entités principales uniquement) ---

  const entitiesByType = useMemo(() => {
    if (!primaryEntities || primaryEntities.length === 0) return {};
    const groups: Record<string, typeof primaryEntities> = {};
    primaryEntities.forEach((entity) => {
      const domain = getEntityDomain(entity.entity_id);
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
      groups[label].push(entity);
    });
    return groups;
  }, [primaryEntities]);

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

  // --- Appareils d'une pièce (filtrés) ---

  const devicesForArea = useMemo(() => {
    if (!primaryEntities || !selectedAreaId) return [];
    const list = primaryEntities.filter((entity) => {
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
  }, [primaryEntities, selectedAreaId, entityRegistry, devices, deviceOrderByArea]);


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
      {/* Sélecteur de vue style Favoris */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl backdrop-blur-sm border border-border/50">
        <button
          onClick={() => setViewMode("room")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all",
            viewMode === "room"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground active:bg-accent/50"
          )}
        >
          <MapPin className="h-4 w-4" />
          <span className="text-sm">Pièces</span>
        </button>
        <button
          onClick={() => setViewMode("type")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all",
            viewMode === "type"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground active:bg-accent/50"
          )}
        >
          <Grid3x3 className="h-4 w-4" />
          <span className="text-sm">Types</span>
        </button>
      </div>

      {/* ---- Vue PIÈCES ---- */}
      {viewMode === "room" && (
        <div className="space-y-4">
          {selectedAreaId ? (
            <>
              {/* Header retour + nom pièce */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedAreaId(undefined)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  ← Retour aux pièces
                </button>
              </div>
              <h3 className="text-lg font-semibold text-foreground px-1">
                {areas.find((a) => a.area_id === selectedAreaId)?.name || selectedAreaId}
              </h3>

              {/* Liste des appareils de la pièce (drag & drop dnd-kit) */}
              {devicesForArea.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm mt-8">
                  Aucun appareil dans cette pièce.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={devicesForArea.map((e) => e.entity_id)} strategy={rectSortingStrategy}>
                    <div className={getGridClasses("devices", "mobile")}>
                      {devicesForArea.map((entity) => {
                        const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
                        let areaId = reg?.area_id;

                        if (!areaId && reg?.device_id) {
                          const dev = devices.find((d) => d.id === reg.device_id);
                          if (dev?.area_id) areaId = dev.area_id;
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

                        if (entity.entity_id.startsWith("cover.")) {
                          return (
                            <SortableCoverEntityTile
                              key={entity.entity_id}
                              entity={entity}
                              floor={floor}
                              area={area}
                              onEditName={(e) => setEntityToRename(e)}
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
                            onEditName={(e) => setEntityToRename(e)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>

                  <DragOverlay dropAnimation={null}>
                    {activeId && devicesForArea.find((e) => e.entity_id === activeId) ? (
                      <div className="opacity-90 rotate-3 scale-105">
                        {(() => {
                          const entity = devicesForArea.find((e) => e.entity_id === activeId)!;
                          if (entity.entity_id.startsWith("media_player.")) {
                            return <SortableMediaPlayerCard entity={entity} />;
                          }
                          if (entity.entity_id.startsWith("cover.")) {
                            return <SortableCoverEntityTile entity={entity} />;
                          }
                          return <SortableDeviceCard entity={entity} onToggle={() => {}} />;
                        })()}
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </>
          ) : (
            // Liste des pièces (drag & drop dnd-kit)
            <>
              {orderedAreas.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm mt-8">
                  Aucune pièce configurée.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={orderedAreas.map((a) => a.area_id)} strategy={rectSortingStrategy}>
                    <div className="space-y-4">
                      {orderedAreas.map((area) => {
                        const floor = area.floor_id ? floors.find((f) => f.floor_id === area.floor_id) : undefined;
                        const deviceCount = deviceCountByArea[area.area_id] || 0;
                        return (
                          <SortableAreaCard
                            key={area.area_id}
                            area={area}
                            floor={floor}
                            deviceCount={deviceCount}
                            onClick={() => setSelectedAreaId(area.area_id)}
                            onEditName={(a) => setAreaToRename(a)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>

                  <DragOverlay dropAnimation={null}>
                    {activeId && orderedAreas.find((a) => a.area_id === activeId) ? (
                      <div className="opacity-90 rotate-3 scale-105">
                        <SortableAreaCard
                          area={orderedAreas.find((a) => a.area_id === activeId)!}
                          floor={orderedAreas.find((a) => a.area_id === activeId)?.floor_id 
                            ? floors.find((f) => f.floor_id === orderedAreas.find((a) => a.area_id === activeId)!.floor_id) 
                            : undefined}
                          deviceCount={deviceCountByArea[activeId] || 0}
                          onClick={() => {}}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </>
          )}
        </div>
      )}

      {/* ---- Vue TYPES ---- */}
      {viewMode === "type" && (
        <div className="space-y-4">
          {selectedTypeName ? (
            <>
              {/* Header retour + nom du type */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedTypeName(undefined)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  ← Retour aux types
                </button>
              </div>
              <h3 className="text-lg font-semibold text-foreground px-1">
                {selectedTypeName}
              </h3>

              {/* Liste des appareils du type (drag & drop dnd-kit) */}
              {devicesForType.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm mt-8">
                  Aucun appareil pour ce type.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={devicesForType.map((e) => e.entity_id)} strategy={rectSortingStrategy}>
                    <div className={getGridClasses("devices", "mobile")}>
                      {devicesForType.map((entity) => {
                        const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
                        let areaId = reg?.area_id;

                        if (!areaId && reg?.device_id) {
                          const dev = devices.find((d) => d.id === reg.device_id);
                          if (dev?.area_id) areaId = dev.area_id;
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

                        if (entity.entity_id.startsWith("cover.")) {
                          return (
                            <SortableCoverEntityTile
                              key={entity.entity_id}
                              entity={entity}
                              floor={floor}
                              area={area}
                              onEditName={(e) => setEntityToRename(e)}
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
                            onEditName={(e) => setEntityToRename(e)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>

                  <DragOverlay dropAnimation={null}>
                    {activeId && devicesForType.find((e) => e.entity_id === activeId) ? (
                      <div className="opacity-90 rotate-3 scale-105">
                        {(() => {
                          const entity = devicesForType.find((e) => e.entity_id === activeId)!;
                          if (entity.entity_id.startsWith("media_player.")) {
                            return <SortableMediaPlayerCard entity={entity} />;
                          }
                          if (entity.entity_id.startsWith("cover.")) {
                            return <SortableCoverEntityTile entity={entity} />;
                          }
                          return <SortableDeviceCard entity={entity} onToggle={() => {}} />;
                        })()}
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </>
          ) : (
            // Liste des types (drag & drop dnd-kit)
            <>
              {orderedTypeNames.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm mt-8">
                  Aucun appareil disponible.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={orderedTypeNames} strategy={rectSortingStrategy}>
                    <div className="space-y-4">
                      {orderedTypeNames.map((typeName) => {
                        const deviceCount = entitiesByType[typeName]?.length || 0;
                        return (
                          <SortableTypeCard
                            key={typeName}
                            typeName={typeName}
                            deviceCount={deviceCount}
                            onClick={() => setSelectedTypeName(typeName)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>

                  <DragOverlay dropAnimation={null}>
                    {activeId && orderedTypeNames.includes(activeId) ? (
                      <div className="opacity-90 rotate-3 scale-105">
                        <SortableTypeCard
                          typeName={activeId}
                          deviceCount={entitiesByType[activeId]?.length || 0}
                          onClick={() => {}}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </>
          )}
        </div>
      )}

      {detailsEntity && entities && (
        <DeviceEntitiesDrawer
          primaryEntity={detailsEntity}
          entities={entities}
          entityRegistry={entityRegistry}
          devices={devices}
          onClose={() => setDetailsEntity(null)}
        />
      )}

      {areaToRename && (
        <RenameDialog
          open={!!areaToRename}
          title="Renommer la pièce"
          description="Ce nouveau nom sera enregistré dans Home Assistant."
          initialValue={areaToRename.name}
          placeholder="Nom de la pièce"
          onConfirm={(newName) => renameArea(areaToRename.area_id, newName)}
          onClose={() => setAreaToRename(null)}
        />
      )}

      {entityToRename && (
        <RenameDialog
          open={!!entityToRename}
          title="Renommer l'appareil"
          description="Ce nouveau nom sera enregistré dans Home Assistant."
          initialValue={entityToRename.attributes.friendly_name || entityToRename.entity_id}
          placeholder="Nom de l'appareil"
          onConfirm={(newName) => renameEntity(entityToRename.entity_id, newName)}
          onClose={() => setEntityToRename(null)}
        />
      )}
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
  // État "HA initialisé" pour éviter le flash de HomeOverviewByTypeAndArea
  const isHAInitialized = !!connection && floors.length > 0;

  // Vérifier si au moins un plan est complet (PNG + JSON)
  const hasUsablePlans =
    displayMode !== "mobile" &&
    neoliaFloorPlans.some((plan) => plan.hasPng && plan.hasJson);

  // Charger les plans Neolia au démarrage (sauf en mode mobile)
  // Garde pour éviter les appels multiples
  useEffect(() => {
    if (displayMode === "mobile") {
      return;
    }

    if (
      isHAInitialized &&
      !isLoadingNeoliaPlans &&
      neoliaFloorPlans.length === 0
    ) {
      console.info("[Neolia] Chargement initial des plans Neolia (Tablet/Panel)");
      loadNeoliaPlans(connection, floors);
    }
  }, [
    displayMode,
    isHAInitialized,
    isLoadingNeoliaPlans,
    neoliaFloorPlans.length,
    loadNeoliaPlans,
    connection,
    floors,
  ]);

  // Mode mobile : rendu direct
  if (displayMode === "mobile") {
    return (
      <div className={rootClassName}>
        <TopBar title="Maison" />
        <div className="max-w-2xl mx-auto px-4 py-4">
          <MaisonMobileView />
        </div>
        <BottomNav />
      </div>
    );
  }

  // Mode Tablet/Panel : spinner pendant toute l'init (HA + plans)
  const shouldShowPlansSpinner =
    !isHAInitialized ||
    isLoadingNeoliaPlans ||
    neoliaFloorPlans.length === 0;

  return (
    <div className={rootClassName}>
      <TopBar title="Maison" />
      <div className={cn("w-full px-4", ptClass)}>
        {shouldShowPlansSpinner ? (
          <div className="flex items-center justify-center w-full h-full min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
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
