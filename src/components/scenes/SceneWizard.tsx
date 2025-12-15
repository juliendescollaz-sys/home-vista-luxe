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
import { useSceneStore } from "@/store/useSceneStore";
import { SceneWizardDraft, SceneEntityState, NeoliaScene } from "@/types/scenes";
import { SceneNameStep } from "./steps/SceneNameStep";
import { SceneIconStep } from "./steps/SceneIconStep";
import { SceneScopeStep } from "./steps/SceneScopeStep";
import { SceneDeviceSelectionStep } from "./steps/SceneDeviceSelectionStep";
import { SceneStateConfigStep } from "./steps/SceneStateConfigStep";
import { SceneSummaryStep } from "./steps/SceneSummaryStep";
import { useHAStore } from "@/store/useHAStore";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Pencil, Trash2 } from "lucide-react";

interface SceneWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scene?: NeoliaScene;
}

const TOTAL_STEPS = 6;

const STEP_TITLES = [
  "Nom de la scène",
  "Icône",
  "Portée",
  "Sélection des appareils",
  "Configuration des états",
  "Résumé",
];

const INITIAL_DRAFT: SceneWizardDraft = {
  name: "",
  icon: "Sparkles",
  description: "",
  scope: "" as any,
  selectedEntityIds: [],
  entityStates: {},
};

