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
  scope: "" as any, // No default - user must select
  selectedEntityIds: [],
  entityStates: {},
};

/**
 * Convert a local NeoliaScene to a SceneWizardDraft for editing
 */
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

/**
 * Convert HA scene config response to SceneWizardDraft
 * HA format: { id, name, entities: { "entity_id": { state, brightness, ... }, ... }, icon }
 */
function haConfigToDraft(
  haConfig: { id: string; name: string; entities: Record<string, any>; icon?: string },
  scene: NeoliaScene
): SceneWizardDraft {
  const selectedEntityIds = Object.keys(haConfig.entities || {});
  const entityStates: Record<string, SceneEntityState["targetState"]> = {};
  
  for (const [entityId, config] of Object.entries(haConfig.entities || {})) {
    const targetState: SceneEntityState["targetState"] = {};
    
    // Map HA config to our targetState format
    if (config.state !== undefined) {
      targetState.state = config.state;
    }
    if (config.brightness !== undefined) {
      targetState.brightness = config.brightness;
    }
    if (config.brightness_pct !== undefined) {
      // Convert brightness_pct (0-100) to brightness (0-255)
      targetState.brightness = Math.round((config.brightness_pct / 100) * 255);
    }
    if (config.color_temp !== undefined) {
      targetState.color_temp = config.color_temp;
    }
    if (config.rgb_color !== undefined) {
      targetState.rgb_color = config.rgb_color;
    }
    if (config.position !== undefined) {
      targetState.position = config.position;
    }
    if (config.temperature !== undefined) {
      targetState.temperature = config.temperature;
    }
    if (config.hvac_mode !== undefined) {
      targetState.hvac_mode = config.hvac_mode;
    }
    if (config.volume_level !== undefined) {
      targetState.volume_level = config.volume_level;
    }
    
    entityStates[entityId] = targetState;
  }
  
  // Map MDI icon to Lucide icon
  let icon = scene.icon || "Sparkles";
  if (haConfig.icon) {
    // Remove "mdi:" prefix if present
    icon = haConfig.icon.replace(/^mdi:/, "");
    // Capitalize first letter
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
  const isSharedScene = scene?.scope === "shared" || scene?.id?.startsWith("scene.");
  
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setIsLoadingConfig(false);
      
      if (scene) {
        if (isSharedScene && client) {
          // Shared scene: fetch config from HA
          setIsLoadingConfig(true);
          const sceneId = scene.id.replace("scene.", "");
          
          client.getSceneConfig(sceneId)
            .then((haConfig) => {
              if (haConfig) {
                console.log("[SceneWizard] Loaded HA config:", haConfig);
                setDraft(haConfigToDraft(haConfig, scene));
              } else {
                // Config not found (legacy scene), fallback to basic info
                console.warn("[SceneWizard] HA config not found, using basic info");
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
                  description: "Cette scène n'a pas de configuration détaillée disponible. Vous pouvez la reconfigurer.",
                  variant: "default",
                });
              }
            })
            .catch((error) => {
              console.error("[SceneWizard] Error loading HA config:", error);
              // Fallback to basic info
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
                description: "Impossible de charger la configuration. Vous pouvez la reconfigurer.",
                variant: "destructive",
              });
            })
            .finally(() => {
              setIsLoadingConfig(false);
            });
        } else {
          // Local scene: use stored data directly
          setDraft(localSceneToDraft(scene));
        }
      } else {
        // Create mode: reset to initial state
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

  const canProceedStep1 = draft.name.trim().length > 0 && draft.icon.length > 0 && (draft.scope === "local" || draft.scope === "shared");
  const canProceedStep2 = draft.selectedEntityIds.length > 0;
  const canProceedStep3 = Object.keys(draft.entityStates).length > 0;

  // Auto-initialize entity states for NEW entities only when entering Step 3
  const initializeEntityStates = () => {
    const updatedStates = { ...draft.entityStates };
    
    for (const entityId of draft.selectedEntityIds) {
      // Skip if already has a state configured (from existing scene or previous edit)
      if (updatedStates[entityId] && updatedStates[entityId].state !== undefined) {
        continue;
      }
      
      const entity = entities.find((e) => e.entity_id === entityId);
      if (!entity) continue;
      
      const domain = entityId.split(".")[0];
      const state: SceneEntityState["targetState"] = {};
      
      // Basic state from current HA state
      if (["on", "off"].includes(entity.state)) {
        state.state = entity.state as "on" | "off";
      } else if (["open", "closed", "opening", "closing"].includes(entity.state)) {
        state.state = entity.state.includes("open") ? "open" : "closed";
      } else if (["playing", "paused", "idle"].includes(entity.state)) {
        state.state = entity.state as "playing" | "paused" | "idle";
      } else {
        // Default to "on" for unknown states
        state.state = "on";
      }
      
      // Domain-specific attributes from current HA state
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
          state.position = 100; // Default to open
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
    
    // Remove states for entities that were deselected
    for (const entityId of Object.keys(updatedStates)) {
      if (!draft.selectedEntityIds.includes(entityId)) {
        delete updatedStates[entityId];
      }
    }
    
    setDraft((prev) => ({ ...prev, entityStates: updatedStates }));
  };

  const handleNext = () => {
    if (step < 4) {
      // Auto-initialize entity states when transitioning to Step 3
      if (step === 2) {
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
      // Build entities array, sanitizing brightness for non-dimmable lights
      const sceneEntities: SceneEntityState[] = draft.selectedEntityIds
        .map((entityId) => {
          const entity = entities.find((e) => e.entity_id === entityId);
          if (!entity) return null;

          const domain = entityId.split(".")[0];
          const rawTargetState = draft.entityStates[entityId] || { state: "on" };
          
          // Sanitize: remove brightness for non-dimmable lights
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
              delete targetState.brightness;
              delete targetState.color_temp;
              delete targetState.rgb_color;
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
        // Update existing scene
        await updateScene(scene.id, {
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
        await addScene({
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
            {isLoadingConfig ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement de la configuration...</p>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <SceneBasicInfoStep draft={draft} onUpdate={updateDraft} isEditMode={isEditMode} />
                )}
                {step === 2 && (
                  <SceneDeviceSelectionStep draft={draft} onUpdate={updateDraft} />
                )}
                {step === 3 && (
                  <SceneStateConfigStep draft={draft} onUpdate={updateDraft} />
                )}
                {step === 4 && <SceneSummaryStep draft={draft} />}
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={step === 1 || isSubmitting || isLoadingConfig}
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
                  disabled={isLoadingConfig}
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
                  isLoadingConfig ||
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingConfig}>
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
