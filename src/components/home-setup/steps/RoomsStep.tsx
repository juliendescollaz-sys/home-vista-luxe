import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { HomeLevel, HomeRoom } from "@/store/useHomeProjectStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RoomsStepProps {
  levels: HomeLevel[];
  rooms: HomeRoom[];
  onNext: (rooms: HomeRoom[]) => void;
  onBack: () => void;
}

export const RoomsStep = ({ levels, rooms: initialRooms, onNext, onBack }: RoomsStepProps) => {
  const [rooms, setRooms] = useState<HomeRoom[]>(initialRooms);
  const [activeLevel, setActiveLevel] = useState(levels[0]?.id || "");

  const addRoom = (levelId: string) => {
    const newRoom: HomeRoom = {
      id: crypto.randomUUID(),
      levelId,
      name: "",
      type: "",
    };
    setRooms([...rooms, newRoom]);
  };

  const updateRoom = (id: string, updates: Partial<HomeRoom>) => {
    setRooms(rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const removeRoom = (id: string) => {
    setRooms(rooms.filter((r) => r.id !== id));
  };

  const getRoomsForLevel = (levelId: string) => {
    return rooms.filter((r) => r.levelId === levelId);
  };

  const handleNext = () => {
    const validRooms = rooms.filter((r) => r.name.trim());
    onNext(validRooms);
  };

  const hasValidRooms = rooms.some((r) => r.name.trim());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Quelles pièces avez-vous ?</h2>
        <p className="text-muted-foreground">
          Ajoutez les pièces de chaque étage. Vous pourrez les placer sur le plan ensuite.
        </p>
      </div>

      <Tabs value={activeLevel} onValueChange={setActiveLevel}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${levels.length}, 1fr)` }}>
          {levels.map((level) => (
            <TabsTrigger key={level.id} value={level.id}>
              {level.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {levels.map((level) => {
          const levelRooms = getRoomsForLevel(level.id);
          return (
            <TabsContent key={level.id} value={level.id} className="space-y-3 mt-4">
              {levelRooms.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-muted-foreground mb-4">
                    Aucune pièce dans {level.name}
                  </p>
                  <Button onClick={() => addRoom(level.id)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une pièce
                  </Button>
                </Card>
              ) : (
                <>
                  {levelRooms.map((room) => (
                    <Card key={room.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Nom</Label>
                            <Input
                              value={room.name}
                              onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                              placeholder="Cuisine"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Type (optionnel)</Label>
                            <Input
                              value={room.type || ""}
                              onChange={(e) => updateRoom(room.id, { type: e.target.value })}
                              placeholder="Salon, Chambre..."
                            />
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRoom(room.id)}
                          className="mt-5"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  ))}

                  <Button onClick={() => addRoom(level.id)} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une pièce
                  </Button>
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Retour
        </Button>
        <Button onClick={handleNext} disabled={!hasValidRooms} className="flex-1">
          Continuer
        </Button>
      </div>
    </div>
  );
};
