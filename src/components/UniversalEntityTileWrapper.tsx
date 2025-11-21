import type { HAEntity, HAFloor, HAArea } from "@/types/homeassistant";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { LocationBadge } from "./LocationBadge";
import { UniversalEntityTile } from "./entities/UniversalEntityTile";

interface UniversalEntityTileWrapperProps {
  entity: HAEntity;
  floor?: HAFloor | null;
  area?: HAArea | null;
}

export const UniversalEntityTileWrapper = ({ 
  entity,
  floor,
  area
}: UniversalEntityTileWrapperProps) => {
  const favorites = useHAStore((state) => state.favorites);
  const toggleFavorite = useHAStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(entity.entity_id);
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(entity.entity_id);
  };

  return (
    <div className="relative">
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <LocationBadge floor={floor} area={area} />
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90 active:bg-accent/50 active:scale-95 transition-all pointer-events-auto"
        onClick={handleFavoriteClick}
      >
        <Star className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
      </Button>

      <UniversalEntityTile entity={entity} />
    </div>
  );
};
