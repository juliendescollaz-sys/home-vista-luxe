import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";

interface PlanPreparationStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const PlanPreparationStep = ({ onNext, onBack }: PlanPreparationStepProps) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
          <LayoutGrid className="w-12 h-12 text-primary" />
        </div>
      </div>

      <div className="space-y-3 text-center">
        <h2 className="text-2xl font-semibold">Prêt pour le plan</h2>
        <p className="text-muted-foreground text-lg">
          Vous allez maintenant positionner les pièces sur un plan simple et clair.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Retour
        </Button>
        <Button onClick={onNext} size="lg" className="flex-1">
          Créer le plan
        </Button>
      </div>
    </div>
  );
};
