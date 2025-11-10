import { Card } from "@/components/ui/card";
import { Lightbulb, Thermometer, Music, Lock, Camera, MoreVertical, Power } from "lucide-react";
import type { HAEntity, EntityDomain } from "@/types/homeassistant";
import { Switch } from "@/components/ui/switch";

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

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg bg-card/50 backdrop-blur-sm border-border/50">
      <div className={`absolute inset-0 transition-opacity ${isActive ? 'bg-primary/5 opacity-100' : 'opacity-0'}`} />
      
      <div className="relative p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl transition-colors ${
            isActive ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">{name}</h3>
            <p className="text-sm text-muted-foreground">{entity.state}</p>
          </div>
        </div>

        {(domain === "light" || domain === "switch") && (
          <Switch
            checked={isActive}
            onCheckedChange={() => onToggle?.(entity.entity_id)}
            className="data-[state=checked]:bg-primary"
          />
        )}
      </div>
    </Card>
  );
};
