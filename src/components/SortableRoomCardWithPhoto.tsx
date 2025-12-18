import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Home, Camera, ChevronRight, Pencil } from "lucide-react";
import { useRef } from "react";
import type { HAArea, HAFloor } from "@/types/homeassistant";

interface SortableRoomCardWithPhotoProps {
  area: HAArea;
  floor?: HAFloor;
  deviceCount: number;
  customPhoto?: string;
  onPhotoChange: (areaId: string, file: File) => void;
  onClick: () => void;
  onEditName?: (area: HAArea) => void;
}

export const SortableRoomCardWithPhoto = ({
  area,
  floor,
  deviceCount,
  customPhoto,
  onPhotoChange,
  onClick,
  onEditName,
}: SortableRoomCardWithPhotoProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    zIndex: isDragging ? 50 : "auto",
  };

  const handlePhotoClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      onPhotoChange(area.area_id, file);
      // Reset input pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
        className="relative overflow-hidden glass-card elevated-subtle elevated-active border-border/50"
        onClick={(e) => {
          if (!isDragging) {
            onClick();
          }
        }}
      >
        {/* Zone image/photo */}
        <div className="aspect-[16/10] relative overflow-hidden">
          {customPhoto ? (
            <>
              <img
                src={customPhoto}
                alt={area.name}
                className="w-full h-full object-cover"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/30">
              <Home className="h-10 w-10 text-muted-foreground/50" />
            </div>
          )}

          {/* Bouton caméra pour ajouter/changer une photo */}
          <button
            type="button"
            onClick={handlePhotoClick}
            className="absolute top-2 right-2 p-2.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 active:scale-95 transition-transform z-20"
            aria-label="Ajouter une photo"
          >
            <Camera className="h-4 w-4 text-foreground/80" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            onClick={(e) => e.stopPropagation()}
            className="hidden"
          />

          {/* Contenu texte superposé en bas */}
          <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base text-foreground truncate drop-shadow-sm">
                  {area.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate drop-shadow-sm">
                  {floor?.name && `${floor.name} · `}
                  {deviceCount} appareil{deviceCount > 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {onEditName && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditName(area);
                    }}
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-border/40 bg-background/60 backdrop-blur-sm active:scale-95 transition-transform"
                    aria-label="Renommer la pièce"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
