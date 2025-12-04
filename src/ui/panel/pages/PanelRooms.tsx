/**
 * Page Maison pour le mode PANEL
 * Copie complète de la version Tablet (src/pages/Rooms.tsx - MaisonTabletPanelView)
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHAStore } from "@/store/useHAStore";
import { DraggableRoomLabel } from "@/components/DraggableRoomLabel";
import { RoomDevicesGrid } from "@/components/RoomDevicesGrid";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";
import { RenameDialog } from "@/components/RenameDialog";
import { cn } from "@/lib/utils";
import type { HAArea } from "@/types/homeassistant";

export function PanelRooms() {
  const connection = useHAStore((state) => state.connection);
  const floors = useHAStore((state) => state.floors);
  const areas = useHAStore((state) => state.areas);
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);
  const neoliaFloorPlans = useHAStore((state) => state.neoliaFloorPlans);
  const isLoadingNeoliaPlans = useHAStore((state) => state.isLoadingNeoliaPlans);
  const loadNeoliaPlans = useHAStore((state) => state.loadNeoliaPlans);
  const selectedFloorId = useHAStore((state) => state.selectedFloorId);
  const selectedAreaId = useHAStore((state) => state.selectedAreaId);
  const setSelectedFloorId = useHAStore((state) => state.setSelectedFloorId);
  const setSelectedAreaId = useHAStore((state) => state.setSelectedAreaId);
  const labelPositions = useHAStore((state) => state.labelPositions);
  const setLabelPosition = useHAStore((state) => state.setLabelPosition);
  const renameArea = useHAStore((state) => state.renameArea);
  
  const [areaToRename, setAreaToRename] = useState<HAArea | null>(null);

  // État "HA initialisé" pour éviter le flash
  const isHAInitialized = !!connection && floors.length > 0;

  // Vérifier si au moins un plan est complet (PNG + JSON)
  const hasUsablePlans = neoliaFloorPlans.some((plan) => plan.hasPng && plan.hasJson);

  // Charger les plans Neolia au démarrage
  useEffect(() => {
    if (
      isHAInitialized &&
      !isLoadingNeoliaPlans &&
      neoliaFloorPlans.length === 0
    ) {
      console.info("[PanelRooms] Chargement initial des plans Neolia");
      loadNeoliaPlans(connection, floors);
    }
  }, [
    isHAInitialized,
    isLoadingNeoliaPlans,
    neoliaFloorPlans.length,
    loadNeoliaPlans,
    connection,
    floors,
  ]);

  // Réinitialiser selectedAreaId quand on change d'étage
  useEffect(() => {
    setSelectedAreaId(null);
  }, [selectedFloorId, setSelectedAreaId]);

  const selectedPlan = useMemo(() => {
    const plan = neoliaFloorPlans.find((p) => p.floorId === selectedFloorId);
    if (plan) {
      console.debug("[PanelRooms] currentPlan", plan);
    }
    return plan;
  }, [neoliaFloorPlans, selectedFloorId]);

  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return areas.find((a) => a.area_id === selectedAreaId) || null;
  }, [selectedAreaId, areas]);

  // Spinner pendant l'initialisation
  const shouldShowSpinner =
    !isHAInitialized ||
    isLoadingNeoliaPlans ||
    neoliaFloorPlans.length === 0;

  if (shouldShowSpinner) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="w-full px-4 pt-[24px]">
          <div className="flex items-center justify-center w-full h-full min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback si aucun plan utilisable
  if (!hasUsablePlans) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="w-full px-4 pt-[24px]">
          <HomeOverviewByTypeAndArea
            entities={entities || []}
            areas={areas}
            floors={floors}
            entityRegistry={entityRegistry}
            devices={devices}
            contextId="panel-rooms-fallback"
            filterFavorites={false}
          />
        </div>
      </div>
    );
  }

  // Affichage des plans Neolia (MaisonTabletPanelView)
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="w-full px-4 pt-[24px] flex-1 flex flex-col overflow-hidden">
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
}
