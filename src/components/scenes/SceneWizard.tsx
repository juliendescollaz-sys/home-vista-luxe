import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSceneStore } from "@/store/useSceneStore";
import { SceneWizardDraft, SceneEntityState } from "@/types/scenes";
import { SceneBasicInfoStep } from "./steps/SceneBasicInfoStep";
import { SceneDeviceSelectionStep } from "./steps/SceneDeviceSelectionStep";
import { SceneStateConfigStep } from "./steps/SceneStateConfigStep";
import { SceneSummaryStep } from "./steps/SceneSummaryStep";
import { useHAStore } from "@/store/useHAStore";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react";

interface SceneWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INITIAL_DRAFT: SceneWizardDraft = {
  name: "",
  icon: "Sparkles",
  description: "",
  scope: "local",
  selectedEntityIds: [],
  entityStates: {},
};

export function SceneWizard({ open, onOpenChange }: SceneWizardProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<SceneWizardDraft>(INITIAL_DRAFT);
  const [isCreating, setIsCreating] = useState(false);

  const addScene = useSceneStore((s) => s.addScene);
  const entities = useHAStore((s) => s.entities);

  const updateDraft = (updates: Partial<SceneWizardDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleClose = () => {
    setStep(1);
    setDraft(INITIAL_DRAFT);
    onOpenChange(false);
  };

  const canProceedStep1 = draft.name.trim().length > 0 && draft.icon.length > 0;
  const canProceedStep2 = draft.selectedEntityIds.length > 0;
  const canProceedStep3 = Object.keys(draft.entityStates).length > 0;

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);

    try {
      // Build entities array
      const sceneEntities: SceneEntityState[] = draft.selectedEntityIds
        .map((entityId) => {
          const entity = entities.find((e) => e.entity_id === entityId);
          if (!entity) return null;

          const domain = entityId.split(".")[0];
          const targetState = draft.entityStates[entityId] || { state: "on" };

          return {
            entity_id: entityId,
            domain,
            targetState,
          };
        })
        .filter(Boolean) as SceneEntityState[];

      addScene({
        name: draft.name.trim(),
        icon: draft.icon,
        description: draft.description.trim() || undefined,
        scope: draft.scope,
        entities: sceneEntities,
        isFavorite: false,
      });

      toast({
        title: "Scène créée",
        description: `La scène "${draft.name}" a été créée avec succès.`,
      });

      handleClose();
    } catch (error) {
      console.error("[SceneWizard] Error creating scene:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la scène. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const stepTitles = [
    "Informations de base",
    "Sélection des appareils",
    "Paramétrage des états",
    "Résumé de la scène",
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Étape {step} sur 4 – {stepTitles[step - 1]}
          </DialogTitle>
        </DialogHeader>

        <div className="px-1 py-2">
          <Progress value={(step / 4) * 100} className="h-1.5" />
        </div>

        <div className="flex-1 overflow-y-auto px-1 py-2">
          {step === 1 && (
            <SceneBasicInfoStep draft={draft} onUpdate={updateDraft} />
          )}
          {step === 2 && (
            <SceneDeviceSelectionStep draft={draft} onUpdate={updateDraft} />
          )}
          {step === 3 && (
            <SceneStateConfigStep draft={draft} onUpdate={updateDraft} />
          )}
          {step === 4 && <SceneSummaryStep draft={draft} />}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={step === 1 || isCreating}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Précédent
          </Button>

          {step < 4 ? (
            <Button
              onClick={handleNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Créer la scène
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
