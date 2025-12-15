import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Pencil, Loader2, Trash2, Users, User, Layers, CheckCircle } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import type { NeoliaGroup, HaGroupDomain, GroupScope } from "@/types/groups";
import { getGroupScope, getGroupDomains, getGroupMode } from "@/types/groups";
import { toast } from "@/hooks/use-toast";
import { getAvailableDomains, areAllDomainsBinary, getEntitiesForDomains, type DeviceDisplayInfo } from "@/lib/groupDomains";

interface GroupEditDialogProps {
  group: NeoliaGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TOTAL_STEPS = 4;

const STEP_TITLES = [
  "Type d'appareil",
  "Nom du groupe",
  "Sélection des appareils",
  "Portée",
];

export function GroupEditDialog({ group, open, onOpenChange }: GroupEditDialogProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [scope, setScope] = useState<GroupScope>("local");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [isMixedMode, setIsMixedMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const { createOrUpdateGroup, removeGroup } = useGroupStore();

  const availableDomains = useMemo(() => getAvailableDomains(entities), [entities]);
  const binaryDomains = useMemo(() => availableDomains.filter((d) => d.isBinary), [availableDomains]);

  const availableEntities: DeviceDisplayInfo[] = useMemo(() => {
    if (selectedDomains.length === 0) return [];
    return getEntitiesForDomains(entities, selectedDomains, entityRegistry, devices, areas, floors);
  }, [selectedDomains, entities, entityRegistry, devices, areas, floors]);

  const mixedModeError = useMemo(() => {
    if (!isMixedMode || selectedDomains.length <= 1) return null;
    if (!areAllDomainsBinary(selectedDomains)) return "Les groupes mixtes ne peuvent contenir que des types binaires (ON/OFF).";
    return null;
  }, [isMixedMode, selectedDomains]);

  const isMixedGroup = isMixedMode && selectedDomains.length > 1;

  useEffect(() => {
    if (group && open) {
      setStep(1);
      setName(group.name);
      setSelectedEntityIds(group.entityIds);
      setScope(getGroupScope(group));
      const domains = getGroupDomains(group);
      setSelectedDomains(domains);
      setIsMixedMode(getGroupMode(group) === "mixedBinary");
    }
  }, [group, open]);

  const handleClose = () => {
    setStep(1);
    onOpenChange(false);
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

  const handleDomainToggle = (domain: string) => {
    const newDomains = isMixedMode
      ? (selectedDomains.includes(domain) ? selectedDomains.filter((d) => d !== domain) : [...selectedDomains, domain])
      : [domain];

    setSelectedDomains(newDomains);
    setSelectedEntityIds((prev) => prev.filter((id) => {
      const d = id.split(".")[0];
      return newDomains.includes(d);
    }));
  };

  const toggleMixedMode = (enabled: boolean) => {
    setIsMixedMode(enabled);
    if (enabled) {
      setScope("local");
    }
    if (!enabled && selectedDomains.length > 1) {
      setSelectedDomains([selectedDomains[0]]);
      const firstDomain = selectedDomains[0];
      setSelectedEntityIds((prev) => prev.filter((id) => id.startsWith(`${firstDomain}.`)));
    }
  };

  const toggleEntity = (entityId: string) => {
    setSelectedEntityIds((prev) => {
      if (prev.includes(entityId)) {
        return prev.filter((id) => id !== entityId);
      }
      return [...new Set([...prev, entityId])];
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedDomains.length > 0 && !mixedModeError;
      case 2:
        return name.trim().length >= 3;
      case 3:
        return selectedEntityIds.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!group || selectedDomains.length === 0) return;
    setIsSubmitting(true);

    const mode = isMixedMode && selectedDomains.length > 1 ? "mixedBinary" : "singleDomain";

    try {
      await createOrUpdateGroup({
        existingId: group.id,
        name,
        domain: selectedDomains[0] as HaGroupDomain,
        domains: selectedDomains,
        mode,
        entityIds: selectedEntityIds,
        scope,
      });

      toast({
        title: "Groupe modifié",
        description: `Le groupe "${name}" a été mis à jour.`,
      });

      handleClose();
    } catch (error) {
      console.error("[GroupEditDialog] Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le groupe. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!group) return;
    try {
      await removeGroup(group.id);
      toast({
        title: "Groupe supprimé",
        description: `"${group.name}" a été supprimé.`,
      });
      setIsDeleteConfirmOpen(false);
      handleClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le groupe.",
        variant: "destructive",
      });
    }
  };

  const selectedDomainConfigs = availableDomains.filter((d) => selectedDomains.includes(d.value));
  const FirstIcon = selectedDomainConfigs[0]?.icon;

  if (!group) return null;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Groupe mixte (binaires)</p>
                    <p className="text-sm text-muted-foreground">Combiner éclairages, interrupteurs, vannes...</p>
                  </div>
                </div>
                <Switch checked={isMixedMode} onCheckedChange={toggleMixedMode} />
              </div>

              <div className="space-y-2">
                <Label>{isMixedMode ? "Types d'appareils (multi-sélection)" : "Type d'appareil"}</Label>

                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {(isMixedMode ? binaryDomains : availableDomains).map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedDomains.includes(opt.value)}
                        onCheckedChange={() => handleDomainToggle(opt.value)}
                      />
                      <opt.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>

                {mixedModeError && <p className="text-sm text-destructive">{mixedModeError}</p>}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Pourquoi choisir un type ?</span> Un groupe contrôle plusieurs appareils 
                ensemble. Sélectionnez le type d'appareils que vous souhaitez regrouper.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-group-name">Nom du groupe</Label>
              <Input
                id="edit-group-name"
                placeholder="Ex: Éclairage salon, Volets étage..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
                autoFocus
              />
              {name.trim().length > 0 && name.trim().length < 3 && (
                <p className="text-sm text-destructive">Minimum 3 caractères</p>
              )}
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Pourquoi un nom ?</span> Un nom clair comme "Éclairage salon" 
                vous permet d'identifier rapidement votre groupe dans la liste.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Sélectionnés : <strong>{selectedEntityIds.length}</strong> appareil(s)
            </div>

            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2">
              {availableEntities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun appareil disponible.</p>
              ) : (
                availableEntities.map((device) => (
                  <label
                    key={device.entityId}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedEntityIds.includes(device.entityId)}
                      onCheckedChange={() => toggleEntity(device.entityId)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{device.friendlyName}</span>
                      <span className="text-sm text-muted-foreground">
                        {device.floorName && device.areaName
                          ? `${device.areaName} • ${device.floorName}`
                          : device.areaName || device.floorName || "Emplacement inconnu"}
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Conseil :</span> Sélectionnez les appareils que vous souhaitez 
                contrôler ensemble dans ce groupe.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {isMixedGroup ? (
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Local uniquement</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Les groupes mixtes sont toujours locaux car Home Assistant ne supporte pas 
                  les groupes multi-domaines.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Portée du groupe</Label>

                <RadioGroup
                  value={scope}
                  onValueChange={(value: GroupScope) => setScope(value)}
                  className="grid grid-cols-1 gap-3"
                >
                  <label
                    htmlFor="edit-group-scope-local"
                    className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value="local" id="edit-group-scope-local" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <User className="w-5 h-5" />
                        Local uniquement
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Visible seulement dans cette application Neolia.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="edit-group-scope-shared"
                    className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value="shared" id="edit-group-scope-shared" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <Users className="w-5 h-5" />
                        Partagé
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Créé dans Home Assistant, accessible à tous les utilisateurs.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            )}

            {/* Summary */}
            <div className="p-4 rounded-lg border border-border/50 bg-muted/30 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">Résumé</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom</span>
                  <span className="font-medium">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <div className="flex items-center gap-2">
                    {selectedDomainConfigs.length > 1 ? (
                      <>
                        <Layers className="h-4 w-4" />
                        <span className="font-medium">Groupe mixte</span>
                      </>
                    ) : (
                      <>
                        {FirstIcon && <FirstIcon className="h-4 w-4" />}
                        <span className="font-medium">{selectedDomainConfigs[0]?.label}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Appareils</span>
                  <span className="font-medium">{selectedEntityIds.length}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Quelle différence ?</span> Les groupes locaux sont privés et 
                stockés sur cet appareil. Les groupes partagés sont visibles par tous via Home Assistant.
              </p>
            </div>
          </div>
        );

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
              <Pencil className="w-5 h-5 text-primary" />
              Modifier le groupe
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
                <Button variant="ghost" onClick={handlePrevious} disabled={isSubmitting}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
              )}

              {step === 1 && (
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
                <span className={isSubmitting ? "opacity-0" : ""}>Enregistrer</span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le groupe</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le groupe "{group?.name}" ? Cette action est irréversible.
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
