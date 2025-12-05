import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHAStore } from "@/store/useHAStore";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { HomeOverviewByTypeAndArea } from "@/components/HomeOverviewByTypeAndArea";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ChevronLeft, Info, Loader2, Map, Maximize2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DraggableRoomLabel } from "@/components/DraggableRoomLabel";
import { RoomDevicesGrid } from "@/components/RoomDevicesGrid";
import { NeoliaCanvasWrapper } from "@/components/NeoliaCanvasWrapper";

const Rooms = () => {
  const navigate = useNavigate();
  const { displayMode } = useDisplayMode();

  const connection = useHAStore((state) => state.connection);
  const floors = useHAStore((state) => state.floors);
  const areas = useHAStore((state) => state.areas);
  const entities = useHAStore((state) => state.entities);
  const devices = useHAStore((state) => state.devices);
  const entityRegistry = useHAStore((state) => state.entityRegistry);

  const neoliaFloorPlans = useHAStore((state) => state.neoliaFloorPlans);
  const selectedFloorId = useHAStore((state) => state.selectedFloorId);
  const setSelectedFloorId = useHAStore((state) => state.setSelectedFloorId);
  const selectedAreaId = useHAStore((state) => state.selectedAreaId);
  const setSelectedAreaId = useHAStore((state) => state.setSelectedAreaId);
  const labelPositions = useHAStore((state) => state.labelPositions);
  const setLabelPosition = useHAStore((state) => state.setLabelPosition);
  const isLoadingNeoliaPlans = useHAStore((state) => state.isLoadingNeoliaPlans);
  const loadNeoliaPlans = useHAStore((state) => state.loadNeoliaPlans);

  // Layout tablette/panel
  const isTablet = displayMode === "tablet";
  const isPanel = displayMode === "panel";

  const rootClassName = isTablet || isPanel
    ? "w-full h-full flex flex-col overflow-hidden"
    : "min-h-screen bg-background";

  const ptClass =
    displayMode === "mobile"
      ? "pt-28"
      : isTablet || isPanel
      ? "pt-[24px]"
      : "pt-[26px]";

  // État "HA initialisé" pour éviter le flash de HomeOverviewByTypeAndArea
  const isHAInitialized = !!connection && floors.length > 0;

  // Vérifier si au moins un plan est complet (PNG + JSON)
  const hasUsablePlans =
    neoliaFloorPlans.some((plan) => plan.hasPng && plan.hasJson);

  // Charger les plans Neolia au démarrage (fallback au cas où le préloader ne serait pas passé)
  useEffect(() => {
    if (
      isHAInitialized &&
      !isLoadingNeoliaPlans &&
      neoliaFloorPlans.length === 0
    ) {
      console.info("[Neolia ROOMS] Chargement initial des plans (Rooms)");
      loadNeoliaPlans(connection!, floors);
    }
  }, [
    isHAInitialized,
    isLoadingNeoliaPlans,
    neoliaFloorPlans.length,
    loadNeoliaPlans,
    connection,
    floors,
  ]);

  // Spinner pendant toute l'init (HA + plans)
  const shouldShowPlansSpinner =
    !isHAInitialized ||
    isLoadingNeoliaPlans ||
    (!hasUsablePlans && neoliaFloorPlans.length === 0);

  // Sélection d'étage par défaut
  useEffect(() => {
    if (!hasUsablePlans || neoliaFloorPlans.length === 0) return;

    if (!selectedFloorId) {
      const firstWithAssets =
        neoliaFloorPlans.find((p) => p.hasPng && p.hasJson) ??
        neoliaFloorPlans[0];
      if (firstWithAssets) {
        setSelectedFloorId(firstWithAssets.floorId);
      }
    }
  }, [
    hasUsablePlans,
    neoliaFloorPlans,
    selectedFloorId,
    setSelectedFloorId,
  ]);

  // Réinitialiser la pièce sélectionnée si on change d'étage
  useEffect(() => {
    setSelectedAreaId(null);
  }, [selectedFloorId, setSelectedAreaId]);

  const selectedPlan = useMemo(() => {
    if (!selectedFloorId) return null;
    return (
      neoliaFloorPlans.find((p) => p.floorId === selectedFloorId) || null
    );
  }, [neoliaFloorPlans, selectedFloorId]);

  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return areas.find((a) => a.area_id === selectedAreaId) || null;
  }, [areas, selectedAreaId]);

  const content = (
    <div className={rootClassName}>
      <ScrollToTop />
      <div
        className={cn(
          "w-full",
          displayMode === "mobile"
            ? "px-4"
            : isTablet || isPanel
            ? "px-4"
            : "max-w-screen-xl mx-auto px-4"
        )}
      >
        {/* Header (mobile / desktop uniquement) */}
        {!isTablet && !isPanel && (
          <div className={cn("flex items-center gap-4", ptClass)}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center justify-between w-full">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Maison
                </h1>
                <p className="text-sm text-muted-foreground">
                  Visualisez vos pièces et contrôlez vos appareils
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contenu principal (mobile / desktop / tablet / panel) */}
        <div
          className={cn(
            "w-full",
            isTablet || isPanel
              ? "mt-0 h-full flex flex-col"
              : "mt-4 pb-6 space-y-4"
          )}
        >
          {/* SPINNER ou PLANS ou fallback par type/localisation */}
          {isTablet || isPanel ? (
            // Vue dédiée tablette/panel
            shouldShowPlansSpinner ? (
              <div className="flex items-center justify-center w-full h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Chargement des plans...
                  </p>
                </div>
              </div>
            ) : hasUsablePlans && selectedPlan ? (
              <MaisonTabletPanelView
                selectedPlan={selectedPlan}
                floors={floors}
                areas={areas}
                entities={entities}
                devices={devices}
                entityRegistry={entityRegistry}
                selectedFloorId={selectedFloorId}
                setSelectedFloorId={setSelectedFloorId}
                selectedAreaId={selectedAreaId}
                setSelectedAreaId={setSelectedAreaId}
                labelPositions={labelPositions}
                setLabelPosition={setLabelPosition}
              />
            ) : (
              <HomeOverviewByTypeAndArea
                entities={entities || []}
                areas={areas}
                floors={floors}
                entityRegistry={entityRegistry}
                devices={devices}
                contextId="home-overview"
                filterFavorites={false}
              />
            )
          ) : // Vue mobile/desktop "classique"
          hasUsablePlans && selectedPlan ? (
            <MaisonTabletPanelView
              selectedPlan={selectedPlan}
              floors={floors}
              areas={areas}
              entities={entities}
              devices={devices}
              entityRegistry={entityRegistry}
              selectedFloorId={selectedFloorId}
              setSelectedFloorId={setSelectedFloorId}
              selectedAreaId={selectedAreaId}
              setSelectedAreaId={setSelectedAreaId}
              labelPositions={labelPositions}
              setLabelPosition={setLabelPosition}
            />
          ) : (
            <HomeOverviewByTypeAndArea
              entities={entities || []}
              areas={areas}
              floors={floors}
              entityRegistry={entityRegistry}
              devices={devices}
              contextId="home-overview"
              filterFavorites={false}
            />
          )}
        </div>
      </div>
    </div>
  );

  return content;
};

