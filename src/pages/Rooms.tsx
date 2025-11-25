import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHAStore } from "@/store/useHAStore";
import { useState, useEffect, useMemo } from "react";
import { FileJson, Image as ImageIcon, MapPin, Grid3x3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { checkAllFloorsNeoliaAssets, type NeoliaFloorAsset } from "@/services/neoliaFloorAssets";
import { RoomDevicesGrid } from "@/components/RoomDevicesGrid";
import { getEntityDomain } from "@/lib/entityUtils";
import type { HAConnection, HAFloor, HAArea } from "@/types/homeassistant";
import { cn } from "@/lib/utils";

// ============== MaisonTabletPanelView ==============
interface MaisonTabletPanelViewProps {
  connection: HAConnection | null;
  floors: HAFloor[];
  neoliaAssets: NeoliaFloorAsset[];
}

const MaisonTabletPanelView = ({
  connection,
  floors,
  neoliaAssets,
}: MaisonTabletPanelViewProps) => {
  const areas = useHAStore((state) => state.areas);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(undefined);

  // Initialiser la sélection d'étage
  useEffect(() => {
    if (neoliaAssets.length > 0 && !selectedFloorId) {
      // Sélectionner le premier étage avec PNG disponible
      const withPng = neoliaAssets.find((a) => a.pngAvailable);
      if (withPng) {
        setSelectedFloorId(withPng.floorId);
      } else {
        // Sinon, le premier étage
        setSelectedFloorId(neoliaAssets[0].floorId);
      }
    }
  }, [neoliaAssets, selectedFloorId]);

  // Réinitialiser selectedAreaId quand on change d'étage
  useEffect(() => {
    setSelectedAreaId(undefined);
  }, [selectedFloorId]);

  const selectedAsset = useMemo(() => {
    return neoliaAssets.find((a) => a.floorId === selectedFloorId);
  }, [neoliaAssets, selectedFloorId]);

  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return areas.find((a) => a.area_id === selectedAreaId) || null;
  }, [selectedAreaId, areas]);

  const planImageUrl = useMemo(() => {
    if (!connection || !selectedAsset?.pngAvailable) return null;
    return `${connection.url}/local/neolia/${selectedAsset.floorId}.png`;
  }, [connection, selectedAsset]);

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

  if (neoliaAssets.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-2xl">Plans Neolia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Impossible de vérifier les plans Neolia pour le moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-2xl">Plans Neolia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ligne des boutons d'étage */}
        <div className="flex flex-wrap gap-2">
          {neoliaAssets.map((asset) => {
            const isSelected = asset.floorId === selectedFloorId;
            const incomplete = !asset.pngAvailable || !asset.jsonAvailable;

            return (
              <button
                key={asset.floorId}
                type="button"
                onClick={() => setSelectedFloorId(asset.floorId)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all border relative",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
              >
                {asset.floorName}
                {incomplete && (
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
        <div className="flex gap-4">
          {/* Conteneur plan */}
          <div className="flex-1 relative aspect-[16/9] max-h-[70vh] rounded-xl overflow-hidden bg-muted/40 border border-border/40">
            {selectedAsset?.pngAvailable && planImageUrl ? (
              <>
                <img
                  src={planImageUrl}
                  alt={`Plan de ${selectedAsset.floorName}`}
                  className="w-full h-full object-contain"
                />
                {/* Overlay des boutons de pièces */}
                {selectedAsset.jsonAvailable &&
                  selectedAsset.jsonData &&
                  selectedAsset.jsonData.polygons.length > 0 && (
                    <>
                      {selectedAsset.jsonData.polygons.map((polygon, index) => {
                        // Calculer le centre du polygone
                        const centerX =
                          polygon.relative.reduce((sum, point) => sum + point[0], 0) /
                          polygon.relative.length;
                        const centerY =
                          polygon.relative.reduce((sum, point) => sum + point[1], 0) /
                          polygon.relative.length;

                        const area = areas.find((a) => a.area_id === polygon.area_id);
                        const roomName = area?.name || polygon.area_id;

                        return (
                          <button
                            key={`${polygon.area_id}-${index}`}
                            type="button"
                            onClick={() => setSelectedAreaId(polygon.area_id)}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-medium backdrop-blur border shadow-sm transition-colors",
                              selectedAreaId === polygon.area_id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background/80 border-border/60 hover:bg-primary hover:text-primary-foreground"
                            )}
                            style={{
                              position: "absolute",
                              left: `${centerX * 100}%`,
                              top: `${centerY * 100}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            {roomName}
                          </button>
                        );
                      })}
                    </>
                  )}
                {/* Message si JSON manquant */}
                {!selectedAsset.jsonAvailable && (
                  <div className="absolute inset-0 flex items-end justify-center pb-4">
                    <p className="text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-1 rounded-full border border-border/60">
                      Zones non configurées pour cet étage.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground text-center px-4">
                  Plan PNG manquant pour cet étage. Exportez le plan depuis Neolia Configurator.
                </p>
              </div>
            )}
          </div>

          {/* Colonne de droite : appareils de la pièce sélectionnée */}
          <div className="w-[320px] max-w-[35%] flex-shrink-0 space-y-4">
            {selectedAreaId && selectedArea ? (
              <>
                <h3 className="text-lg font-semibold">
                  Pièce : {selectedArea.name}
                </h3>
                <RoomDevicesGrid areaId={selectedAreaId} />
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Sélectionnez une pièce sur le plan pour voir les appareils.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============== MaisonMobileView ==============
interface MaisonMobileViewProps {
  connection: HAConnection | null;
  floors: HAFloor[];
  neoliaAssets: NeoliaFloorAsset[];
}

const MaisonMobileView = ({
  connection,
  floors,
  neoliaAssets,
}: MaisonMobileViewProps) => {
  const areas = useHAStore((state) => state.areas);
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);

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

  return (
    <div className="space-y-6">
      {/* Infos sur les plans */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-xl">Plans Neolia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {neoliaAssets.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun plan disponible. Configurez vos plans avec Neolia Configurator dans Home Assistant.
            </p>
          ) : (
            neoliaAssets.map((asset) => (
              <div
                key={asset.floorId}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{asset.floorName}</h3>
                  <p className="text-sm text-muted-foreground">{asset.floorId}</p>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={asset.pngAvailable ? "default" : "destructive"}
                    className="gap-1"
                  >
                    <ImageIcon size={14} />
                    {asset.pngAvailable ? "PNG OK" : "PNG manquant"}
                  </Badge>
                  <Badge
                    variant={asset.jsonAvailable ? "default" : "destructive"}
                    className="gap-1"
                  >
                    <FileJson size={14} />
                    {asset.jsonAvailable ? "JSON OK" : "JSON manquant"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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
  const rootClassName = displayMode === "mobile" ? "min-h-screen bg-background pb-20" : "min-h-screen bg-background";
  const contentPaddingTop = displayMode === "mobile" ? "pt-[138px]" : "pt-[24px]";

  const [neoliaAssets, setNeoliaAssets] = useState<NeoliaFloorAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Vérifier les assets Neolia au chargement
  useEffect(() => {
    const loadNeoliaAssets = async () => {
      if (!connection) {
        console.warn("⚠️ Connexion HA non disponible, impossible de vérifier les assets Neolia");
        return;
      }

      if (!floors || floors.length === 0) {
        console.debug("ℹ️ Aucun étage configuré");
        return;
      }

      console.log("🔄 Démarrage de la vérification des assets Neolia...");
      console.debug("Connection URL:", connection.url);
      console.debug("Nombre d'étages:", floors.length);

      setIsLoadingAssets(true);
      try {
        const results = await checkAllFloorsNeoliaAssets(
          floors,
          connection.url,
          connection.token,
          true // includeJson
        );
        setNeoliaAssets(results);
        console.log("✅ Assets Neolia chargés:", results);
      } catch (error) {
        console.error("❌ Erreur lors de la vérification des assets Neolia:", error);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    loadNeoliaAssets();
  }, [connection, floors]);

  return (
    <div className={rootClassName}>
      <TopBar title="Maison" />
      <div className={`w-full ${displayMode === "mobile" ? "px-[26px]" : "px-4"} pb-[26px] ${contentPaddingTop}`}>
        {isLoadingAssets ? (
          <Card className="animate-fade-in">
            <CardContent className="py-8">
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        ) : displayMode === "mobile" ? (
          <MaisonMobileView
            connection={connection}
            floors={floors}
            neoliaAssets={neoliaAssets}
          />
        ) : (
          <MaisonTabletPanelView
            connection={connection}
            floors={floors}
            neoliaAssets={neoliaAssets}
          />
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Rooms;
