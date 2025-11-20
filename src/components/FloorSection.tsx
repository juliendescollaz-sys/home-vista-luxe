import { HAArea, HAFloor } from "@/types/homeassistant";
import { HADevice } from "@/types/homeassistant";
import { SortableRoomCard } from "./SortableRoomCard";
import { Badge } from "./ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { DisplayMode } from "@/hooks/useDisplayMode";
import { getGridClasses } from "@/lib/gridLayout";

interface FloorSectionProps {
  floor: HAFloor | null;
  areas: HAArea[];
  devices: HADevice[];
  areaPhotos: Record<string, string>;
  onPhotoChange: (areaId: string, file: File) => void;
  displayMode: DisplayMode;
  isCollapsible?: boolean;
}

export const FloorSection = ({
  floor,
  areas,
  devices,
  areaPhotos,
  onPhotoChange,
  displayMode,
  isCollapsible = false,
}: FloorSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getDeviceCount = (areaId: string) => {
    return devices.filter((device) => device.area_id === areaId && !device.disabled_by).length;
  };

  const totalDevices = areas.reduce((acc, area) => acc + getDeviceCount(area.area_id), 0);

  return (
    <div className="space-y-3">
      {/* Header de l'étage */}
      <div 
        className={`flex items-center justify-between py-2 ${isCollapsible ? 'cursor-pointer' : ''}`}
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            {floor ? floor.name : "Sans étage"}
          </h2>
          <Badge variant="secondary" className="text-xs">
            {areas.length} {areas.length === 1 ? "pièce" : "pièces"} • {totalDevices} {totalDevices === 1 ? "appareil" : "appareils"}
          </Badge>
        </div>
        {isCollapsible && (
          <button className="p-2 rounded-lg transition-colors">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Grille des pièces */}
      {isExpanded && (
        <div className={`${getGridClasses("rooms", displayMode)} animate-fade-in`}>
          {areas.map((area) => (
            <SortableRoomCard
              key={area.area_id}
              name={area.name}
              deviceCount={getDeviceCount(area.area_id)}
              customPhoto={areaPhotos[area.area_id]}
              onPhotoChange={(file) => onPhotoChange(area.area_id, file)}
              areaId={area.area_id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
