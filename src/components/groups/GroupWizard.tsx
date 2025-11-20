import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Lightbulb, Blinds, Power, Fan, Music, ChevronLeft, ChevronRight, Check, Loader2, Cloud, Lock } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import type { HaGroupDomain } from "@/types/groups";
import { toast } from "sonner";

interface GroupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOMAIN_OPTIONS: Array<{ value: HaGroupDomain; label: string; icon: any }> = [
  { value: "light", label: "Éclairages", icon: Lightbulb },
  { value: "cover", label: "Stores / Volets", icon: Blinds },
  { value: "switch", label: "Interrupteurs", icon: Power },
  { value: "fan", label: "Ventilateurs", icon: Fan },
  { value: "media_player", label: "Lecteurs média", icon: Music },
];

export function GroupWizard({ open, onOpenChange }: GroupWizardProps) {
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState<HaGroupDomain | undefined>();
  const [name, setName] = useState("");
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(true);

  const entities = useHAStore((state) => state.entities);
  const { createOrUpdateGroup, isSaving, error, clearError } = useGroupStore();

  // Filtrer les entités selon le domaine sélectionné
  const availableEntities = domain
    ? entities.filter((e) => e.entity_id.startsWith(`${domain}.`))
    : [];

  const handleClose = () => {
    setStep(1);
    setDomain(undefined);
    setName("");
    setSelectedEntityIds([]);
    setIsShared(true);
    clearError();
    onOpenChange(false);
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
      clearError();
    }
  };

  const toggleEntity = (entityId: string) => {
    setSelectedEntityIds((prev) =>
      prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId]
    );
  };

  const handleCreate = async () => {
    if (!domain) return;

    try {
      await createOrUpdateGroup({
        name,
        domain,
        entityIds: selectedEntityIds,
        isShared,
      });
      toast.success("Groupe créé avec succès");
      handleClose();
    } catch (err) {
      toast.error("Erreur lors de la création du groupe");
    }
  };

  const canGoNext = () => {
    if (step === 1) return !!domain;
    if (step === 2) return name.trim().length >= 3;
    if (step === 3) return selectedEntityIds.length > 0;
    return false;
  };

  const DomainIcon = domain ? DOMAIN_OPTIONS.find((o) => o.value === domain)?.icon : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Créer un groupe d'appareils
            <span className="block text-sm text-muted-foreground font-normal mt-1">
              Étape {step} sur 4
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Étape 1: Choix du type */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Un groupe ne peut contenir que des appareils du même type.
                <br />
                <strong>Exemple :</strong> un groupe d'éclairages, un groupe de stores, etc.
              </p>

              <div className="space-y-2">
                <Label htmlFor="domain">Type d'appareil</Label>
                <Select value={domain} onValueChange={(v) => setDomain(v as HaGroupDomain)}>
                  <SelectTrigger id="domain">
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAIN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Étape 2: Nom du groupe */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Donnez un nom clair, par exemple <strong>"Éclairage salon"</strong> ou{" "}
                <strong>"Stores étage 1"</strong>.
              </p>

              <div className="space-y-2">
                <Label htmlFor="groupName">Nom du groupe</Label>
                <Input
                  id="groupName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Éclairage salon"
                  className="bg-background/50"
                />
                {name.trim().length > 0 && name.trim().length < 3 && (
                  <p className="text-xs text-destructive">Minimum 3 caractères</p>
                )}
              </div>
            </div>
          )}

          {/* Étape 3: Sélection des appareils */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sélectionnez les appareils qui seront contrôlés ensemble par ce bouton de groupe.
              </p>

              <ScrollArea className="h-[300px] rounded-md border border-border/50 p-4 bg-background/30">
                {availableEntities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucun appareil disponible pour ce type.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {availableEntities.map((entity) => (
                      <div
                        key={entity.entity_id}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={entity.entity_id}
                          checked={selectedEntityIds.includes(entity.entity_id)}
                          onCheckedChange={() => toggleEntity(entity.entity_id)}
                        />
                        <label
                          htmlFor={entity.entity_id}
                          className="flex-1 cursor-pointer select-none"
                        >
                          <div className="font-medium text-sm">
                            {entity.attributes.friendly_name || entity.entity_id}
                          </div>
                          <div className="text-xs text-muted-foreground">{entity.entity_id}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {selectedEntityIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedEntityIds.length} appareil{selectedEntityIds.length > 1 ? "s" : ""}{" "}
                  sélectionné{selectedEntityIds.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Étape 4: Résumé */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="share-toggle" className="text-base">
                    Mettre ce groupe à disposition des autres utilisateurs ?
                  </Label>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/20">
                    <div className="flex items-center gap-3">
                      {isShared ? (
                        <Cloud className="h-5 w-5 text-primary" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {isShared ? "Groupe partagé" : "Groupe privé"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isShared
                            ? "Visible sur tous les appareils utilisant Neolia"
                            : "Uniquement sur cet appareil"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="share-toggle"
                      checked={isShared}
                      onCheckedChange={setIsShared}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-background/30 p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Nom</p>
                  <p className="font-semibold">{name}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
                  <div className="flex items-center gap-2">
                    {DomainIcon && <DomainIcon className="h-4 w-4" />}
                    <span className="font-medium">
                      {DOMAIN_OPTIONS.find((o) => o.value === domain)?.label}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Appareils ({selectedEntityIds.length})
                  </p>
                  <ul className="space-y-1 text-sm">
                    {selectedEntityIds.map((id) => {
                      const entity = entities.find((e) => e.entity_id === id);
                      return (
                        <li key={id} className="text-muted-foreground">
                          • {entity?.attributes.friendly_name || id}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1 || isSaving}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>

          {step < 4 ? (
            <Button onClick={handleNext} disabled={!canGoNext()} className="gap-2">
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Créer le groupe
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
