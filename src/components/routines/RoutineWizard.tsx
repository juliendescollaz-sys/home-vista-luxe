import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useRoutineStore } from "@/store/useRoutineStore";
import { RoutineWizardDraft, NeoliaRoutine } from "@/types/routines";
import { RoutineNameStep } from "./steps/RoutineNameStep";
import { RoutineIconStep } from "./steps/RoutineIconStep";
import { RoutineActionSelectionStep } from "./steps/RoutineActionSelectionStep";
import { RoutineStateConfigStep } from "./steps/RoutineStateConfigStep";
import { RoutineScheduleStep } from "./steps/RoutineScheduleStep";
import { RoutineSummaryStep } from "./steps/RoutineSummaryStep";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Clock, Loader2, Pencil, Trash2 } from "lucide-react";

interface RoutineWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine?: NeoliaRoutine;
}

const STEP_TITLES = [
  "Nom de la routine",
  "Icône",
  "Sélection des actions",
  "Configuration des états",
  "Planification",
  "Résumé",
];

// Les routines sont toujours "shared" (automations HA) pour garantir l'exécution planifiée
const INITIAL_DRAFT: RoutineWizardDraft = {
  name: "",
  icon: "Clock",
  description: "",
  scope: "shared",
  selectedItems: [],
  schedule: {
    frequency: "daily",
    daysOfWeek: [1, 2, 3, 4, 5], // Lun-Ven par défaut
    time: "07:00",
  },
};

function routineToDraft(routine: NeoliaRoutine): RoutineWizardDraft {
  return {
    name: routine.name,
    icon: routine.icon,
    description: routine.description || "",
    scope: "shared", // Toujours shared
    selectedItems: routine.actions,
    schedule: routine.schedule,
  };
}

export function RoutineWizard({ open, onOpenChange, routine }: RoutineWizardProps) {
  const isEditMode = !!routine;

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<RoutineWizardDraft>(INITIAL_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const addRoutine = useRoutineStore((s) => s.addRoutine);
  const updateRoutine = useRoutineStore((s) => s.updateRoutine);
  const deleteRoutine = useRoutineStore((s) => s.deleteRoutine);

  // Check if we need to skip step 4 (state config) - when only scenes are selected
  const hasOnlyScenes = draft.selectedItems.length > 0 && 
    draft.selectedItems.every(item => item.type === "scene");
  
  // 6 steps total, minus 1 if only scenes (skip state config)
  const TOTAL_STEPS = hasOnlyScenes ? 5 : 6;

  useEffect(() => {
    if (open) {
      setStep(1);
      if (routine) {
        setDraft(routineToDraft(routine));
      } else {
        setDraft(INITIAL_DRAFT);
      }
    }
  }, [open, routine]);

  const updateDraft = (updates: Partial<RoutineWizardDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleClose = () => {
    setStep(1);
    setDraft(INITIAL_DRAFT);
    onOpenChange(false);
  };

  // Get the actual step number considering skipped steps
  const getActualStep = (visualStep: number): number => {
    if (hasOnlyScenes && visualStep >= 4) {
      return visualStep + 1; // Skip step 4 (state config)
    }
    return visualStep;
  };

  const canProceed = () => {
    const actualStep = getActualStep(step);
    switch (actualStep) {
      case 1:
        return draft.name.trim().length > 0;
      case 2:
        return draft.icon.length > 0;
      case 3:
        return draft.selectedItems.length > 0;
      case 4:
        return true;
      case 5:
        return draft.schedule.time.length > 0 && validateSchedule();
      default:
        return true;
    }
  };

  const validateSchedule = (): boolean => {
    const { schedule } = draft;
    switch (schedule.frequency) {
      case "once":
        return !!schedule.date;
      case "daily":
        return (schedule.daysOfWeek?.length || 0) > 0;
      case "weekly":
        return schedule.dayOfWeek !== undefined;
      case "monthly":
        return (schedule.dayOfMonth || 0) > 0 && (schedule.dayOfMonth || 0) <= 31;
      case "yearly":
        return (schedule.month || 0) > 0 && (schedule.dayOfMonthYearly || 0) > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
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
      if (isEditMode && routine) {
        await updateRoutine(routine.id, {
          name: draft.name.trim(),
          icon: draft.icon,
          description: draft.description.trim() || undefined,
          scope: draft.scope,
          actions: draft.selectedItems,
          schedule: draft.schedule,
        });

        toast({
          title: "Routine modifiée",
          description: `La routine "${draft.name}" a été mise à jour.`,
        });
      } else {
        await addRoutine({
          name: draft.name.trim(),
          icon: draft.icon,
          description: draft.description.trim() || undefined,
          scope: draft.scope,
          actions: draft.selectedItems,
          schedule: draft.schedule,
          enabled: true,
          isFavorite: false,
        });

        toast({
          title: "Routine créée",
          description: `La routine "${draft.name}" a été créée avec succès.`,
        });
      }

      handleClose();
    } catch (error) {
      console.error("[RoutineWizard] Error:", error);
      toast({
        title: "Erreur",
        description: isEditMode
          ? "Impossible de modifier la routine. Veuillez réessayer."
          : "Impossible de créer la routine. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (routine) {
      try {
        await deleteRoutine(routine.id);
        setIsDeleteConfirmOpen(false);
        handleClose();

        toast({
          title: "Routine supprimée",
          description: `"${routine.name}" a été supprimée.`,
        });
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message || "Impossible de supprimer la routine.",
          variant: "destructive",
        });
      }
    }
  };

  const wizardTitle = isEditMode ? "Modifier la routine" : "Créer une routine";

  const getCurrentStepTitle = () => {
    const actualStep = getActualStep(step);
    return STEP_TITLES[actualStep - 1] || "";
  };

  const renderStep = () => {
    const actualStep = getActualStep(step);
    
    switch (actualStep) {
      case 1:
        return <RoutineNameStep draft={draft} onUpdate={updateDraft} />;
      case 2:
        return <RoutineIconStep draft={draft} onUpdate={updateDraft} />;
      case 3:
        return <RoutineActionSelectionStep draft={draft} onUpdate={updateDraft} />;
      case 4:
        return <RoutineStateConfigStep draft={draft} onUpdate={updateDraft} />;
      case 5:
        return <RoutineScheduleStep draft={draft} onUpdate={updateDraft} />;
      case 6:
        return <RoutineSummaryStep draft={draft} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditMode ? <Pencil className="w-5 h-5 text-primary" /> : <Clock className="w-5 h-5 text-primary" />}
              {wizardTitle}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Étape {step}/{TOTAL_STEPS} – {getCurrentStepTitle()}
            </p>
          </DialogHeader>

          <div className="px-1 py-2">
            <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />
          </div>

          <div className="flex-1 overflow-y-auto px-1 py-2 bg-background">{renderStep()}</div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="ghost" onClick={handlePrevious} disabled={isSubmitting}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
              )}

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

            {step < TOTAL_STEPS ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="relative">
                {isSubmitting && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </span>
                )}
                <span className={isSubmitting ? "opacity-0" : ""}>
                  {isEditMode ? "Enregistrer" : "Créer la routine"}
                </span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la routine</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la routine "{routine?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
