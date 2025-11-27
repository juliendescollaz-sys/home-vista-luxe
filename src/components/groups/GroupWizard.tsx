import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Check, Loader2, Users, User, Layers } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import type { HaGroupDomain } from "@/types/groups";
import { toast } from "sonner";
import { getAvailableDomains, areAllDomainsBinary, getEntitiesForDomains, type DeviceDisplayInfo } from "@/lib/groupDomains";

interface GroupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupWizard({ open, onOpenChange }: GroupWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [isMixedMode, setIsMixedMode] = useState(false);
  const [name, setName] = useState("");
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(true);

  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const { createOrUpdateGroup, isSaving, error, clearError } = useGroupStore();

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

  const handleClose = () => { setStep(1); setSelectedDomains([]); setIsMixedMode(false); setName(""); setSelectedEntityIds([]); setIsShared(true); clearError(); onOpenChange(false); };
  const handleNext = () => { if (step < 4) setStep(step + 1); };
  const handlePrevious = () => { if (step > 1) { setStep(step - 1); clearError(); } };
  const handleDomainSelect = (domain: string) => { if (isMixedMode) { setSelectedDomains((prev) => prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]); } else { setSelectedDomains([domain]); } setSelectedEntityIds([]); };
  const toggleMixedMode = (enabled: boolean) => { 
    setIsMixedMode(enabled); 
    if (enabled) {
      // Groupes mixtes sont toujours locaux
      setIsShared(false);
    }
    if (!enabled && selectedDomains.length > 1) setSelectedDomains([selectedDomains[0]]); 
    setSelectedEntityIds([]); 
  };
  const toggleEntity = (entityId: string) => { setSelectedEntityIds((prev) => prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId]); };

  const handleCreate = async () => {
    if (selectedDomains.length === 0) return;
    const mode = isMixedMode && selectedDomains.length > 1 ? "mixedBinary" : "singleDomain";
    try {
      await createOrUpdateGroup({ name, domain: selectedDomains[0] as HaGroupDomain, domains: selectedDomains, mode, entityIds: selectedEntityIds, scope: isShared ? "shared" : "local" });
      toast.success("Groupe créé avec succès");
      handleClose();
    } catch { toast.error("Erreur lors de la création du groupe"); }
  };

  const canGoNext = () => { if (step === 1) return selectedDomains.length > 0 && !mixedModeError; if (step === 2) return name.trim().length >= 3; if (step === 3) return selectedEntityIds.length > 0; return false; };
  // Déterminer si le groupe peut être partagé (seulement les groupes single domain)
  const canBeShared = !isMixedMode || selectedDomains.length <= 1;
  const isMixedGroup = isMixedMode && selectedDomains.length > 1;
  const selectedDomainConfigs = availableDomains.filter((d) => selectedDomains.includes(d.value));
  const FirstIcon = selectedDomainConfigs[0]?.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col glass-card border-border/50">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">Créer un groupe d'appareils<span className="block text-sm text-muted-foreground font-normal mt-1">Étape {step} sur 4</span></DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1 space-y-6 py-4">
          {step === 1 && (<div className="space-y-4"><p className="text-sm text-muted-foreground">Un groupe contrôle plusieurs appareils ensemble.</p><div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/20"><div className="flex items-center gap-2"><Layers className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">Groupe mixte (binaires)</p><p className="text-xs text-muted-foreground">Combiner éclairages, interrupteurs, vannes...</p></div></div><Switch checked={isMixedMode} onCheckedChange={toggleMixedMode} /></div><div className="space-y-2"><Label>{isMixedMode ? "Types d'appareils (multi-sélection)" : "Type d'appareil"}</Label>{isMixedMode ? (<div className="space-y-2">{binaryDomains.map((opt) => (<div key={opt.value} className="flex items-center gap-3 p-3 rounded-md bg-background/30 border border-border/50 hover:bg-accent/30 transition-colors"><Checkbox id={`domain-${opt.value}`} checked={selectedDomains.includes(opt.value)} onCheckedChange={() => handleDomainSelect(opt.value)} /><label htmlFor={`domain-${opt.value}`} className="flex items-center gap-2 flex-1 cursor-pointer"><opt.icon className="h-4 w-4" />{opt.label}</label></div>))}</div>) : (<Select value={selectedDomains[0] || ""} onValueChange={(v) => setSelectedDomains([v])}><SelectTrigger><SelectValue placeholder="Sélectionnez un type" /></SelectTrigger><SelectContent>{availableDomains.map((opt) => (<SelectItem key={opt.value} value={opt.value}><div className="flex items-center gap-2"><opt.icon className="h-4 w-4" />{opt.label}</div></SelectItem>))}</SelectContent></Select>)}{mixedModeError && <p className="text-xs text-destructive">{mixedModeError}</p>}</div></div>)}
          {step === 2 && (<div className="space-y-4"><p className="text-sm text-muted-foreground">Donnez un nom clair, par exemple <strong>"Éclairage salon"</strong>.</p><div className="space-y-2"><Label htmlFor="groupName">Nom du groupe</Label><Input id="groupName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Éclairage salon" className="bg-background/50" />{name.trim().length > 0 && name.trim().length < 3 && <p className="text-xs text-destructive">Minimum 3 caractères</p>}</div></div>)}
          {step === 3 && (<div className="space-y-4"><p className="text-sm text-muted-foreground">Sélectionnez les appareils qui seront contrôlés ensemble.</p><ScrollArea className="h-[280px] rounded-md border border-border/50 p-4 bg-background/30">{availableEntities.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-8">Aucun appareil disponible.</p>) : (<div className="space-y-2">{availableEntities.map((device) => (<label key={device.entityId} className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"><Checkbox checked={selectedEntityIds.includes(device.entityId)} onCheckedChange={() => toggleEntity(device.entityId)} className="mt-0.5" /><div className="flex flex-col min-w-0"><span className="text-sm font-medium truncate">{device.friendlyName}</span><span className="text-xs text-muted-foreground">{device.floorName && device.areaName ? `${device.floorName} • ${device.areaName}` : device.areaName || device.floorName || "Emplacement inconnu"}</span></div></label>))}</div>)}</ScrollArea>{selectedEntityIds.length > 0 && <p className="text-xs text-muted-foreground">{selectedEntityIds.length} appareil{selectedEntityIds.length > 1 ? "s" : ""} sélectionné{selectedEntityIds.length > 1 ? "s" : ""}</p>}</div>)}
          {step === 4 && (<div className="space-y-4">{isMixedMode && selectedDomains.length > 1 ? (<div className="rounded-md bg-muted/50 border border-border/50 p-3"><p className="text-sm text-muted-foreground"><strong>Note :</strong> Les groupes mixtes sont toujours locaux (non partagés avec Home Assistant).</p></div>) : (<div className="space-y-2"><Label className="text-base">Mettre ce groupe à disposition des autres utilisateurs ?</Label><div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/20"><div className="flex items-center gap-3">{isShared ? <Users className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-muted-foreground" />}<div><p className="font-medium text-sm">{isShared ? "Groupe partagé" : "Groupe local"}</p><p className="text-xs text-muted-foreground">{isShared ? "Visible sur tous les appareils" : "Uniquement sur cet appareil"}</p></div></div><Switch checked={isShared} onCheckedChange={setIsShared} /></div></div>)}<div className="rounded-lg border border-border/50 bg-background/30 p-4 space-y-3"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Nom</p><p className="font-semibold">{name}</p></div><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p><div className="flex items-center gap-2 flex-wrap">{selectedDomainConfigs.length > 1 ? (<><Layers className="h-4 w-4" /><span className="font-medium">Groupe mixte</span><span className="text-sm text-muted-foreground">({selectedDomainConfigs.map((d) => d.label).join(", ")})</span></>) : (<>{FirstIcon && <FirstIcon className="h-4 w-4" />}<span className="font-medium">{selectedDomainConfigs[0]?.label}</span></>)}</div></div><div><p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Appareils ({selectedEntityIds.length})</p><ul className="space-y-1 text-sm max-h-[120px] overflow-y-auto">{selectedEntityIds.map((id) => { const device = availableEntities.find((d) => d.entityId === id); return <li key={id} className="text-muted-foreground">• {device?.friendlyName || id}</li>; })}</ul></div></div>{error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3"><p className="text-sm text-destructive">{error}</p></div>}</div>)}
        </div>
        <div className="flex-shrink-0 flex items-center justify-between gap-3 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={handlePrevious} disabled={step === 1 || isSaving} className="gap-2"><ChevronLeft className="h-4 w-4" />Précédent</Button>
          {step < 4 ? (<Button onClick={handleNext} disabled={!canGoNext()} className="gap-2">Suivant<ChevronRight className="h-4 w-4" /></Button>) : (<Button onClick={handleCreate} disabled={isSaving} className="gap-2">{isSaving ? (<><Loader2 className="h-4 w-4 animate-spin" />Création...</>) : (<><Check className="h-4 w-4" />Créer le groupe</>)}</Button>)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
