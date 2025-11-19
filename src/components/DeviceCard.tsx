import { Card } from "@/components/ui/card";
import { Lightbulb, Thermometer, Music, Lock, Camera, MoreVertical, Power, Star } from "lucide-react";
import type { HAEntity, EntityDomain } from "@/types/homeassistant";
import { Switch } from "@/components/ui/switch";
import { useHAStore } from "@/store/useHAStore";
import { Button } from "@/components/ui/button";

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
}

export const DeviceCard = ({ entity, onToggle }: DeviceCardProps) => {
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
      <div className={`absolute inset-0 transition-opacity ${isActive ? 'bg-primary/5 opacity-100' : 'opacity-0'}`} />
      
      <div className="relative p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`p-3 rounded-xl transition-colors ${
            isActive ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{name}</h3>
            <p className="text-sm text-muted-foreground">{entity.state}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-transparent active:bg-accent/50 active:scale-95 transition-all"
            onClick={handleFavoriteClick}
          >
            <Star className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </Button>
          
          {(domain === "light" || domain === "switch") && (
            <Switch
              checked={isActive}
              onCheckedChange={() => onToggle?.(entity.entity_id)}
              className="data-[state=checked]:bg-primary"
            />
          )}
        </div>
      </div>
    </Card>
  );
};