export default Rooms;

/**
 * Vue maison "plans" partagée entre Tablet et Panel (et utilisée aussi sur desktop quand les plans existent)
 */
interface MaisonTabletPanelViewProps {
  selectedPlan: {
    floorId: string;
    floorName: string;
    hasPng: boolean;
    hasJson: boolean;
    imageUrl?: string;
    json?: {
      floorId: string;
      areas: { areaId: string; name: string }[];
      polygons: { areaId: string; relative: [number, number][] }[];
    };
  };
  floors: { floor_id: string; name: string; level: number }[];
  areas: { area_id: string; name: string; floor_id?: string }[];
  entities: any[];
  devices: any[];
  entityRegistry: any[];
  selectedFloorId: string | null;
  setSelectedFloorId: (id: string | null) => void;
  selectedAreaId: string | null;
  setSelectedAreaId: (id: string | null) => void;
  labelPositions: Record<string, { x: number; y: number }>;
  setLabelPosition: (
    floorId: string,
    areaId: string,
    x: number,
    y: number
  ) => void;
}

export const MaisonTabletPanelView = ({
  selectedPlan,
  floors,
  areas,
  entities,
  devices,
  entityRegistry,
  selectedFloorId,
  setSelectedFloorId,
  selectedAreaId,
  setSelectedAreaId,
  labelPositions,
  setLabelPosition,
}: MaisonTabletPanelViewProps) => {
  const { displayMode } = useDisplayMode();
  const isPanel = displayMode === "panel";

  const areasFromJson = selectedPlan.json?.areas || [];

  const polygons = useMemo(() => {
    if (!selectedPlan.json?.polygons) return [];

    const withMapping = selectedPlan.json.polygons.map((polygon) => {
      const areaFromJson = areasFromJson.find(
        (a) => a.areaId === polygon.areaId
      );
      const haAreaById =
        areas.find((a) => a.area_id === polygon.areaId) || null;

      const haAreaByName =
        areaFromJson
          ? areas.find(
              (a) =>
                a.name.toLowerCase() === areaFromJson.name.toLowerCase()
            ) || null
          : null;

      const haArea = haAreaById || haAreaByName || null;

      const effectiveAreaId = haArea?.area_id ?? polygon.areaId;
      const displayName = haArea?.name ?? areaFromJson?.name ?? "Pièce";

      return {
        polygon,
        haArea,
        areaFromJson,
        effectiveAreaId,
        displayName,
      };
    });

    return withMapping.sort((a, b) => {
      const nameA = a.displayName.toLowerCase();
      const nameB = b.displayName.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [selectedPlan.json?.polygons, areasFromJson, areas]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return areas.find((a) => a.area_id === selectedAreaId) || null;
  }, [areas, selectedAreaId]);

  const areaIdForDevices = selectedArea?.area_id ?? selectedAreaId ?? undefined;

  const handleRoomClick = (areaId: string | null) => {
    console.info("[Neolia Maison] Click sur pièce:", areaId);
    setSelectedAreaId(areaId);
  };

  const floorTabs = (
    <Tabs
      value={selectedFloorId || selectedPlan.floorId}
      onValueChange={(value) => setSelectedFloorId(value)}
      className="w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <TabsList>
          {floors.map((floor) => (
            <TabsTrigger
              key={floor.floor_id}
              value={floor.floor_id}
              className="px-4"
            >
              {floor.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full",
                    isFullscreen && "bg-primary/10"
                  )}
                  onClick={() => setIsFullscreen((prev) => !prev)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isFullscreen
                    ? "Réduire l'affichage du plan"
                    : "Agrandir le plan"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {floors.map((floor) => (
        <TabsContent key={floor.floor_id} value={floor.floor_id} className="mt-0">
          {floor.floor_id === selectedPlan.floorId ? (
            <div
              className={cn(
                "relative flex-1",
                isFullscreen
                  ? "h-[calc(100vh-220px)]"
                  : "h-[480px] md:h-[540px]"
              )}
            >
              <NeoliaCanvasWrapper className="w-full h-full">
                <div className="relative flex-1 overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-lg">
                  {selectedPlan.imageUrl ? (
                    <>
                      <div className="absolute inset-0 overflow-hidden">
                        <img
                          src={selectedPlan.imageUrl}
                          alt={selectedPlan.floorName}
                          className={cn(
                            "h-full w-full object-contain transition-all duration-500",
                            isFullscreen ? "scale-[1.01]" : "scale-[0.98]"
                          )}
                          draggable={false}
                        />
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/50 via-slate-950/40 to-black/70 pointer-events-none" />

                      <div className="absolute top-3 left-4 z-20 flex flex-col gap-1 pointer-events-none">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-sm">
                          <Map className="h-3.5 w-3.5 text-emerald-300" />
                          <span className="text-xs font-medium text-emerald-100 tracking-wide">
                            Vue interactive
                          </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/25 backdrop-blur-md border border-white/5 shadow-sm">
                          <Info className="h-3.5 w-3.5 text-sky-300" />
                          <span className="text-[11px] text-slate-100/80">
                            Touchez une pièce pour afficher les appareils
                          </span>
                        </div>
                      </div>

                      <div className="absolute inset-0 pointer-events-none">
                        {polygons.map(
                          ({ polygon, effectiveAreaId, displayName }) => {
                            const key = `${selectedPlan.floorId}:${polygon.areaId}`;
                            const override = labelPositions[key];

                            return (
                              <DraggableRoomLabel
                                key={key}
                                floorId={selectedPlan.floorId}
                                areaId={effectiveAreaId}
                                label={displayName}
                                relativePoints={polygon.relative}
                                initialPosition={
                                  override
                                    ? override
                                    : { x: 0.5, y: 0.5 }
                                }
                                onPositionChange={(x, y) =>
                                  setLabelPosition(
                                    selectedPlan.floorId,
                                    polygon.areaId,
                                    x,
                                    y
                                  )
                                }
                                isSelected={selectedAreaId === effectiveAreaId}
                                onClickRoom={handleRoomClick}
                              />
                            );
                          }
                        )}
                      </div>

                      {selectedAreaId && (
                        <>
                          <div
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40"
                            onClick={() => setSelectedAreaId(null)}
                          />

                          <div
                            className={cn(
                              "absolute top-0 right-0 h-full w-[380px] max-w-[85%] bg-background/95 border-l border-border/60 shadow-2xl z-50 flex flex-col",
                              "transition-transform duration-300 ease-out",
                              selectedAreaId
                                ? "translate-x-0"
                                : "translate-x-full"
                            )}
                          >
                            {selectedArea && (
                              <>
                                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between bg-muted/50">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                      Pièce
                                    </span>
                                    <span className="font-semibold text-sm">
                                      {selectedArea.name}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => setSelectedAreaId(null)}
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                  {areaIdForDevices && (
                                    <RoomDevicesGrid
                                      areaId={areaIdForDevices}
                                      areas={areas}
                                      entities={entities}
                                      devices={devices}
                                      entityRegistry={entityRegistry}
                                    />
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <p>Aucun plan disponible pour cet étage.</p>
                    </div>
                  )}
                </div>
              </NeoliaCanvasWrapper>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              <p>Plan non disponible pour cet étage.</p>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );

  return (
    <div className="animate-fade-in flex flex-col h-full relative rounded-3xl p-4 overflow-hidden glass-card elevated-subtle border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <span>Plans de la maison</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              interactif
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualisez les pièces sur le plan et contrôlez les appareils de
            chaque zone.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">{floorTabs}</div>
    </div>
  );
};