function localSceneToDraft(scene: NeoliaScene): SceneWizardDraft {
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

function haConfigToDraft(
  haConfig: {
    id: string;
    name: string;
    entities: Record<string, any>;
    icon?: string;
  },
  scene: NeoliaScene
): SceneWizardDraft {
  const selectedEntityIds = Object.keys(haConfig.entities || {});
  const entityStates: Record<string, SceneEntityState["targetState"]> = {};

  for (const [entityId, config] of Object.entries(haConfig.entities || {})) {
    const targetState: SceneEntityState["targetState"] = {};

    if (config.state !== undefined) targetState.state = config.state;
    if (config.brightness !== undefined) targetState.brightness = config.brightness;
    if (config.brightness_pct !== undefined) {
      targetState.brightness = Math.round((config.brightness_pct / 100) * 255);
    }
    if (config.color_temp !== undefined) targetState.color_temp = config.color_temp;
    if (config.rgb_color !== undefined) targetState.rgb_color = config.rgb_color;
    if (config.position !== undefined) targetState.position = config.position;
    if (config.temperature !== undefined) targetState.temperature = config.temperature;
    if (config.hvac_mode !== undefined) targetState.hvac_mode = config.hvac_mode;
    if (config.volume_level !== undefined) targetState.volume_level = config.volume_level;

    entityStates[entityId] = targetState;
  }

  let icon = scene.icon || "Sparkles";
  if (haConfig.icon) {
    icon = haConfig.icon.replace(/^mdi:/, "");
    icon = icon.charAt(0).toUpperCase() + icon.slice(1);
  }

  return {
    name: haConfig.name || scene.name,
    icon,
    description: scene.description || "",
    scope: "shared",
    selectedEntityIds,
    entityStates,
  };
}

export function SceneWizard({ open, onOpenChange, scene }: SceneWizardProps) {
  const isEditMode = !!scene;
  const isSharedScene = scene?.scope === "shared" || (scene?.id?.startsWith("scene.") ?? false);

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<SceneWizardDraft>(INITIAL_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const addScene = useSceneStore((s) => s.addScene);
  const updateScene = useSceneStore((s) => s.updateScene);
  const deleteScene = useSceneStore((s) => s.deleteScene);
  const entities = useHAStore((s) => s.entities);
  const client = useHAStore((s) => s.client);

  useEffect(() => {
    if (open) {
      setStep(1);
      setIsLoadingConfig(false);

      if (scene) {
        if (isSharedScene && client) {
          setIsLoadingConfig(true);
          const sceneId = scene.id.replace("scene.", "");

          client
            .getSceneConfig(sceneId)
            .then((haConfig) => {
              if (haConfig) {
                setDraft(haConfigToDraft(haConfig, scene));
              } else {
                setDraft({
                  name: scene.name,
                  icon: scene.icon,
                  description: scene.description || "",
                  scope: "shared",
                  selectedEntityIds: [],
                  entityStates: {},
                });
                toast({
                  title: "Configuration incomplète",
                  description: "Cette scène n'a pas de configuration détaillée disponible.",
                  variant: "default",
                });
              }
            })
            .catch((error) => {
              console.error("[SceneWizard] Error loading HA config:", error);
              setDraft({
                name: scene.name,
                icon: scene.icon,
                description: scene.description || "",
                scope: "shared",
                selectedEntityIds: [],
                entityStates: {},
              });
              toast({
                title: "Erreur de chargement",
                description: "Impossible de charger la configuration.",
                variant: "destructive",
              });
            })
            .finally(() => {
              setIsLoadingConfig(false);
            });
        } else {
          setDraft(localSceneToDraft(scene));
        }
      } else {
        setDraft(INITIAL_DRAFT);
      }
    }
  }, [open, scene, isSharedScene, client]);

  const updateDraft = (updates: Partial<SceneWizardDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleClose = () => {
    setStep(1);
    setDraft(INITIAL_DRAFT);
    onOpenChange(false);
  };

  // Validation per step
  const canProceed = () => {
    switch (step) {
      case 1:
        return draft.name.trim().length > 0;
      case 2:
        return draft.icon.length > 0;
      case 3:
        return draft.scope === "local" || draft.scope === "shared";
      case 4:
        return draft.selectedEntityIds.length > 0;
      case 5:
        return Object.keys(draft.entityStates).length > 0;
      default:
        return true;
    }
  };

  const initializeEntityStates = () => {
    const updatedStates = { ...draft.entityStates };

    for (const entityId of draft.selectedEntityIds) {
      if (updatedStates[entityId] && updatedStates[entityId].state !== undefined) {
        continue;
      }

      const entity = entities.find((e) => e.entity_id === entityId);
      if (!entity) continue;

      const domain = entityId.split(".")[0];
      const state: SceneEntityState["targetState"] = {};

      if (["on", "off"].includes(entity.state)) {
        state.state = entity.state as "on" | "off";
      } else if (["open", "closed", "opening", "closing"].includes(entity.state)) {
        state.state = entity.state.includes("open") ? "open" : "closed";
      } else if (["playing", "paused", "idle"].includes(entity.state)) {
        state.state = entity.state as "playing" | "paused" | "idle";
      } else {
        state.state = "on";
      }

      if (domain === "light") {
        if (entity.attributes.brightness !== undefined) {
          state.brightness = entity.attributes.brightness;
        }
        if (entity.attributes.color_temp !== undefined) {
          state.color_temp = entity.attributes.color_temp;
        }
        if (entity.attributes.rgb_color !== undefined) {
          state.rgb_color = entity.attributes.rgb_color;
        }
      } else if (domain === "cover") {
        if (entity.attributes.current_position !== undefined) {
          state.position = entity.attributes.current_position;
        } else {
          state.position = 100;
        }
      } else if (domain === "climate") {
        state.hvac_mode = entity.attributes.hvac_mode || "off";
        if (entity.attributes.temperature !== undefined) {
          state.temperature = entity.attributes.temperature;
        }
      } else if (domain === "media_player") {
        if (entity.attributes.volume_level !== undefined) {
          state.volume_level = entity.attributes.volume_level;
        }
      }

      updatedStates[entityId] = state;
    }

    for (const entityId of Object.keys(updatedStates)) {
      if (!draft.selectedEntityIds.includes(entityId)) {
        delete updatedStates[entityId];
      }
    }

    setDraft((prev) => ({ ...prev, entityStates: updatedStates }));
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      if (step === 4) {
        initializeEntityStates();
      }
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
      const sceneEntities: SceneEntityState[] = draft.selectedEntityIds
        .map((entityId) => {
          const entity = entities.find((e) => e.entity_id === entityId);
          if (!entity) return null;

          const domain = entityId.split(".")[0];
          const rawTargetState = draft.entityStates[entityId] || ({ state: "on" } as any);

          const targetState = { ...rawTargetState };
          if (domain === "light") {
            const supportedColorModes = entity.attributes.supported_color_modes as string[] | undefined;
            const isDimmable =
              (Array.isArray(supportedColorModes) &&
                supportedColorModes.some((m) =>
                  ["brightness", "hs", "xy", "rgb", "rgbw", "rgbww", "color_temp"].includes(m)
                )) ||
              typeof entity.attributes.brightness === "number";

            if (!isDimmable) {
              delete (targetState as any).brightness;
              delete (targetState as any).color_temp;
              delete (targetState as any).rgb_color;
            }
          }

          return {
            entity_id: entityId,
            domain,
            targetState,
          };
        })
        .filter(Boolean) as SceneEntityState[];

      if (isEditMode && scene) {
        await updateScene(scene.id, {
          name: draft.name.trim(),
          icon: draft.icon,
          scope: draft.scope,
          entities: sceneEntities,
        });

        toast({
          title: "Scène modifiée",
          description: `La scène "${draft.name}" a été mise à jour.`,
        });
      } else {
        await addScene({
          name: draft.name.trim(),
          icon: draft.icon,
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

  const handleDelete = async () => {
    if (scene) {
      try {
        await deleteScene(scene.id);
        setIsDeleteConfirmOpen(false);
        handleClose();

        toast({
          title: "Scène supprimée",
          description: `"${scene.name}" a été supprimée.`,
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer la scène.",
          variant: "destructive",
        });
      }
    }
  };

  const wizardTitle = isEditMode ? "Modifier la scène" : "Créer une scène";

  const renderStep = () => {
    if (isLoadingConfig) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement de la configuration...</p>
        </div>
      );
    }

    switch (step) {
      case 1:
        return <SceneNameStep draft={draft} onUpdate={updateDraft} />;
      case 2:
        return <SceneIconStep draft={draft} onUpdate={updateDraft} />;
      case 3:
        return <SceneScopeStep draft={draft} onUpdate={updateDraft} isEditMode={isEditMode} />;
      case 4:
        return <SceneDeviceSelectionStep draft={draft} onUpdate={updateDraft} />;
      case 5:
        return <SceneStateConfigStep draft={draft} onUpdate={updateDraft} />;
      case 6:
        return <SceneSummaryStep draft={draft} />;
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
              {isEditMode ? <Pencil className="w-5 h-5 text-primary" /> : <Sparkles className="w-5 h-5 text-primary" />}
              {wizardTitle}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Étape {step}/{TOTAL_STEPS} – {STEP_TITLES[step - 1]}
            </p>
          </DialogHeader>

          <div className="px-1 py-2">
            <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />
          </div>

          <div className="flex-1 overflow-y-auto px-1 py-2 bg-background">{renderStep()}</div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="ghost" onClick={handlePrevious} disabled={isSubmitting || isLoadingConfig}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
              )}

              {isEditMode && step === 1 && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  disabled={isLoadingConfig}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              )}
            </div>

            {step < TOTAL_STEPS ? (
              <Button onClick={handleNext} disabled={isLoadingConfig || !canProceed()}>
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingConfig} className="relative">
                {isSubmitting && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </span>
                )}
                <span className={isSubmitting ? "opacity-0" : ""}>
                  {isEditMode ? "Enregistrer" : "Créer la scène"}
                </span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la scène</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la scène "{scene?.name}" ? Cette action est irréversible.
              Les états des appareils ne seront pas modifiés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
