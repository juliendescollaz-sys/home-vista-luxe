import { Card } from "@/components/ui/card";
import { Home, Camera } from "lucide-react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

interface RoomCardProps {
  name: string;
  deviceCount: number;
  customPhoto?: string;
  onPhotoChange: (file: File) => void;
  areaId: string;
}

export const RoomCard = ({ name, deviceCount, customPhoto, onPhotoChange, areaId }: RoomCardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handlePhotoClick = (e: React.MouseEvent) => {
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Ne pas naviguer si le clic provient du bouton photo ou de ses enfants
    const target = e.target as HTMLElement;
    if (target.closest('button[aria-label="Changer la photo de la pièce"]')) {
      return;
    }
    navigate(`/rooms/${areaId}`);
  };

  return (
    <Card 
      onClick={handleCardClick}
      className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer"
    >
      <div className="aspect-video relative overflow-hidden">
        {customPhoto ? (
          <>
            <img
              src={customPhoto}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/60 to-background/30" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <Home className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Bouton pour ajouter/changer la photo */}
        <button
          onClick={handlePhotoClick}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 p-3 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background hover:scale-110 transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
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
