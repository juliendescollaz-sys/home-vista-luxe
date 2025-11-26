import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface SortableTypeCardProps {
  typeName: string;
  deviceCount: number;
  onClick: () => void;
}

export const SortableTypeCard = ({ typeName, deviceCount, onClick }: SortableTypeCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: typeName });

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
      <Card
        className="p-4 hover:bg-accent/50 transition-colors"
        onClick={(e) => {
          if (!isDragging) {
            onClick();
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium text-base">{typeName}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {deviceCount} appareil{deviceCount > 1 ? "s" : ""}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </Card>
    </div>
  );
};
