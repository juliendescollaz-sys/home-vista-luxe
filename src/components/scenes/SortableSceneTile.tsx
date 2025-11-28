import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SceneTile } from "./SceneTile";

interface SortableSceneTileProps {
  sceneId: string;
  hideEditButton?: boolean;
}

export const SortableSceneTile = ({ sceneId, hideEditButton }: SortableSceneTileProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `scene-${sceneId}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <SceneTile 
      sceneId={sceneId} 
      hideEditButton={hideEditButton}
      sortableProps={{ attributes, listeners, setNodeRef, style }}
    />
  );
};
