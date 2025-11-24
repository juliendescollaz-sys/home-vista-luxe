import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { AnimatedWeatherTile } from "@/components/weather/AnimatedWeatherTile";
import { DeviceCard } from "@/components/DeviceCard";
import { MediaPlayerCard } from "@/components/MediaPlayerCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useMemo } from "react";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { getGridClasses } from "@/lib/gridLayout";

const Home = () => {
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const isConnected = useHAStore((state) => state.isConnected);
  const client = useHAStore((state) => state.client);
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-32" : "pt-10";

  // Trouver les device_id des media_players
  const mediaPlayerDeviceIds = useMemo(() => {
    return new Set(
      entities
        ?.filter((entity) => entity.entity_id.startsWith("media_player."))
        .map((entity) => {
          const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
          return reg?.device_id;
        })
        .filter(Boolean) || []
    );
  }, [entities, entityRegistry]);

  // Appareils actifs
  const activeDevices = useMemo(() => {
    return entities?.filter(e => {
      const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
      const deviceId = reg?.device_id;
      
      if (deviceId && mediaPlayerDeviceIds.has(deviceId) && !e.entity_id.startsWith("media_player.")) {
        return false;
      }

      if (e.entity_id.startsWith("light.") || e.entity_id.startsWith("switch.")) {
        return e.state === "on";
      }
      if (e.entity_id.startsWith("media_player.")) {
        return e.state === "playing";
      }
      return false;
    }) || [];
  }, [entities, entityRegistry, mediaPlayerDeviceIds]);

  const handleDeviceToggle = async (entityId: string) => {
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
      console.error("Erreur lors du contrôle:", error);
      toast.error("Erreur lors du contrôle");
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-64 w-96" />
        </div>
      </div>
    );
  }

  const rootClassName = displayMode === "mobile" 
    ? `min-h-screen bg-background pb-24 ${ptClass}`
    : "w-full h-full flex items-center justify-center";

  const contentClassName = displayMode === "mobile"
    ? "max-w-2xl mx-auto px-4 py-4 space-y-6"
    : "w-full max-w-[1800px] p-6 space-y-6";

  return (
    <div className={rootClassName}>
      <TopBar title="Accueil" />
      
      <div className={contentClassName}>
        {displayMode === "mobile" ? (
          // Layout mobile : météo + appareils actifs en colonne
          <>
            <div className="flex justify-center">
              <AnimatedWeatherTile />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold">Appareils actifs</h2>
              {activeDevices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun appareil actif
                </p>
              ) : (
                <div className={getGridClasses("devices", displayMode)}>
                  {activeDevices.map((entity) => {
                    const isMediaPlayer = entity.entity_id.startsWith("media_player.");
                    return isMediaPlayer ? (
                      <MediaPlayerCard
                        key={entity.entity_id}
                        entity={entity}
                      />
                    ) : (
                      <DeviceCard
                        key={entity.entity_id}
                        entity={entity}
                        onToggle={handleDeviceToggle}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          // Layout tablet/panel : grille avec météo à gauche, appareils actifs à droite
          <div className="grid grid-cols-4 gap-6 items-start">
            {/* Météo - 1 colonne */}
            <div className="col-span-1 flex justify-center self-start">
              <AnimatedWeatherTile />
            </div>

            {/* Appareils actifs - 3 colonnes */}
            <div className="col-span-3 space-y-3">
              <h2 className="text-2xl font-bold">Appareils actifs</h2>
              {activeDevices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun appareil actif
                </p>
              ) : (
                <div className={getGridClasses("devices", displayMode)}>
                  {activeDevices.map((entity) => {
                    const isMediaPlayer = entity.entity_id.startsWith("media_player.");
                    return isMediaPlayer ? (
                      <MediaPlayerCard
                        key={entity.entity_id}
                        entity={entity}
                      />
                    ) : (
                      <DeviceCard
                        key={entity.entity_id}
                        entity={entity}
                        onToggle={handleDeviceToggle}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Home;
