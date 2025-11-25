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
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-2xl">Plans Neolia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ligne des boutons d'étage */}
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

        {/* Zone principale : plan + colonne de droite */}
        <div className="flex flex-row gap-4">
          {/* Conteneur plan */}
          <div className="basis-2/3 min-h-[520px] max-h-[620px] flex items-center justify-center">
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted/40 border border-border/40">
              {selectedPlan?.hasPng && selectedPlan?.imageUrl ? (
                <>
                  <img
                    src={selectedPlan.imageUrl}
                    alt={`Plan de ${selectedPlan.floorName}`}
                    className="relative z-10 w-full h-full object-contain rounded-xl bg-black/20"
                  />
                  {/* Débug visuel obligatoire */}
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <button
                      type="button"
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-red-600 text-white text-xs pointer-events-auto"
                      onClick={() => console.debug("[Neolia] clic sur bouton de test")}
                    >
                      TEST OVERLAY
                    </button>
                  </div>
                  {/* Overlay des boutons de pièces */}
                  {selectedPlan?.hasJson && selectedPlan?.json && selectedPlan.json.polygons && selectedPlan.json.polygons.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none z-30">
                      {(() => {
                        console.debug("[Neolia] currentPlan pour debug", selectedPlan);
                        console.debug("[Neolia] JSON brut", selectedPlan?.json);
                        console.debug("[Neolia] polygons", selectedPlan?.json?.polygons);
                        console.debug("[Neolia] areas", selectedPlan?.json?.areas);
                        return null;
                      })()}
                      {selectedPlan.json.polygons.map((polygon, index) => {
                        const points = polygon.relative ?? [];

                        // fallback si pas de points
                        if (!points.length) {
                          return (
                            <div
                              key={`empty-${index}`}
                              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-red-400"
                            >
                              POLYGONE SANS POINTS
                            </div>
                          );
                        }

                        // centroid en coordonnées relatives (0–1)
                        const { cx, cy } = points.reduce(
                          (acc, [x, y]) => ({
                            cx: acc.cx + x,
                            cy: acc.cy + y,
                          }),
                          { cx: 0, cy: 0 }
                        );
                        const cxNorm = cx / points.length;
                        const cyNorm = cy / points.length;

                        const area = selectedPlan.json!.areas.find(
                          (a) => a.areaId === polygon.areaId
                        );
                        const roomName = area?.name ?? `Pièce ${index + 1}`;

                        console.debug("[Neolia] rendu des boutons de pièces OK pour", roomName);

                        return (
                          <button
                            key={`${polygon.areaId}-${index}`}
                            type="button"
                            style={{
                              left: `${cxNorm * 100}%`,
                              top: `${cyNorm * 100}%`,
                            }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-[11px] font-medium bg-background/85 text-foreground shadow-sm pointer-events-auto hover:bg-primary hover:text-primary-foreground transition"
                            onClick={() => setSelectedAreaId(polygon.areaId)}
                          >
                            {roomName}
                          </button>
                        );
                      })}
                      {(() => {
                        console.debug("[Neolia] rendu des boutons de pièces OK");
                        return null;
                      })()}
                    </div>
                  )}
                  {/* Message si JSON manquant */}
                  {!selectedPlan.hasJson && (
                    <div className="absolute inset-0 flex items-end justify-center pb-4 z-20">
                      <p className="text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-1 rounded-full border border-border/60">
                        Zones non configurées pour cet étage.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground text-center px-4">
                    Plan non disponible pour cet étage (PNG/JSON manquant).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Colonne de droite : appareils de la pièce sélectionnée */}
          <div className="basis-1/3 border-l pl-4 overflow-y-auto space-y-4">
            {selectedAreaId && selectedArea ? (
              <>
                <h3 className="text-lg font-semibold sticky top-0 bg-background py-2">
                  Pièce : {selectedArea.name}
                </h3>
                <RoomDevicesGrid areaId={selectedAreaId} />
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center py-4">
                  Sélectionnez une pièce sur le plan pour voir les appareils.
                </p>
              </div>
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
  const neoliaFloorPlans = useHAStore((state) => state.neoliaFloorPlans);

  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"room" | "type">("room");

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
      {/* Infos sur les plans */}
      {neoliaFloorPlans.length > 0 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-xl">Plans Neolia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {neoliaFloorPlans.map((plan) => (
              <div
                key={plan.floorId}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{plan.floorName}</h3>
                  <p className="text-sm text-muted-foreground">{plan.floorId}</p>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={plan.hasPng ? "default" : "destructive"}
                    className="gap-1 text-xs"
                  >
                    {plan.hasPng ? "PNG ✓" : "PNG ✗"}
                  </Badge>
                  <Badge
                    variant={plan.hasJson ? "default" : "destructive"}
                    className="gap-1 text-xs"
                  >
                    {plan.hasJson ? "JSON ✓" : "JSON ✗"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Onglets Par pièce / Par type */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "room" | "type")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="room" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Par pièce
          </TabsTrigger>
          <TabsTrigger value="type" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Par type
          </TabsTrigger>
        </TabsList>

        <TabsContent value="room" className="space-y-4 mt-4">
          {areas.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune pièce configurée.
            </p>
          ) : selectedAreaId ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedAreaId(undefined)}
                className="text-sm text-primary hover:underline"
              >
                ← Retour à la liste des pièces
              </button>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {areas.find((a) => a.area_id === selectedAreaId)?.name || selectedAreaId}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RoomDevicesGrid areaId={selectedAreaId} />
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="space-y-2">
              {areas.map((area) => {
                const floor = floors.find((f) => f.floor_id === area.floor_id);
                return (
                  <button
                    key={area.area_id}
                    type="button"
                    onClick={() => setSelectedAreaId(area.area_id)}
                    className="w-full p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{area.name}</h3>
                        {floor && (
                          <p className="text-sm text-muted-foreground">{floor.name}</p>
                        )}
                      </div>
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="type" className="space-y-6 mt-4">
          {Object.entries(entitiesByType).map(([typeName, typeEntities]) => (
            <Card key={typeName}>
              <CardHeader>
                <CardTitle className="text-lg">{typeName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {typeEntities.map((entity) => {
                    const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
                    let areaId = reg?.area_id;

                    if (!areaId && reg?.device_id) {
                      const dev = devices.find((d) => d.id === reg.device_id);
                      if (dev?.area_id) {
                        areaId = dev.area_id;
                      }
                    }

                    const area = areaId ? areas.find((a) => a.area_id === areaId) : null;
                    const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) : null;

                    return (
                      <div
                        key={entity.entity_id}
                        className="p-3 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">
                              {entity.attributes.friendly_name || entity.entity_id}
                            </h4>
                            {area && (
                              <p className="text-sm text-muted-foreground">
                                {floor ? `${floor.name} - ` : ""}{area.name}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary">{entity.state}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
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
  
  const rootClassName = displayMode === "mobile" ? "min-h-screen bg-background pb-20" : "min-h-screen bg-background";
  const contentPaddingTop = displayMode === "mobile" ? "pt-[138px]" : "pt-[24px]";

  // Charger les plans Neolia au démarrage
  useEffect(() => {
    if (connection && floors.length > 0) {
      loadNeoliaPlans(connection, floors);
    }
  }, [connection, floors, loadNeoliaPlans]);

  return (
    <div className={rootClassName}>
      <TopBar title="Maison" />
      <div className={`w-full ${displayMode === "mobile" ? "px-[26px]" : "px-4"} pb-[26px] ${contentPaddingTop}`}>
        {isLoadingNeoliaPlans ? (
          <Card className="animate-fade-in">
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center">
                Chargement des plans Neolia...
              </p>
            </CardContent>
          </Card>
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
