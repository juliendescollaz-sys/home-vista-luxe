import { useHAStore } from "@/store/useHAStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedWeatherTile } from "@/components/weather/AnimatedWeatherTile";
import { DeviceCard } from "@/components/DeviceCard";
import { MediaPlayerCard } from "@/components/MediaPlayerCard";
import { toast } from "sonner";
import { useEffect } from "react";

const Home = () => {
  const client = useHAStore((state) => state.client);
  const entities = useHAStore((state) => state.entities);
  const favorites = useHAStore((state) => state.favorites);
  const isConnected = useHAStore((state) => state.isConnected);
  const entityRegistry = useHAStore((state) => state.entityRegistry);

  // Trouver les device_id des media_players pour filtrer leurs entités associées
  const mediaPlayerDeviceIds = new Set(
    entities
      ?.filter((entity) => entity.entity_id.startsWith("media_player."))
      .map((entity) => {
        const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
        return reg?.device_id;
      })
      .filter(Boolean) || []
  );

  // Appareils actifs uniquement (lumières, switches actifs + media_player en lecture)
  // Exclure les entités associées aux media_players (volume, loudness, etc.)
  const activeDevices = entities?.filter(e => {
    // Vérifier si cette entité appartient au device d'un media_player
    const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
    const deviceId = reg?.device_id;
    
    // Si c'est une entité associée à un media_player (mais pas le media_player lui-même), l'exclure
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
      toast.error("Erreur lors du contrôle de l'appareil");
    }
  };


  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-16">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-16">
      <TopBar />
      
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* Section météo */}
        <div className="animate-fade-in">
          <AnimatedWeatherTile />
        </div>

        {/* Appareils actifs */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-2xl font-bold">Appareils actifs</h2>
          
          {activeDevices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun appareil actif
            </p>
          ) : (
            <div className="space-y-3">
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

      <BottomNav />
    </div>
  );
};

export default Home;
