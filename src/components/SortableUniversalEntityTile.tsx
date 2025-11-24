import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HAEntity, HAFloor, HAArea } from "@/types/homeassistant";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
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
  const domain = entity.entity_id.split(".")[0];
  const isMediaPlayer = entity.entity_id.startsWith("media_player.");
  const shouldShowOverlay =
    !isMediaPlayer &&
    !["switch", "scene", "script", "button", "camera"].includes(domain);

  const favorites = useHAStore((state) => state.favorites);
  const toggleFavorite = useHAStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(entity.entity_id);
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(entity.entity_id);
  };
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

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing"
    >
      {shouldShowOverlay && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-20 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90 active:bg-accent/50 active:scale-95 transition-all pointer-events-auto"
          onClick={handleFavoriteClick}
        >
          <Star className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
        </Button>
      )}

      <UniversalEntityTile entity={entity} floor={floor} area={area} />
    </div>
  );
};
