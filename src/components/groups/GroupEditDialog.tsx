import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2, Users, User, Layers } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import type { NeoliaGroup, HaGroupDomain, GroupScope } from "@/types/groups";
import { getGroupScope, getGroupDomains, getGroupMode } from "@/types/groups";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getAvailableDomains, areAllDomainsBinary, getEntitiesForDomains, type DeviceDisplayInfo } from "@/lib/groupDomains";

interface GroupEditDialogProps { group: NeoliaGroup | null; open: boolean; onOpenChange: (open: boolean) => void; }

export function GroupEditDialog({ group, open, onOpenChange }: GroupEditDialogProps) {
  const [name, setName] = useState("");
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [scope, setScope] = useState<GroupScope>("local");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [isMixedMode, setIsMixedMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const { createOrUpdateGroup, removeGroup, isSaving, error, clearError } = useGroupStore();

  const availableDomains = useMemo(() => getAvailableDomains(entities), [entities]);
  const binaryDomains = useMemo(() => availableDomains.filter((d) => d.isBinary), [availableDomains]);
  const availableEntities: DeviceDisplayInfo[] = useMemo(() => selectedDomains.length === 0 ? [] : getEntitiesForDomains(entities, selectedDomains, entityRegistry, devices, areas, floors), [selectedDomains, entities, entityRegistry, devices, areas, floors]);
  const mixedModeError = useMemo(() => { if (!isMixedMode || selectedDomains.length <= 1) return null; if (!areAllDomainsBinary(selectedDomains)) return "Les groupes mixtes ne peuvent contenir que des types binaires (ON/OFF)."; return null; }, [isMixedMode, selectedDomains]);

  useEffect(() => { if (group) { setName(group.name); setSelectedEntityIds(group.entityIds); setScope(getGroupScope(group)); const domains = getGroupDomains(group); setSelectedDomains(domains); setIsMixedMode(getGroupMode(group) === "mixedBinary"); } }, [group]);

  const handleClose = () => { clearError(); onOpenChange(false); };
  const handleDomainToggle = (domain: string) => { if (isMixedMode) { setSelectedDomains((prev) => prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]); } else { setSelectedDomains([domain]); } setSelectedEntityIds((prev) => prev.filter((id) => { const d = id.split(".")[0]; return isMixedMode ? selectedDomains.includes(d) || domain === d : domain === d; })); };
  const toggleMixedMode = (enabled: boolean) => { 
    setIsMixedMode(enabled); 
    if (enabled) {
      // Groupes mixtes sont toujours locaux
      setScope("local");
    }
    if (!enabled && selectedDomains.length > 1) { 
      setSelectedDomains([selectedDomains[0]]); 
      const firstDomain = selectedDomains[0]; 
      setSelectedEntityIds((prev) => prev.filter((id) => id.startsWith(`${firstDomain}.`))); 
    } 
  };
  const toggleEntity = (entityId: string) => { setSelectedEntityIds((prev) => prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId]); };

  // Déterminer si le groupe peut être partagé
  const isMixedGroup = isMixedMode && selectedDomains.length > 1;

  const handleUpdate = async () => { if (!group || selectedDomains.length === 0) return; const mode = isMixedMode && selectedDomains.length > 1 ? "mixedBinary" : "singleDomain"; try { await createOrUpdateGroup({ existingId: group.id, name, domain: selectedDomains[0] as HaGroupDomain, domains: selectedDomains, mode, entityIds: selectedEntityIds, scope }); toast.success("Groupe modifié"); handleClose(); } catch { toast.error("Erreur lors de la modification"); } };
  const handleDelete = async () => { if (!group) return; try { await removeGroup(group.id); toast.success("Groupe supprimé"); setDeleteDialogOpen(false); handleClose(); } catch { toast.error("Erreur lors de la suppression"); } };
  const canSave = () => name.trim().length >= 3 && selectedEntityIds.length > 0 && selectedDomains.length > 0 && !mixedModeError;

  if (!group) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col glass-card border-border/50">
          <DialogHeader className="flex-shrink-0"><DialogTitle className="text-xl">Modifier le groupe</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 space-y-6 py-4">
            <div className="space-y-2"><Label htmlFor="groupName">Nom du groupe</Label><Input id="groupName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Éclairage salon" className="bg-background/50" />{name.trim().length > 0 && name.trim().length < 3 && <p className="text-xs text-destructive">Minimum 3 caractères</p>}</div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/20"><div className="flex items-center gap-2"><Layers className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">Groupe mixte (binaires)</p><p className="text-xs text-muted-foreground">Combiner éclairages, interrupteurs, vannes...</p></div></div><Switch checked={isMixedMode} onCheckedChange={toggleMixedMode} /></div>
            <div className="space-y-2"><Label>{isMixedMode ? "Types d'appareils" : "Type d'appareil"}</Label><div className="space-y-2 max-h-[150px] overflow-y-auto">{(isMixedMode ? binaryDomains : availableDomains).map((opt) => (<div key={opt.value} className="flex items-center gap-3 p-2 rounded-md bg-background/30 border border-border/50 hover:bg-accent/30 transition-colors"><Checkbox id={`edit-domain-${opt.value}`} checked={selectedDomains.includes(opt.value)} onCheckedChange={() => handleDomainToggle(opt.value)} /><label htmlFor={`edit-domain-${opt.value}`} className="flex items-center gap-2 flex-1 cursor-pointer"><opt.icon className="h-4 w-4" />{opt.label}</label></div>))}</div>{mixedModeError && <p className="text-xs text-destructive">{mixedModeError}</p>}</div>
            <div className="space-y-3">
              <Label>Portée du groupe</Label>
              {isMixedGroup ? (
                <div className="rounded-md bg-muted/50 border border-border/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Local uniquement</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Les groupes mixtes ne peuvent pas être partagés car Home Assistant ne supporte pas les groupes multi-domaines.</p>
                </div>
              ) : (
                <RadioGroup value={scope} onValueChange={(v) => setScope(v as GroupScope)} className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-md bg-background/30 border border-border/50 hover:bg-accent/30 transition-colors">
                    <RadioGroupItem value="local" id="scope-local" className="mt-0.5" />
                    <label htmlFor="scope-local" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Local</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Seulement dans cette app, sur cet appareil</p>
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
              )}
            </div>
            <div className="space-y-2"><Label>Appareils du groupe</Label><ScrollArea className="h-[180px] rounded-md border border-border/50 p-4 bg-background/30">{availableEntities.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-8">Aucun appareil disponible.</p>) : (<div className="space-y-2">{availableEntities.map((device) => (<label key={device.entityId} className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"><Checkbox checked={selectedEntityIds.includes(device.entityId)} onCheckedChange={() => toggleEntity(device.entityId)} className="mt-0.5" /><div className="flex flex-col min-w-0"><span className="text-sm font-medium truncate">{device.friendlyName}</span><span className="text-xs text-muted-foreground">{device.floorName && device.areaName ? `${device.floorName} • ${device.areaName}` : device.areaName || device.floorName || "Emplacement inconnu"}</span></div></label>))}</div>)}</ScrollArea>{selectedEntityIds.length > 0 && <p className="text-xs text-muted-foreground">{selectedEntityIds.length} appareil{selectedEntityIds.length > 1 ? "s" : ""} sélectionné{selectedEntityIds.length > 1 ? "s" : ""}</p>}</div>
            {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3"><p className="text-sm text-destructive">{error}</p></div>}
          </div>
          <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 pt-4 border-t border-border/50">
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={isSaving} className="gap-2 sm:mr-auto"><Trash2 className="h-4 w-4" />Supprimer</Button>
            <div className="flex gap-2 w-full sm:w-auto"><Button variant="outline" onClick={handleClose} disabled={isSaving} className="flex-1 sm:flex-none">Annuler</Button><Button onClick={handleUpdate} disabled={!canSave() || isSaving} className="flex-1 sm:flex-none">{isSaving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement...</>) : "Enregistrer"}</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer le groupe ?</AlertDialogTitle><AlertDialogDescription>Le groupe "{group.name}" sera définitivement supprimé.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
