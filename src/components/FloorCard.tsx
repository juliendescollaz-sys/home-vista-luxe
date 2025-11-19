import { Card } from "@/components/ui/card";
import { Building2, ChevronRight } from "lucide-react";
import { HAFloor } from "@/types/homeassistant";
import { Badge } from "./ui/badge";

interface FloorCardProps {
  floor: HAFloor | null;
  roomCount: number;
  deviceCount: number;
  onClick: () => void;
}

export const FloorCard = ({ floor, roomCount, deviceCount, onClick }: FloorCardProps) => {
  return (
    <Card 
      onClick={onClick}
      className="group relative overflow-hidden cursor-pointer glass-card elevated-subtle elevated-active border-border/50"
    >
      <div className="p-6 flex items-center gap-4">
        <div className="p-4 rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-8 w-8" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1">
            {floor ? floor.name : "Sans étage"}
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {roomCount} {roomCount === 1 ? "pièce" : "pièces"}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {deviceCount} {deviceCount === 1 ? "appareil" : "appareils"}
            </Badge>
          </div>
        </div>
        
        <ChevronRight className="h-6 w-6 text-muted-foreground transition-transform group-active:translate-x-1" />
      </div>
    </Card>
  );
};
