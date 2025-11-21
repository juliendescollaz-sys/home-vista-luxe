import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2 } from "lucide-react";

interface FloorsCountStepProps {
  onNext: (count: number) => void;
  onBack: () => void;
}

export const FloorsCountStep = ({ onNext, onBack }: FloorsCountStepProps) => {
  const [selectedCount, setSelectedCount] = useState<number | null>(null);
  const [customCount, setCustomCount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleCountSelect = (count: number) => {
    if (count === 4) {
      setShowCustomInput(true);
      setSelectedCount(null);
    } else {
      setSelectedCount(count);
      setShowCustomInput(false);
    }
  };

  const handleNext = () => {
    const count = showCustomInput ? parseInt(customCount) : selectedCount;
    if (count && count > 0) {
      onNext(count);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-12 h-12 text-primary" />
        </div>
      </div>

      <div className="space-y-3 text-center">
        <h2 className="text-2xl font-semibold">Votre logement comporte combien d'étages ?</h2>
        <p className="text-muted-foreground">
          Comptez tous les niveaux : sous-sol, rez-de-chaussée, étages...
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3].map((count) => (
          <Button
            key={count}
            variant={selectedCount === count ? "default" : "outline"}
            size="lg"
            className="h-20 text-2xl"
            onClick={() => handleCountSelect(count)}
          >
            {count}
          </Button>
        ))}
        <Button
          variant={showCustomInput ? "default" : "outline"}
          size="lg"
          className="h-20 text-2xl"
          onClick={() => handleCountSelect(4)}
        >
          4+
        </Button>
      </div>

      {showCustomInput && (
        <div className="space-y-2 animate-fade-in">
          <Input
            type="number"
            min="4"
            placeholder="Nombre d'étages"
            value={customCount}
            onChange={(e) => setCustomCount(e.target.value)}
            className="text-center text-lg h-12"
            autoFocus
          />
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="flex-1">
          Retour
        </Button>
        <Button
          onClick={handleNext}
          size="lg"
          className="flex-1"
          disabled={!selectedCount && (!customCount || parseInt(customCount) < 1)}
        >
          Continuer
        </Button>
      </div>
    </div>
  );
};
