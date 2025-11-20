import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GroupTile } from "./GroupTile";
import type { NeoliaGroup } from "@/types/groups";

interface SortableGroupTileProps {
  group: NeoliaGroup;
  onDelete?: () => void;
}

export const SortableGroupTile = ({ group, onDelete }: SortableGroupTileProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `group-${group.id}` });

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
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <GroupTile group={group} onDelete={onDelete} showBadge />
    </div>
  );
};
