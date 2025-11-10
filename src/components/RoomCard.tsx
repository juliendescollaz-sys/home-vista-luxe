import { Card } from "@/components/ui/card";
import { Home, Camera } from "lucide-react";
import { useRef } from "react";

interface RoomCardProps {
  name: string;
  deviceCount: number;
  customPhoto?: string;
  onPhotoChange: (file: File) => void;
}

export const RoomCard = ({ name, deviceCount, customPhoto, onPhotoChange }: RoomCardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoChange(file);
    }
  };

  return (
    <Card className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer">
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
          className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all duration-200 opacity-0 group-hover:opacity-100"
        >
          <Camera className="h-4 w-4" />
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
