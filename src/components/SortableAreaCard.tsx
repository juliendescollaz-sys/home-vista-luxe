import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { ChevronRight, Pencil } from "lucide-react";
import type { HAArea, HAFloor } from "@/types/homeassistant";

interface SortableAreaCardProps {
  area: HAArea;
  floor?: HAFloor;
  deviceCount: number;
  onClick: () => void;
  onEditName?: (area: HAArea) => void;
}

export const SortableAreaCard = ({ area, floor, deviceCount, onClick, onEditName }: SortableAreaCardProps) => {
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
        className="p-4 hover:bg-accent/50 transition-colors glass-card elevated-subtle elevated-active border-border/50"
        onClick={(e) => {
          // Ne pas déclencher le clic si on est en train de drag
          if (!isDragging) {
            onClick();
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-base truncate">{area.name}</div>
            {floor && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {floor.name} · {deviceCount} appareil{deviceCount > 1 ? "s" : ""}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEditName && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditName(area);
                }}
                className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-border/40 bg-background/40 hover:bg-accent/60 hover:border-accent/60 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Renommer la pièce"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </Card>
    </div>
  );
};
