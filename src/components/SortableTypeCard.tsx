import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { 
  ChevronRight, 
  Lightbulb, 
  ToggleRight, 
  PanelTop, 
  Thermometer, 
  Fan, 
  Lock, 
  Music, 
  Clapperboard, 
  FileCode,
  MoreHorizontal
} from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  "Éclairages": Lightbulb,
  "Interrupteurs": ToggleRight,
  "Volets": PanelTop,
  "Climatisation": Thermometer,
  "Ventilateurs": Fan,
  "Serrures": Lock,
  "Lecteurs média": Music,
  "Scènes": Clapperboard,
  "Scripts": FileCode,
  "Autres": MoreHorizontal,
};

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

  const Icon = typeIcons[typeName] || MoreHorizontal;

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
          if (!isDragging) {
            onClick();
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-base">{typeName}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {deviceCount} appareil{deviceCount > 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </Card>
    </div>
  );
};
