import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSceneStore } from "@/store/useSceneStore";
import { SceneWizardDraft, SceneEntityState, NeoliaScene } from "@/types/scenes";
import { SceneBasicInfoStep } from "./steps/SceneBasicInfoStep";
import { SceneDeviceSelectionStep } from "./steps/SceneDeviceSelectionStep";
import { SceneStateConfigStep } from "./steps/SceneStateConfigStep";
import { SceneSummaryStep } from "./steps/SceneSummaryStep";
import { useHAStore } from "@/store/useHAStore";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Pencil, Trash2 } from "lucide-react";

interface SceneWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Scene to edit - if provided, wizard is in edit mode */
  scene?: NeoliaScene;
}

const INITIAL_DRAFT: SceneWizardDraft = {
  name: "",
  icon: "Sparkles",
  description: "",
  scope: "local",
  selectedEntityIds: [],
  entityStates: {},
};

/**
 * Convert a NeoliaScene to a SceneWizardDraft for editing
 */
function sceneToDraft(scene: NeoliaScene): SceneWizardDraft {
  const selectedEntityIds = scene.entities.map((e) => e.entity_id);
  const entityStates: Record<string, SceneEntityState["targetState"]> = {};
  
  for (const entity of scene.entities) {
    entityStates[entity.entity_id] = entity.targetState;
  }
  
  return {
    name: scene.name,
    icon: scene.icon,
    description: scene.description || "",
    scope: scene.scope,
    selectedEntityIds,
    entityStates,
  };
}

export function SceneWizard({ open, onOpenChange, scene }: SceneWizardProps) {
  const isEditMode = !!scene;
  
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<SceneWizardDraft>(INITIAL_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const addScene = useSceneStore((s) => s.addScene);
  const updateScene = useSceneStore((s) => s.updateScene);
  const deleteScene = useSceneStore((s) => s.deleteScene);
  const entities = useHAStore((s) => s.entities);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      if (scene) {
        // Edit mode: pre-fill with existing scene data
        setDraft(sceneToDraft(scene));
      } else {
        // Create mode: reset to initial state
        setDraft(INITIAL_DRAFT);
      }
    }
  }, [open, scene]);

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

  const handleSubmit = async () => {
    setIsSubmitting(true);

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

      if (isEditMode && scene) {
        // Update existing scene
        updateScene(scene.id, {
          name: draft.name.trim(),
          icon: draft.icon,
          description: draft.description.trim() || undefined,
          scope: draft.scope,
          entities: sceneEntities,
        });

        toast({
          title: "Scène modifiée",
          description: `La scène "${draft.name}" a été mise à jour.`,
        });
      } else {
        // Create new scene
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
      }

      handleClose();
    } catch (error) {
      console.error("[SceneWizard] Error:", error);
      toast({
        title: "Erreur",
        description: isEditMode 
          ? "Impossible de modifier la scène. Veuillez réessayer."
          : "Impossible de créer la scène. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (scene) {
      deleteScene(scene.id);
      setIsDeleteConfirmOpen(false);
      handleClose();
      
      toast({
        title: "Scène supprimée",
        description: `"${scene.name}" a été supprimée.`,
      });
    }
  };

  const stepTitles = [
    "Informations de base",
    "Sélection des appareils",
    "Paramétrage des états",
    "Résumé de la scène",
  ];

  const wizardTitle = isEditMode ? "Modifier la scène" : "Créer une scène";

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditMode ? (
                <Pencil className="w-5 h-5 text-primary" />
              ) : (
                <Sparkles className="w-5 h-5 text-primary" />
              )}
              {wizardTitle} – Étape {step}/4
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{stepTitles[step - 1]}</p>
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
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={step === 1 || isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </Button>
              
              {/* Delete button in edit mode */}
              {isEditMode && step === 1 && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              )}
            </div>

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
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditMode ? "Enregistrement..." : "Création..."}
                  </>
                ) : (
                  <>
                    {isEditMode ? (
                      <>
                        <Pencil className="w-4 h-4 mr-2" />
                        Enregistrer
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Créer la scène
                      </>
                    )}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette scène ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement la scène « {scene?.name} ».
              Les appareils ne seront pas modifiés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
