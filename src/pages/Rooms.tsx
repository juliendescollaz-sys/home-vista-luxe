import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHAStore } from "@/store/useHAStore";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Grid3x3, Loader2, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, closestCenter, DragOverlay } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableAreaCard } from "@/components/SortableAreaCard";
import { SortableRoomCardWithPhoto } from "@/components/SortableRoomCardWithPhoto";
import { SortableTypeCard } from "@/components/SortableTypeCard";
import { SortableDeviceCard } from "@/components/SortableDeviceCard";
import { SortableMediaPlayerCard } from "@/components/SortableMediaPlayerCard";
import { SortableCoverEntityTile } from "@/components/entities/SortableCoverEntityTile";

import { RenameDialog } from "@/components/RenameDialog";
import { getGridClasses } from "@/lib/gridLayout";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DraggableRoomLabel } from "@/components/DraggableRoomLabel";
import { RoomDevicesGrid } from "@/components/RoomDevicesGrid";
import type { HAEntity, HAArea } from "@/types/homeassistant";
import { getEntityDomain, filterPrimaryControlEntities } from "@/lib/entityUtils";

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
  const [overlayClickGuard, setOverlayClickGuard] = useState(false);

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

    // 1) Essayer d'abord de retrouver la vraie Area Home Assistant
    const haArea = areas.find((a) => a.area_id === selectedAreaId);
    if (haArea) return haArea;

    // 2) Fallback : reconstruire une pseudo-area depuis le JSON du plan courant
    //    → permet quand même d'afficher le header + la sidebar même si le registre HA a changé
    if (selectedPlan?.json?.areas) {
      const areaFromJson = selectedPlan.json.areas.find(
        (a) => a.areaId === selectedAreaId
      );
      if (areaFromJson) {
        return {
          area_id: areaFromJson.areaId,
          name: areaFromJson.name,
          floor_id: selectedPlan.floorId,
        } as HAArea;
      }
    }

    return null;
  }, [selectedAreaId, areas, selectedPlan]);

  // Safety net: spinner si chargement en cours
  if (
    !connection ||
    floors.length === 0 ||
    isLoadingNeoliaPlans ||
    neoliaFloorPlans.length === 0
  ) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Calculer le centroïde d'un polygon (au cas où besoin plus tard)
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
                  "px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-all border relative",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : isIncomplete
                    ? "bg-muted text-muted-foreground border-border opacity-60 cursor-not-allowed"
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
              >
                {plan.floorName}
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
                          const haAreaById = areas.find(
                            (a) => a.area_id === polygon.areaId
                          );
                          const areaFromJson = areasFromJson.find(
                            (a) => a.areaId === polygon.areaId
                          );
                          const haArea =
                            haAreaById ||
                            (areaFromJson
                              ? areas.find(
                                  (a) =>
                                    a.name.toLowerCase().trim() ===
                                    areaFromJson.name.toLowerCase().trim()
                                )
                              : null);

                          const roomName =
                            haArea?.name ??
                            areaFromJson?.name ??
                            `Pièce ${index + 1}`;

                          // ID effectif utilisé pour la sélection / sidebar
                          const effectiveAreaId =
                            haArea?.area_id ?? polygon.areaId;

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
                              isSelected={selectedAreaId === effectiveAreaId}
                              onPositionChange={(x, y) => {
                                setLabelPosition(
                                  selectedPlan.floorId,
                                  polygon.areaId,
                                  x,
                                  y
                                );
                              }}
                              onClickRoom={() => {
                                setOverlayClickGuard(true);
                                setSelectedAreaId(effectiveAreaId);
                                // Reset guard after a short delay
                                setTimeout(() => setOverlayClickGuard(false), 300);
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
            onClick={() => {
              if (!overlayClickGuard) {
                setSelectedAreaId(null);
              }
            }}
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
                    ✎
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
                {/* On filtre les appareils par areaId (selectedAreaId) */}
                <RoomDevicesGridWrapper areaId={selectedAreaId} />
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

// Wrapper pour RoomDevicesGrid (import statique ESM)
const RoomDevicesGridWrapper = ({ areaId }: { areaId: string }) => {
  return (
    <RoomDevicesGrid areaId={areaId} singleColumn enableDragAndDrop />
  );
};

// ============== MaisonMobileView & Rooms (inchangés) ==============

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

  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>();
  const [selectedTypeName, setSelectedTypeName] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [areaToRename, setAreaToRename] = useState<HAArea | null>(null);
  const [entityToRename, setEntityToRename] = useState<HAEntity | null>(null);

  const LS_AREA_ORDER = "neolia_mobile_area_order";
  const LS_TYPE_ORDER = "neolia_mobile_type_order";
  const LS_DEVICE_AREA_ORDER = "neolia_mobile_device_order_by_area";
  const LS_DEVICE_TYPE_ORDER = "neolia_mobile_device_order_by_type";
  const LS_ROOM_PHOTOS = "neolia_mobile_room_photos";

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
  const [roomPhotos, setRoomPhotos] = useState<Record<string, string>>(() => {
    try {
      const rp = window.localStorage.getItem(LS_ROOM_PHOTOS);
      return rp ? JSON.parse(rp) : {};
    } catch {
      return {};
    }
  });

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

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_ROOM_PHOTOS, JSON.stringify(roomPhotos));
    } catch {}
  }, [roomPhotos]);

  const handleRoomPhotoChange = (areaId: string, file: File) => {
    // Compress image before storing
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      // Limit size to 400px max dimension for localStorage quota
      const maxSize = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
      setRoomPhotos((prev) => {
        const updated = { ...prev, [areaId]: compressedDataUrl };
        // Persist immediately to avoid race conditions
        try {
          window.localStorage.setItem(LS_ROOM_PHOTOS, JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to save room photo to localStorage:", err);
          toast.error("Espace de stockage insuffisant");
        }
        return updated;
      });
      toast.success("Photo ajoutée");
    };

    img.onerror = () => {
      toast.error("Erreur lors de la lecture de l'image");
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      toast.error("Erreur lors de la lecture du fichier");
    };
    reader.readAsDataURL(file);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (!selectedAreaId && !selectedTypeName) {
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
      const oldIndex = devicesForArea.findIndex((e) => e.entity_id === activeId);
      const newIndex = devicesForArea.findIndex((e) => e.entity_id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const ids = devicesForArea.map((e) => e.entity_id);
        const newOrder = arrayMove(ids, oldIndex, newIndex);
        setDeviceOrderByArea((prev) => ({ ...prev, [selectedAreaId]: newOrder }));
      }
    } else if (selectedTypeName) {
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
    console.info("[Neolia Maison] onToggle appelé (MaisonMobileView)", {
      entityId,
      domain: entityId.split(".")[0],
    });

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

  return (
    <div className="space-y-6">
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

      {/* Contenu principal avec DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {viewMode === "room" && !selectedAreaId && (
          <SortableContext
            items={orderedAreas.map((a) => a.area_id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4">
              {orderedAreas.map((area) => {
                const floor = floors.find((f) => f.floor_id === area.floor_id);
                return (
                  <SortableRoomCardWithPhoto
                    key={area.area_id}
                    area={area}
                    floor={floor}
                    deviceCount={deviceCountByArea[area.area_id] || 0}
                    customPhoto={roomPhotos[area.area_id]}
                    onPhotoChange={handleRoomPhotoChange}
                    onClick={() => setSelectedAreaId(area.area_id)}
                    onEditName={setAreaToRename}
                  />
                );
              })}
            </div>
          </SortableContext>
        )}

        {viewMode === "room" && selectedAreaId && (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedAreaId(undefined)}
              className="flex items-center gap-2 text-sm text-muted-foreground active:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour aux pièces
            </button>
            <h2 className="text-lg font-semibold">
              {areas.find((a) => a.area_id === selectedAreaId)?.name}
            </h2>
            <SortableContext
              items={devicesForArea.map((e) => e.entity_id)}
              strategy={rectSortingStrategy}
            >
              <div className={getGridClasses("devices", "mobile")}>
                {devicesForArea.map((entity) => {
                  const domain = getEntityDomain(entity.entity_id);
                  if (domain === "cover") {
                    return (
                      <SortableCoverEntityTile
                        key={entity.entity_id}
                        entity={entity}
                      />
                    );
                  }
                  if (domain === "media_player") {
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
                      onToggle={() => handleDeviceToggle(entity.entity_id)}
                      onOpenDetails={() => {}}
                      onEditName={() => setEntityToRename(entity)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </div>
        )}

        {viewMode === "type" && !selectedTypeName && (
          <SortableContext items={orderedTypeNames} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-3">
              {orderedTypeNames.map((typeName) => {
                const count = entitiesByType[typeName]?.length || 0;
                return (
                  <SortableTypeCard
                    key={typeName}
                    typeName={typeName}
                    deviceCount={count}
                    onClick={() => setSelectedTypeName(typeName)}
                  />
                );
              })}
            </div>
          </SortableContext>
        )}

        {viewMode === "type" && selectedTypeName && (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedTypeName(undefined)}
              className="flex items-center gap-2 text-sm text-muted-foreground active:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour aux types
            </button>
            <h2 className="text-lg font-semibold">{selectedTypeName}</h2>
            <SortableContext
              items={devicesForType.map((e) => e.entity_id)}
              strategy={rectSortingStrategy}
            >
              <div className={getGridClasses("devices", "mobile")}>
                {devicesForType.map((entity) => {
                  const domain = getEntityDomain(entity.entity_id);
                  if (domain === "cover") {
                    return (
                      <SortableCoverEntityTile
                        key={entity.entity_id}
                        entity={entity}
                      />
                    );
                  }
                  if (domain === "media_player") {
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
                      onToggle={() => handleDeviceToggle(entity.entity_id)}
                      onOpenDetails={() => {}}
                      onEditName={() => setEntityToRename(entity)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </div>
        )}
      </DndContext>

      {/* Dialog renommage pièce */}
      <RenameDialog
        open={!!areaToRename}
        title="Renommer la pièce"
        initialValue={areaToRename?.name || ""}
        placeholder="Nom de la pièce"
        onConfirm={async (newName) => {
          if (areaToRename) {
            await renameArea(areaToRename.area_id, newName);
            setAreaToRename(null);
          }
        }}
        onClose={() => setAreaToRename(null)}
      />

      {/* Dialog renommage appareil */}
      <RenameDialog
        open={!!entityToRename}
        title="Renommer l'appareil"
        initialValue={entityToRename?.attributes?.friendly_name || ""}
        placeholder="Nom de l'appareil"
        onConfirm={async (newName) => {
          if (entityToRename) {
            await renameEntity(entityToRename.entity_id, newName);
            setEntityToRename(null);
          }
        }}
        onClose={() => setEntityToRename(null)}
      />
    </div>
  );
};

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
  const rootClassName =
    displayMode === "mobile"
      ? `min-h-screen bg-background pb-24 ${ptClass}`
      : "w-full h-full flex flex-col overflow-hidden";

  const isHAInitialized = !!connection && floors.length > 0;

  const hasUsablePlans =
    displayMode !== "mobile" &&
    neoliaFloorPlans.some((plan) => plan.hasPng && plan.hasJson);

  useEffect(() => {
    if (displayMode === "mobile") {
      return;
    }

    if (
      isHAInitialized &&
      !isLoadingNeoliaPlans &&
      neoliaFloorPlans.length === 0
    ) {
      console.info("[Neolia] Chargement initial des plans (Tablet/Panel)");
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

  const shouldShowPlansSpinner =
    !isHAInitialized || isLoadingNeoliaPlans || neoliaFloorPlans.length === 0;

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
