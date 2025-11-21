import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, GripVertical, Trash2, Home as HomeIcon, TreePine } from "lucide-react";
import { HomeLevel } from "@/store/useHomeProjectStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LevelsStepProps {
  levels: HomeLevel[];
  onNext: (levels: HomeLevel[]) => void;
  onBack: () => void;
}

const SortableLevel = ({
  level,
  onUpdate,
  onRemove,
}: {
  level: HomeLevel;
  onUpdate: (id: string, updates: Partial<HomeLevel>) => void;
  onRemove: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: level.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex-1 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nom</Label>
            <Input
              value={level.name}
              onChange={(e) => onUpdate(level.id, { name: e.target.value })}
              placeholder="Rez-de-chaussée"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select
              value={level.type}
              onValueChange={(value: "interior" | "exterior") =>
                onUpdate(level.id, { type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interior">
                  <div className="flex items-center gap-2">
                    <HomeIcon className="h-4 w-4" />
                    Intérieur
                  </div>
                </SelectItem>
                <SelectItem value="exterior">
                  <div className="flex items-center gap-2">
                    <TreePine className="h-4 w-4" />
                    Extérieur
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(level.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
};

export const LevelsStep = ({ levels: initialLevels, onNext, onBack }: LevelsStepProps) => {
  const [levels, setLevels] = useState<HomeLevel[]>(initialLevels);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addLevel = () => {
    const newLevel: HomeLevel = {
      id: crypto.randomUUID(),
      name: "",
      type: "interior",
      order: levels.length,
    };
    setLevels([...levels, newLevel]);
  };

  const updateLevel = (id: string, updates: Partial<HomeLevel>) => {
    setLevels(levels.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const removeLevel = (id: string) => {
    setLevels(levels.filter((l) => l.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLevels((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const handleNext = () => {
    const validLevels = levels.filter((l) => l.name.trim());
    if (validLevels.length > 0) {
      onNext(validLevels);
    }
  };

  const hasValidLevels = levels.some((l) => l.name.trim());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Niveaux de votre maison</h2>
        <p className="text-muted-foreground">
          Votre maison peut avoir un ou plusieurs niveaux : rez-de-chaussée, étage, sous-sol, jardin, terrasse…
          Ajoutez les niveaux dont vous avez besoin.
        </p>
      </div>

      <div className="space-y-3">
        {levels.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground mb-4">Aucun niveau ajouté</p>
            <Button onClick={addLevel} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un niveau
            </Button>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={levels} strategy={verticalListSortingStrategy}>
              {levels.map((level) => (
                <SortableLevel
                  key={level.id}
                  level={level}
                  onUpdate={updateLevel}
                  onRemove={removeLevel}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {levels.length > 0 && (
          <Button onClick={addLevel} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un niveau
          </Button>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Retour
        </Button>
        <Button onClick={handleNext} disabled={!hasValidLevels} className="flex-1">
          Continuer
        </Button>
      </div>
    </div>
  );
};
