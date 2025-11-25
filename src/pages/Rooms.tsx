import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHAStore } from "@/store/useHAStore";
import { useState, useEffect } from "react";
import { FileJson, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { checkAllFloorsNeoliaAssets, type NeoliaFloorAsset } from "@/services/neoliaFloorAssets";

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
          connection.token
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
      <div className={`w-full ${displayMode === "mobile" ? "px-[26px]" : "px-4"} pb-[26px] ${contentPaddingTop} space-y-6`}>
        {/* Plans Neolia */}
        {connection && floors && floors.length > 0 ? (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl">Plans Neolia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingAssets ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : neoliaAssets.length === 0 ? (
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
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
};

export default Rooms;
