import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  getRoomAndFloorForEntity,
  EntityRegistryEntry,
  DeviceRegistryEntry,
  NeoliaRoom,
  NeoliaFloor,
} from "@/utils/sceneDevices";
import {
  Lightbulb,
  Power,
  Thermometer,
  Music,
  Lock,
  Fan,
  Blinds,
  Droplet,
  Settings,
} from "lucide-react";

const getDomainIcon = (domain: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    light: Lightbulb,
    switch: Power,
    climate: Thermometer,
    media_player: Music,
    lock: Lock,
    fan: Fan,
    cover: Blinds,
    valve: Droplet,
  };
  return iconMap[domain] || Settings;
};

interface SceneDeviceItemProps {
  entityId: string;
  friendlyName: string;
  isSelected: boolean;
  onSelect: () => void;
  entityRegistry: Record<string, EntityRegistryEntry>;
  devices: DeviceRegistryEntry[];
  areas: NeoliaRoom[];
  floors: NeoliaFloor[];
  hideLocation?: boolean;
}

/**
 * Ligne appareil dans l'étape 2 du wizard de scène :
 * - Checkbox de sélection
 * - Icône + Nom de l'appareil
 * - Ligne secondaire : "Pièce • Étage" (si hideLocation=false)
 */
export const SceneDeviceItem: React.FC<SceneDeviceItemProps> = ({
  entityId,
  friendlyName,
  isSelected,
  onSelect,
  entityRegistry,
  devices,
  areas,
  floors,
  hideLocation = false,
}) => {
  const { roomName, floorName } = getRoomAndFloorForEntity(
    entityId,
    entityRegistry,
    devices,
    areas,
    floors,
  );

  const domain = entityId.split(".")[0];
  const Icon = getDomainIcon(domain);
  const label = friendlyName || entityId;

  const showLocation = !hideLocation && (roomName || floorName);

  return (
    <label
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
        "hover:bg-accent/50",
        isSelected && "bg-primary/10"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate">{label}</span>
        </div>
        {showLocation && roomName && floorName && (
          <span className="text-xs text-muted-foreground mt-0.5 ml-6 block truncate">
            {roomName} • {floorName}
          </span>
        )}
        {showLocation && roomName && !floorName && (
          <span className="text-xs text-muted-foreground mt-0.5 ml-6 block truncate">
            {roomName}
          </span>
        )}
      </div>
    </label>
  );
};
