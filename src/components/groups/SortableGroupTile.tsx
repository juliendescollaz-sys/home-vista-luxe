import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GroupTile } from "./GroupTile";
import type { NeoliaGroup } from "@/types/groups";

interface SortableGroupTileProps {
  group: NeoliaGroup;
}

export const SortableGroupTile = ({ group }: SortableGroupTileProps) => {
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
    <GroupTile 
      group={group} 
      showBadge 
      sortableProps={{ attributes, listeners, setNodeRef, style }}
    />
  );
};
