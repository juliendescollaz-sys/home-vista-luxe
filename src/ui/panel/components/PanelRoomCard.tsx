import { Card } from "@/components/ui/card";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { HAArea } from "@/types/homeassistant";
import { useHAStore } from "@/store/useHAStore";

interface PanelRoomCardProps {
  area: HAArea;
}

export const PanelRoomCard = ({ area }: PanelRoomCardProps) => {
  const navigate = useNavigate();
  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);

  // Calculer le nombre d'appareils contrôlables dans cette pièce
  const deviceCount = entities?.filter((entity) => {
    const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
    if (reg?.area_id !== area.area_id) return false;

    return (
      entity.entity_id.startsWith("light.") ||
      entity.entity_id.startsWith("switch.") ||
      entity.entity_id.startsWith("media_player.") ||
      entity.entity_id.startsWith("cover.") ||
      entity.entity_id.startsWith("climate.") ||
      entity.entity_id.startsWith("fan.")
    );
  }).length || 0;

  return (
    <Card 
      onClick={() => navigate(`/rooms/${area.area_id}`)}
      className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer touch-manipulation active:scale-[0.98] elevated-subtle" 
    >
      <div className="aspect-video relative overflow-hidden">
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
          <Home className="h-16 w-16 text-muted-foreground/40" />
        </div>
      </div>
      
      <div className="p-4 relative">
        <h3 className="font-semibold text-xl mb-1">{area.name}</h3>
        <p className="text-sm text-muted-foreground">
          {deviceCount} {deviceCount === 1 ? "appareil" : "appareils"}
        </p>
      </div>
    </Card>
  );
};
