import { Button } from "@/components/ui/button";
import { LayoutGrid, Move, Maximize2, Plus, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlanTutorialStepProps {
  onNext?: () => void;
  onBack: () => void;
}

export const PlanTutorialStep = ({ onNext, onBack }: PlanTutorialStepProps) => {
  const navigate = useNavigate();

  const handleNext = () => {
    if (onNext) {
      onNext();
    }
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
        <h2 className="text-2xl font-semibold">Parfait ! Nous allons maintenant dessiner votre plan.</h2>
        <p className="text-muted-foreground text-lg">
          Pas besoin de savoir dessiner : vous allez simplement placer des rectangles pour représenter vos pièces.
        </p>
      </div>

      <div className="space-y-4 bg-card/50 rounded-lg p-6">
        <h3 className="font-semibold text-center mb-4">Comment utiliser l'éditeur ?</h3>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm">Chaque pièce est un rectangle que tu peux ajouter.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Move className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm">Tu peux la déplacer avec ton doigt ou ta souris.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Maximize2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm">Tu peux l'agrandir ou la rapetisser avec les poignées.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Save className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm">Quand tu as fini, appuie sur "Sauvegarder".</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Retour
        </Button>
        <Button onClick={handleNext} size="lg" className="flex-1">
          J'ai compris !
        </Button>
      </div>
    </div>
  );
};
