import { MapPin } from "lucide-react";
import { HAFloor, HAArea } from "@/types/homeassistant";

interface LocationBadgeProps {
  floor?: HAFloor | null;
  area?: HAArea | null;
}

export const LocationBadge = ({ floor, area }: LocationBadgeProps) => {
  if (!area && !floor) return null;

  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/60 backdrop-blur-md border border-border/40 shadow-sm">
      <MapPin className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">
        {floor && <span>{floor.name} · </span>}
        {area?.name || "Sans pièce"}
      </span>
    </div>
  );
};
