import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HomeRoom } from "@/store/useHomeProjectStore";
import { Trash2 } from "lucide-react";

interface RoomPropertiesPanelProps {
  room: HomeRoom | null;
  onUpdate: (id: string, updates: Partial<HomeRoom>) => void;
  onDelete: (id: string) => void;
}

export const RoomPropertiesPanel = ({ room, onUpdate, onDelete }: RoomPropertiesPanelProps) => {
  if (!room) {
    return (
      <Card className="p-4 h-full flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Sélectionnez une pièce pour la modifier</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 h-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Propriétés</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(room.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="room-name" className="text-xs">Nom</Label>
          <Input
            id="room-name"
            value={room.name}
            onChange={(e) => onUpdate(room.id, { name: e.target.value })}
            placeholder="Cuisine"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="room-type" className="text-xs">Type (optionnel)</Label>
          <Input
            id="room-type"
            value={room.type || ""}
            onChange={(e) => onUpdate(room.id, { type: e.target.value })}
            placeholder="Salon, Chambre..."
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Position X</Label>
            <p className="text-sm font-medium">{room.x?.toFixed(0) || 0}px</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Position Y</Label>
            <p className="text-sm font-medium">{room.y?.toFixed(0) || 0}px</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Largeur</Label>
            <p className="text-sm font-medium">{room.width?.toFixed(0) || 0}px</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hauteur</Label>
            <p className="text-sm font-medium">{room.height?.toFixed(0) || 0}px</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
