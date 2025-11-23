import { useHAStore } from "@/store/useHAStore";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import neoliaLogoLight from "@/assets/neolia-logo.png";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import { AnimatedWeatherTile } from "@/components/weather/AnimatedWeatherTile";
import { DeviceCard } from "@/components/DeviceCard";
import { MediaPlayerCard } from "@/components/MediaPlayerCard";
import { PanelRoomCard } from "../components/PanelRoomCard";
import { toast } from "sonner";

/**
 * Page d'accueil pour le mode PANEL (S563)
 * 
 * Dashboard mural plein écran avec :
 * - Layout dense optimisé pour utilisation maximale de l'espace
 * - Grandes tuiles tactiles
 * - Espacement minimal pour maximiser le contenu visible
 * - UI optimisée pour un écran fixe en paysage
 */
export function PanelHome() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const entities = useHAStore((state) => state.entities);
  const areas = useHAStore((state) => state.areas);
  const client = useHAStore((state) => state.client);
  const entityRegistry = useHAStore((state) => state.entityRegistry);

  // Trouver les device_id des media_players
  const mediaPlayerDeviceIds = new Set(
    entities
      ?.filter((entity) => entity.entity_id.startsWith("media_player."))
      .map((entity) => {
        const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
        return reg?.device_id;
      })
      .filter(Boolean) || []
  );

  // Appareils actifs
  const activeDevices = entities?.filter(e => {
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

  return (
    <div className="w-full h-full bg-background p-3 overflow-hidden">
      {/* Header compact */}
      <header className="flex items-center justify-between mb-3 px-2 flex-shrink-0">
        <img 
          src={theme === "light" ? neoliaLogoDark : neoliaLogoLight} 
          alt="Neolia" 
          className="h-10 w-auto"
        />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
          className="h-12 w-12"
        >
          <Settings className="h-6 w-6" />
        </Button>
      </header>

      {/* Grille principale dense - 4 colonnes */}
      <div className="grid grid-cols-4 gap-3 px-2 h-[calc(100%-80px)] overflow-hidden">
        {/* Météo - 1 colonne */}
        <div className="col-span-1 flex items-start justify-center">
          <AnimatedWeatherTile />
        </div>

        {/* Pièces - 2 colonnes */}
        <div className="col-span-2 space-y-3">
          <h2 className="text-2xl font-bold">Pièces</h2>
          <div className="grid grid-cols-2 gap-3">
            {areas.slice(0, 6).map((area) => (
              <PanelRoomCard
                key={area.area_id}
                area={area}
              />
            ))}
          </div>
        </div>

        {/* Appareils actifs - 1 colonne */}
        <div className="col-span-1 space-y-3">
          <h2 className="text-xl font-bold">Actifs</h2>
          <div className="space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-hide">
            {activeDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun appareil actif
              </p>
            ) : (
              activeDevices.map((entity) => {
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
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
