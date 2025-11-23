import { Card } from "@/components/ui/card";
import { Building2, ChevronRight } from "lucide-react";
import { HAFloor } from "@/types/homeassistant";
import { Badge } from "./ui/badge";
import { useDisplayMode } from "@/hooks/useDisplayMode";

interface FloorCardProps {
  floor: HAFloor | null;
  roomCount: number;
  deviceCount: number;
  onClick: () => void;
}

export const FloorCard = ({ floor, roomCount, deviceCount, onClick }: FloorCardProps) => {
  const { displayMode } = useDisplayMode();
  
  // Tailles adaptées pour Panel et Tablet
  const isLarge = displayMode === "panel" || displayMode === "tablet";
  const iconSize = isLarge ? "h-9 w-9" : "h-8 w-8";
  const iconContainerPadding = isLarge ? "p-5" : "p-4";
  const titleSize = isLarge ? "text-2xl" : "text-lg";
  const badgeSize = isLarge ? "text-base" : "text-xs";
  const chevronSize = isLarge ? "h-7 w-7" : "h-6 w-6";
  
  return (
    <Card 
      onClick={onClick}
      className="group relative overflow-hidden cursor-pointer glass-card elevated-subtle elevated-active border-border/50"
    >
      <div className="p-6 flex items-center gap-4">
        <div className={`${iconContainerPadding} rounded-xl bg-primary/10 text-primary`}>
          <Building2 className={iconSize} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${titleSize} mb-1`}>
            {floor ? floor.name : "Sans étage"}
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={badgeSize}>
              {roomCount} {roomCount === 1 ? "pièce" : "pièces"}
            </Badge>
            <Badge variant="secondary" className={badgeSize}>
              {deviceCount} {deviceCount === 1 ? "appareil" : "appareils"}
            </Badge>
          </div>
        </div>
        
        <ChevronRight className={`${chevronSize} text-muted-foreground transition-transform group-active:translate-x-1`} />
      </div>
    </Card>
  );
};
