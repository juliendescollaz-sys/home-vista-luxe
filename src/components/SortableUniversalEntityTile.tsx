import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HAEntity, HAFloor, HAArea } from "@/types/homeassistant";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { LocationBadge } from "./LocationBadge";
import { UniversalEntityTile } from "./entities/UniversalEntityTile";

interface SortableUniversalEntityTileProps {
  entity: HAEntity;
  floor?: HAFloor | null;
  area?: HAArea | null;
}

export const SortableUniversalEntityTile = ({ 
  entity, 
  floor, 
  area 
}: SortableUniversalEntityTileProps) => {
  const favorites = useHAStore((state) => state.favorites);
  const toggleFavorite = useHAStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(entity.entity_id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entity.entity_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(entity.entity_id);
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing"
    >
      <div className="absolute top-2 left-2 z-10">
        <LocationBadge floor={floor} area={area} />
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10 h-8 w-8 bg-transparent active:bg-accent/50 active:scale-95 transition-all"
        onClick={handleFavoriteClick}
      >
        <Star className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
      </Button>

      <UniversalEntityTile entity={entity} />
    </div>
  );
};
