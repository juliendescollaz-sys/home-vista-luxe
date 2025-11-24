import { MapPin } from "lucide-react";
import { HAFloor, HAArea } from "@/types/homeassistant";

interface LocationBadgeProps {
  floor?: HAFloor | null;
  area?: HAArea | null;
}

export const LocationBadge = ({ floor, area }: LocationBadgeProps) => {
  if (!area && !floor) return null;

  return (
    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-background/90 backdrop-blur-md rounded-md border border-border/50 z-10">
      <MapPin className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">
        {floor && <span>{floor.name} · </span>}
        {area?.name || "Sans pièce"}
      </span>
    </div>
  );
};
