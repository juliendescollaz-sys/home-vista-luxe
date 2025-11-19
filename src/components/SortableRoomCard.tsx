import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Home, Camera, GripVertical } from "lucide-react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

interface SortableRoomCardProps {
  name: string;
  deviceCount: number;
  customPhoto?: string;
  onPhotoChange: (file: File) => void;
  areaId: string;
}

export const SortableRoomCard = ({ 
  name, 
  deviceCount, 
  customPhoto, 
  onPhotoChange, 
  areaId 
}: SortableRoomCardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: areaId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const handlePhotoClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoChange(file);
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input[type="file"]')) {
      return;
    }
    navigate(`/rooms/${areaId}`);
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className="group relative overflow-hidden cursor-pointer glass-card elevated-subtle elevated-active border-border/50"
    >
      <div className="aspect-video relative overflow-hidden">
        {customPhoto ? (
          <>
            <img
              src={customPhoto}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/60 to-background/30" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <Home className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Drag handle - visible sur mobile, au hover sur desktop */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 p-3 rounded-full transition-all duration-200 opacity-70 z-20 cursor-grab active:cursor-grabbing"
          aria-label="Déplacer la pièce"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Bouton photo */}
        <button
          type="button"
          onClick={handlePhotoClick}
          className="absolute top-2 right-2 p-3 rounded-full bg-background/90 backdrop-blur-sm transition-all duration-200 opacity-70 z-20"
          aria-label="Changer la photo de la pièce"
        >
          <Camera className="h-5 w-5" />
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      
      <div className="p-4 relative">
        <h3 className="font-semibold text-lg mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground">
          {deviceCount} {deviceCount === 1 ? "appareil" : "appareils"}
        </p>
      </div>
    </Card>
  );
};
