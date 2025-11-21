import { Button } from "@/components/ui/button";
import { LayoutGrid, Tablet } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlanPreparationStepProps {
  onBack: () => void;
}

export const PlanPreparationStep = ({ onBack }: PlanPreparationStepProps) => {
  const navigate = useNavigate();

  const handleNext = () => {
    navigate("/floor-plan-editor");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
          <LayoutGrid className="w-12 h-12 text-primary" />
        </div>
      </div>

      <div className="space-y-3 text-center">
        <h2 className="text-2xl font-semibold">Parfait ! Dessinons maintenant votre plan.</h2>
        <p className="text-muted-foreground text-lg">
          Vous allez placer des rectangles pour représenter vos pièces. Vous pourrez les déplacer, les redimensionner et les nommer directement dans l'éditeur.
        </p>
      </div>

      <div className="bg-card/50 rounded-lg p-6 border border-border/50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Tablet className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold">Recommandation</h3>
            <p className="text-sm text-muted-foreground">
              Pour une meilleure expérience d'édition, nous vous recommandons d'utiliser une tablette.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Retour
        </Button>
        <Button onClick={handleNext} size="lg" className="flex-1">
          Créer le plan
        </Button>
      </div>
    </div>
  );
};
