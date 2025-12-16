/**
 * SmartWizard - Wizard pour créer/modifier des automatisations
 * Structure en étapes : Nom/Icône → Déclencheurs → Conditions → Actions → Résumé
 */

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
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SmartAutomation, SmartWizardDraft } from "@/types/smart";
import { useSmartStore } from "@/store/useSmartStore";

// Wizard Steps
import { SmartNameStep } from "./steps/SmartNameStep";
import { SmartIconStep } from "./steps/SmartIconStep";
import { SmartTriggerStep } from "./steps/SmartTriggerStep";
import { SmartConditionStep } from "./steps/SmartConditionStep";
import { SmartActionStep } from "./steps/SmartActionStep";
import { SmartSummaryStep } from "./steps/SmartSummaryStep";

interface SmartWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation?: SmartAutomation;
}

const TOTAL_STEPS = 6;
const STEP_TITLES = [
  "Nom de l'automatisation",
  "Icône",
  "Déclencheurs (QUAND)",
  "Conditions (SI)",
  "Actions (ALORS)",
  "Résumé",
];

const INITIAL_DRAFT: SmartWizardDraft = {
  name: "",
  icon: "Bot",
  description: "",
  triggers: [],
  conditions: { rootOperator: "and", groups: [] },
  actions: [],
  mode: "single",
};

function automationToDraft(automation: SmartAutomation): SmartWizardDraft {
  return {
    name: automation.name,
    icon: automation.icon,
    description: automation.description || "",
    triggers: automation.triggers,
    conditions: automation.conditions,
    actions: automation.actions,
    mode: automation.mode || "single",
  };
}

export function SmartWizard({ open, onOpenChange, automation }: SmartWizardProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<SmartWizardDraft>(INITIAL_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const addAutomation = useSmartStore((s) => s.addAutomation);
  const updateAutomation = useSmartStore((s) => s.updateAutomation);
  const deleteAutomation = useSmartStore((s) => s.deleteAutomation);

  const isEditMode = !!automation;

  // Initialize draft when dialog opens
  useEffect(() => {
    if (open) {
      if (automation) {
        setDraft(automationToDraft(automation));
      } else {
        setDraft(INITIAL_DRAFT);
      }
      setStep(1);
    }
  }, [open, automation]);

  const updateDraft = (updates: Partial<SmartWizardDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleClose = () => {
    setDraft(INITIAL_DRAFT);
    setStep(1);
    onOpenChange(false);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return draft.name.trim().length >= 2;
      case 2:
        return !!draft.icon;
      case 3:
        return draft.triggers.length > 0;
      case 4:
        return true; // Conditions are optional
      case 5:
        return draft.actions.length > 0;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS && canProceed()) {
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
      if (isEditMode && automation) {
        await updateAutomation(automation.id, {
          name: draft.name,
          icon: draft.icon,
          description: draft.description || undefined,
          triggers: draft.triggers,
          conditions: draft.conditions,
          actions: draft.actions,
          mode: draft.mode,
        });
        toast.success("Automatisation modifiée", {
          description: `"${draft.name}" a été mise à jour.`,
        });
      } else {
        await addAutomation({
          name: draft.name,
          icon: draft.icon,
          description: draft.description || undefined,
          triggers: draft.triggers,
          conditions: draft.conditions,
          actions: draft.actions,
          enabled: true,
          mode: draft.mode,
        });
        toast.success("Automatisation créée", {
          description: `"${draft.name}" est maintenant active.`,
        });
      }
      handleClose();
    } catch (error) {
      console.error("SmartWizard submit error:", error);
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible de sauvegarder l'automatisation.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!automation) return;
    setIsSubmitting(true);
    try {
      await deleteAutomation(automation.id);
      toast.success("Automatisation supprimée", {
        description: `"${automation.name}" a été supprimée.`,
      });
      handleClose();
    } catch (error) {
      toast.error("Erreur", {
        description: "Impossible de supprimer l'automatisation.",
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <SmartNameStep draft={draft} onUpdate={updateDraft} />;
      case 2:
        return <SmartIconStep draft={draft} onUpdate={updateDraft} />;
      case 3:
        return <SmartTriggerStep draft={draft} onUpdate={updateDraft} />;
      case 4:
        return <SmartConditionStep draft={draft} onUpdate={updateDraft} />;
      case 5:
        return <SmartActionStep draft={draft} onUpdate={updateDraft} />;
      case 6:
        return <SmartSummaryStep draft={draft} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isEditMode ? "Modifier l'automatisation" : "Nouvelle automatisation"}</span>
              <span className="text-sm font-normal text-muted-foreground">
                Étape {step}/{TOTAL_STEPS}
              </span>
            </DialogTitle>
          </DialogHeader>

          <Progress value={(step / TOTAL_STEPS) * 100} className="h-1 mb-2" />

          <p className="text-sm text-muted-foreground mb-4">{STEP_TITLES[step - 1]}</p>

          <div className="min-h-[300px]">{renderStep()}</div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={handlePrevious} disabled={isSubmitting}>
                  Précédent
                </Button>
              )}
              {isEditMode && step === 1 && (
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Annuler
              </Button>
              {step < TOTAL_STEPS ? (
                <Button onClick={handleNext} disabled={!canProceed() || isSubmitting}>
                  Suivant
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isEditMode ? "Enregistrer" : "Créer l'automatisation"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'automatisation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer « {automation?.name} » ? Cette action est irréversible et supprimera l'automatisation de Home Assistant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
