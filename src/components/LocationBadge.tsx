import { MapPin } from "lucide-react";
import { HAFloor, HAArea } from "@/types/homeassistant";

interface LocationBadgeProps {
  floor?: HAFloor | null;
  area?: HAArea | null;
}

export const LocationBadge = ({ floor, area }: LocationBadgeProps) => {
  if (!area && !floor) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-background/70 backdrop-blur-md border-b border-border/30">
      <MapPin className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">
        {floor && <span>{floor.name} · </span>}
        {area?.name || "Sans pièce"}
      </span>
    </div>
  );
};
