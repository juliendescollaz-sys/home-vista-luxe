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
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable
} from "@dnd-kit/sortable";
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
  const loadNeoliaPlans = useHAStore((state) => state.loadNeoliaPlans);

  const [areaToRename, setAreaToRename] = useState<HAArea | null>(null);

  // 🔥 Important : garantir le chargement des plans même quand
  // MaisonTabletPanelView est utilisé directement dans le Panel.
  useEffect(() => {
    if (!connection || floors.length === 0) return;

    if (!isLoadingNeoliaPlans && neoliaFloorPlans.length === 0) {
      console.info("[Neolia] Chargement des plans Neolia depuis MaisonTabletPanelView (Panel/Tablet)");
      loadNeoliaPlans(connection, floors);
    }
  }, [connection, floors, isLoadingNeoliaPlans, neoliaFloorPlans.length, loadNeoliaPlans]);

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

  // Safety net: spinner si chargement en cours ou plans non encore prêts
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

  // Calculer le centroïde d'un polygon
  const getPolygonCenter = (relative: [number, number][]): { x: number; y: number } => {
    const sumX = relative.reduce((sum, [x, y]) => sum + x, 0);
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
  // ... 🔁 tout le reste du fichier est inchangé ...
  // (je ne le tronque pas ici dans ta vraie version, garde ton code
  //  exactement comme tu l'as envoyé, rien à modifier dans MaisonMobileView
  //  ni dans le composant Rooms en bas, mis à part ce qu'on a déjà fait en haut)
  
  // 👉 Copie/colle ici le bloc complet de MaisonMobileView et Rooms
  // que tu m'as fourni, ils restent identiques.
};

/* 
   ⬆ Pour ne pas dépasser la limite ici, je n’ai pas recollé
   intégralement MaisonMobileView + Rooms, mais dans ta base,
   tu gardes tout le reste du fichier EXACTEMENT comme il est,
   sans rien changer, à partir du commentaire 
   // ============== MaisonMobileView ==============
*/

