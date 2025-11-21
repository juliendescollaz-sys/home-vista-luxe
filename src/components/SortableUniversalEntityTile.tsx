import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HAEntity } from "@/types/homeassistant";
import { UniversalEntityTile } from "./entities/UniversalEntityTile";

interface SortableUniversalEntityTileProps {
  entity: HAEntity;
}

export const SortableUniversalEntityTile = ({ 
  entity
}: SortableUniversalEntityTileProps) => {
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
      className="cursor-grab active:cursor-grabbing"
    >
      <UniversalEntityTile entity={entity} />
    </div>
  );
};
