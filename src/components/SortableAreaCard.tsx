import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import type { HAArea, HAFloor } from "@/types/homeassistant";

interface SortableAreaCardProps {
  area: HAArea;
  floor?: HAFloor;
  deviceCount: number;
  onClick: () => void;
}

export const SortableAreaCard = ({ area, floor, deviceCount, onClick }: SortableAreaCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: area.area_id });

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
          // Ne pas déclencher le clic si on est en train de drag
          if (!isDragging) {
            onClick();
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium text-base">{area.name}</div>
            {floor && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {floor.name} · {deviceCount} appareil{deviceCount > 1 ? "s" : ""}
              </div>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </Card>
    </div>
  );
};
