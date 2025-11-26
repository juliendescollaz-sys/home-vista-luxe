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
                  <RoomDevicesGrid areaId={selectedAreaId} singleColumn />
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
  
  // Order states
  const [areaOrder, setAreaOrder] = useState<string[]>([]);
  const [deviceOrderByArea, setDeviceOrderByArea] = useState<Record<string, string[]>>({});
  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [deviceOrderByType, setDeviceOrderByType] = useState<Record<string, string[]>>({});

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
              <div className="space-y-2">
                {getOrderedEntitiesForArea(selectedAreaId).map((entity, idx) => {
                  const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
                  return (
                    <div
                      key={entity.entity_id}
                      className="w-full p-4 rounded-lg border border-border/50 bg-background flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {entity.attributes.friendly_name || entity.entity_id}
                        </h3>
                        <p className="text-xs text-muted-foreground">{entity.state}</p>
                      </div>
                      <button
                        className="ml-3 cursor-grab text-muted-foreground text-xl"
                        aria-label="Réorganiser"
                      >
                        ⋮⋮
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {orderedAreas.map((area) => {
                const floor = floors.find((f) => f.floor_id === area.floor_id);
                return (
                  <div
                    key={area.area_id}
                    className="w-full p-4 rounded-lg border border-border/50 bg-background flex items-center justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedAreaId(area.area_id)}
                      className="flex-1 text-left"
                    >
                      <h3 className="font-medium">{area.name}</h3>
                      {floor && (
                        <p className="text-sm text-muted-foreground">{floor.name}</p>
                      )}
                    </button>
                    <button
                      className="ml-3 cursor-grab text-muted-foreground text-xl"
                      aria-label="Réorganiser"
                    >
                      ⋮⋮
                    </button>
                  </div>
                );
              })}
            </div>
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
              <div className="space-y-2">
                {getOrderedEntitiesForType(selectedTypeName).map((entity) => {
                  const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
                  let areaId = reg?.area_id;
                  if (!areaId && reg?.device_id) {
                    const dev = devices.find((d) => d.id === reg.device_id);
                    if (dev?.area_id) areaId = dev.area_id;
                  }
                  const area = areaId ? areas.find((a) => a.area_id === areaId) : null;
                  const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) : null;

                  return (
                    <div
                      key={entity.entity_id}
                      className="w-full p-4 rounded-lg border border-border/50 bg-background flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {entity.attributes.friendly_name || entity.entity_id}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {floor && area ? `${floor.name} - ${area.name}` : area?.name || entity.state}
                        </p>
                      </div>
                      <button
                        className="ml-3 cursor-grab text-muted-foreground text-xl"
                        aria-label="Réorganiser"
                      >
                        ⋮⋮
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {orderedTypes.map((typeName) => {
                const typeEntities = entitiesByType[typeName] || [];
                return (
                  <div
                    key={typeName}
                    className="w-full p-4 rounded-lg border border-border/50 bg-background flex items-center justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTypeName(typeName)}
                      className="flex-1 text-left"
                    >
                      <h3 className="font-medium">{typeName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {typeEntities.length} appareil(s)
                      </p>
                    </button>
                    <button
                      className="ml-3 cursor-grab text-muted-foreground text-xl"
                      aria-label="Réorganiser"
                    >
                      ⋮⋮
                    </button>
                  </div>
                );
              })}
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
  const hasUsablePlans = neoliaFloorPlans.some((plan) => plan.hasPng && plan.hasJson);

  // Charger les plans Neolia au démarrage
  useEffect(() => {
    if (connection && floors.length > 0) {
      loadNeoliaPlans(connection, floors);
    }
  }, [connection, floors, loadNeoliaPlans]);

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
