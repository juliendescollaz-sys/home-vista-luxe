import { Card } from "@/components/ui/card";
import { Lightbulb, Thermometer, Music, Lock, Camera, MoreVertical, Power } from "lucide-react";
import type { HAEntity, EntityDomain } from "@/types/homeassistant";
import { Switch } from "@/components/ui/switch";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const domainIcons: Partial<Record<EntityDomain, any>> = {
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
  const { displayMode } = useDisplayMode();
  
  // Tailles adaptées pour Panel et Tablet
  const isLarge = displayMode === "panel" || displayMode === "tablet";
  const iconSize = isLarge ? "h-9 w-9" : "h-8 w-8";
  const iconContainerSize = isLarge ? "w-16 h-16" : "w-14 h-14";
  const titleSize = isLarge ? "text-2xl" : "text-base";
  const stateSize = isLarge ? "text-lg" : "text-sm";

  return (
    <Card className="group relative overflow-hidden glass-card elevated-subtle elevated-active border-border/50">
      <div className="p-4 pt-10">
        <div className="flex items-start gap-2">
          {/* Icon */}
          <div className={`${iconContainerSize} rounded-lg flex-shrink-0 transition-colors flex items-center justify-center ${
            isActive ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Icon className={iconSize} />
          </div>
          
          {/* Title & State */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className={`font-semibold ${titleSize} truncate mb-0.5`}>{name}</h3>
            <p className={`${stateSize} text-muted-foreground capitalize`}>{entity.state}</p>
          </div>
        </div>

        {/* Switch at bottom */}
        {(domain === "light" || domain === "switch") && (
          <div className="mt-2 flex items-center justify-end">
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
