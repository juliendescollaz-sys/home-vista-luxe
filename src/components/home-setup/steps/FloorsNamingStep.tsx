import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers } from "lucide-react";

interface Floor {
  name: string;
  type: "interior" | "exterior";
}

interface FloorsNamingStepProps {
  floorCount: number;
  onNext: (floors: Floor[]) => void;
  onBack: () => void;
}

const SUGGESTIONS = [
  "Sous-sol",
  "Rez-de-chaussée",
  "1er étage",
  "2ème étage",
  "Terrasse",
  "Jardin",
  "Grenier",
];

export const FloorsNamingStep = ({ floorCount, onNext, onBack }: FloorsNamingStepProps) => {
  const [floors, setFloors] = useState<Floor[]>(
    Array.from({ length: floorCount }, (_, i) => ({
      name: i === 0 ? "Rez-de-chaussée" : `${i}${i === 1 ? "er" : "ème"} étage`,
      type: "interior" as const,
    }))
  );

  const updateFloor = (index: number, updates: Partial<Floor>) => {
    setFloors((prev) =>
      prev.map((floor, i) => (i === index ? { ...floor, ...updates } : floor))
    );
  };

  const handleNext = () => {
    const validFloors = floors.filter((f) => f.name.trim());
    if (validFloors.length > 0) {
      onNext(validFloors);
    }
  };

  const allFloorsFilled = floors.every((f) => f.name.trim());

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Layers className="w-12 h-12 text-primary" />
        </div>
      </div>

      <div className="space-y-3 text-center">
        <h2 className="text-2xl font-semibold">Comment souhaitez-vous appeler vos étages ?</h2>
        <p className="text-muted-foreground">
          Vous êtes libre : "RDC", "Étage", "Sous-sol", "Terrasse"...
        </p>
      </div>

      <div className="space-y-4">
        {floors.map((floor, index) => (
          <div key={index} className="space-y-2 p-4 border rounded-lg bg-card">
            <Label>Étage {index + 1}</Label>
            <Input
              placeholder={SUGGESTIONS[index % SUGGESTIONS.length]}
              value={floor.name}
              onChange={(e) => updateFloor(index, { name: e.target.value })}
              className="h-10"
            />
            <Select
              value={floor.type}
              onValueChange={(value: "interior" | "exterior") =>
                updateFloor(index, { type: value })
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interior">Intérieur</SelectItem>
                <SelectItem value="exterior">Extérieur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="flex-1">
          Retour
        </Button>
        <Button
          onClick={handleNext}
          size="lg"
          className="flex-1"
          disabled={!allFloorsFilled}
        >
          Continuer
        </Button>
      </div>
    </div>
  );
};
