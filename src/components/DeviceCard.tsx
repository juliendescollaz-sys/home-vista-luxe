import { Card } from "@/components/ui/card";
import { Lightbulb, Thermometer, Music, Lock, Camera, MoreVertical, Power, Star } from "lucide-react";
import type { HAEntity, EntityDomain, HAFloor, HAArea } from "@/types/homeassistant";
import { Switch } from "@/components/ui/switch";
import { useHAStore } from "@/store/useHAStore";
import { Button } from "@/components/ui/button";
import { LocationBadge } from "./LocationBadge";

const domainIcons: Record<EntityDomain, any> = {
  light: Lightbulb,
  climate: Thermometer,
  media_player: Music,
  lock: Lock,
  camera: Camera,
  switch: Power,
  sensor: Thermometer,
  binary_sensor: Thermometer,
  cover: MoreVertical,
  scene: Lightbulb,
  script: Lightbulb,
  button: Lightbulb,
};

interface DeviceCardProps {
  entity: HAEntity;
  onToggle?: (entityId: string) => void;
  floor?: HAFloor | null;
  area?: HAArea | null;
}

export const DeviceCard = ({ entity, onToggle, floor, area }: DeviceCardProps) => {
  const domain = entity.entity_id.split(".")[0] as EntityDomain;
  const Icon = domainIcons[domain] || MoreVertical;
  const isActive = entity.state === "on";
  const name = entity.attributes.friendly_name || entity.entity_id;
  
  const favorites = useHAStore((state) => state.favorites);
  const toggleFavorite = useHAStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(entity.entity_id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(entity.entity_id);
  };

  return (
    <Card className="group relative overflow-hidden glass-card elevated-subtle elevated-active border-border/50">
      <LocationBadge floor={floor} area={area} />
      
      <div className="relative pt-10 p-4">
        <div className="flex items-start gap-2">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-lg flex-shrink-0 transition-colors flex items-center justify-center ${
            isActive ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Icon className="h-8 w-8" />
          </div>
          
          {/* Title & State */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{entity.state}</p>
          </div>

          {/* Favorite */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-1 -mr-1 bg-transparent active:bg-accent/50 active:scale-95 transition-all flex-shrink-0"
            onClick={handleFavoriteClick}
          >
            <Star className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </div>

        {/* Switch at bottom */}
        {(domain === "light" || domain === "switch") && (
          <div className="mt-4 pt-1.5 flex justify-end">
            <Switch
              checked={isActive}
              onCheckedChange={() => onToggle?.(entity.entity_id)}
              className="data-[state=checked]:bg-primary scale-125"
            />
          </div>
        )}
      </div>
    </Card>
  );
};
