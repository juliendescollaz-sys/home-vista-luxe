import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Lightbulb, Blinds, Power, Fan, Music, Loader2, Trash2, Users, User } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import type { NeoliaGroup, HaGroupDomain, GroupScope } from "@/types/groups";
import { getGroupScope } from "@/types/groups";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface GroupEditDialogProps {
  group: NeoliaGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const DOMAIN_OPTIONS: Array<{
  value: HaGroupDomain;
  label: string;
  icon: any;
}> = [{
  value: "light",
  label: "Éclairages",
  icon: Lightbulb
}, {
  value: "cover",
  label: "Stores / Volets",
  icon: Blinds
}, {
  value: "switch",
  label: "Interrupteurs",
  icon: Power
}, {
  value: "fan",
  label: "Ventilateurs",
  icon: Fan
}, {
  value: "media_player",
  label: "Lecteurs média",
  icon: Music
}];
export function GroupEditDialog({
  group,
  open,
  onOpenChange
}: GroupEditDialogProps) {
  const [name, setName] = useState("");
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [scope, setScope] = useState<GroupScope>("local");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const entities = useHAStore(state => state.entities);
  const {
    createOrUpdateGroup,
    removeGroup,
    isSaving,
    error,
    clearError
  } = useGroupStore();

  // Initialiser les valeurs du formulaire
  useEffect(() => {
    if (group) {
      setName(group.name);
      setSelectedEntityIds(group.entityIds);
      setScope(getGroupScope(group));
    }
  }, [group]);

  // Filtrer les entités selon le domaine du groupe
  const availableEntities = group ? entities.filter(e => e.entity_id.startsWith(`${group.domain}.`)) : [];
  const handleClose = () => {
    clearError();
    onOpenChange(false);
  };
  const toggleEntity = (entityId: string) => {
    setSelectedEntityIds(prev => prev.includes(entityId) ? prev.filter(id => id !== entityId) : [...prev, entityId]);
  };
  const handleUpdate = async () => {
    if (!group) return;
    try {
      await createOrUpdateGroup({
        existingId: group.id,
        name,
        domain: group.domain,
        entityIds: selectedEntityIds,
        scope
      });
      toast.success("Groupe modifié");
      handleClose();
    } catch (err) {
      toast.error("Erreur lors de la modification");
    }
  };
  const handleDelete = async () => {
    if (!group) return;
    try {
      await removeGroup(group.id);
      toast.success("Groupe supprimé");
      setDeleteDialogOpen(false);
      handleClose();
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    }
  };
  const canSave = () => {
    return name.trim().length >= 3 && selectedEntityIds.length > 0;
  };
  if (!group) return null;
  const domainOption = DOMAIN_OPTIONS.find(o => o.value === group.domain);
  const DomainIcon = domainOption?.icon;
  return <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px] glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl">Modifier le groupe</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Type (lecture seule) */}
            <div className="space-y-2">
              <Label>Type d'appareil</Label>
              <div className="flex items-center gap-2 p-3 rounded-md bg-background/30 border border-border/50">
                {DomainIcon && <DomainIcon className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">{domainOption?.label}</span>
              </div>
            </div>

            {/* Nom du groupe */}
            <div className="space-y-2">
              <Label htmlFor="groupName">Nom du groupe</Label>
              <Input id="groupName" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Éclairage salon" className="bg-background/50" />
              {name.trim().length > 0 && name.trim().length < 3 && <p className="text-xs text-destructive">Minimum 3 caractères</p>}
            </div>

            {/* Portée du groupe (local / partagé) */}
            <div className="space-y-3">
              <Label>Portée du groupe</Label>
              <RadioGroup value={scope} onValueChange={v => setScope(v as GroupScope)} className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-md bg-background/30 border border-border/50 hover:bg-accent/30 transition-colors">
                  <RadioGroupItem value="local" id="scope-local" className="mt-0.5" />
                  <label htmlFor="scope-local" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Local</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Seulement dans cette app, sur cet appareil
                    </p>
                  </label>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-background/30 border border-border/50 hover:bg-accent/30 transition-colors">
                  <RadioGroupItem value="shared" id="scope-shared" className="mt-0.5" />
                  <label htmlFor="scope-shared" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary/70" />
                      <span className="font-medium text-sm">Partagé</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Disponible pour tous les utilisateurs</p>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Sélection des appareils */}
            <div className="space-y-2">
              <Label>Appareils du groupe</Label>
              <ScrollArea className="h-[200px] rounded-md border border-border/50 p-4 bg-background/30">
                {availableEntities.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">
                    Aucun appareil disponible pour ce type.
                  </p> : <div className="space-y-3">
                    {availableEntities.map(entity => <div key={entity.entity_id} className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                        <Checkbox id={entity.entity_id} checked={selectedEntityIds.includes(entity.entity_id)} onCheckedChange={() => toggleEntity(entity.entity_id)} />
                        <label htmlFor={entity.entity_id} className="flex-1 cursor-pointer select-none">
                          <div className="font-medium text-sm">
                            {entity.attributes.friendly_name || entity.entity_id}
                          </div>
                          <div className="text-xs text-muted-foreground">{entity.entity_id}</div>
                        </label>
                      </div>)}
                  </div>}
              </ScrollArea>

              {selectedEntityIds.length > 0 && <p className="text-xs text-muted-foreground">
                  {selectedEntityIds.length} appareil{selectedEntityIds.length > 1 ? "s" : ""}{" "}
                  sélectionné{selectedEntityIds.length > 1 ? "s" : ""}
                </p>}
            </div>

            {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={isSaving} className="gap-2 sm:mr-auto">
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleClose} disabled={isSaving} className="flex-1 sm:flex-none">
                Annuler
              </Button>
              <Button onClick={handleUpdate} disabled={!canSave() || isSaving} className="flex-1 sm:flex-none">
                {isSaving ? <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enregistrement...
                  </> : "Enregistrer"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le groupe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le groupe "{group.name}" sera définitivement supprimé de votre Home Assistant.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}