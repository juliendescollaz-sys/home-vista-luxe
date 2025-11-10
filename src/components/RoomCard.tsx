import { Card } from "@/components/ui/card";
import { Home } from "lucide-react";

interface RoomCardProps {
  name: string;
  deviceCount: number;
  picture?: string;
}

export const RoomCard = ({ name, deviceCount, picture }: RoomCardProps) => {
  return (
    <Card className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer">
      <div className="aspect-video relative overflow-hidden">
        {picture ? (
          <img
            src={picture}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <Home className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground">
          {deviceCount} {deviceCount === 1 ? "appareil" : "appareils"}
        </p>
      </div>
    </Card>
  );
};
