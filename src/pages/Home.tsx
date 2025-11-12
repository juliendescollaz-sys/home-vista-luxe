import { useHAStore } from "@/store/useHAStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherCard } from "@/components/WeatherCard";
import { DeviceCard } from "@/components/DeviceCard";
import { MediaPlayerCard } from "@/components/MediaPlayerCard";
import { toast } from "sonner";

const Home = () => {
  const entities = useHAStore((state) => state.entities);
  const favorites = useHAStore((state) => state.favorites);
  const isConnected = useHAStore((state) => state.isConnected);

  // Appareils actifs uniquement (lumières, switches actifs + media_player en lecture)
  const activeDevices = entities?.filter(e => {
    if (e.entity_id.startsWith("light.") || e.entity_id.startsWith("switch.")) {
      return e.state === "on";
    }
    if (e.entity_id.startsWith("media_player.")) {
      return e.state === "playing";
    }
    return false;
  }) || [];

  // Raccourcis (favoris)
  const shortcuts = entities?.filter(e => favorites.includes(e.entity_id)) || [];

  const handleDeviceToggle = (entityId: string) => {
    // TODO: Implémenter le toggle via HA
    toast.info("Contrôle de l'appareil à venir");
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-20">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar />
      
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Section météo */}
        <div className="animate-fade-in">
          <WeatherCard />
        </div>

        {/* Équipements actifs */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-2xl font-bold">Équipements actifs</h2>
          
          {activeDevices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun appareil actif
            </p>
          ) : (
            <div className="space-y-3">
              {activeDevices.map((device) => {
                const isMediaPlayer = device.entity_id.startsWith("media_player.");
                return isMediaPlayer ? (
                  <MediaPlayerCard
                    key={device.entity_id}
                    entity={device}
                  />
                ) : (
                  <DeviceCard
                    key={device.entity_id}
                    entity={device}
                    onToggle={handleDeviceToggle}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Raccourcis */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-2xl font-bold">Raccourcis</h2>
          
          {shortcuts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun raccourci configuré
              <br />
              <span className="text-sm">Ajoutez des favoris depuis les autres pages</span>
            </p>
          ) : (
            <div className="space-y-3">
              {shortcuts.map((device) => {
                const isMediaPlayer = device.entity_id.startsWith("media_player.");
                return isMediaPlayer ? (
                  <MediaPlayerCard
                    key={device.entity_id}
                    entity={device}
                  />
                ) : (
                  <DeviceCard
                    key={device.entity_id}
                    entity={device}
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
