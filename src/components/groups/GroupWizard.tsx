import { useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronLeft, ChevronRight, ChevronDown, Package, Loader2, Users, User, Layers, CheckCircle } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import type { HaGroupDomain, GroupScope } from "@/types/groups";
import { toast } from "@/hooks/use-toast";
import { getAvailableDomains, areAllDomainsBinary, getEntitiesForDomains, getDomainConfig, type DeviceDisplayInfo } from "@/lib/groupDomains";
import type { HAArea, HAFloor } from "@/types/homeassistant";

interface GroupWizardProps {
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

export function GroupWizard({ open, onOpenChange }: GroupWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [isMixedMode, setIsMixedMode] = useState(false);
  const [name, setName] = useState("");
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [scope, setScope] = useState<GroupScope>("shared");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  const entities = useHAStore((state) => state.entities);
  const entityRegistry = useHAStore((state) => state.entityRegistry);
  const devices = useHAStore((state) => state.devices);
  const areas = useHAStore((state) => state.areas);
  const floors = useHAStore((state) => state.floors);
  const { createOrUpdateGroup } = useGroupStore();

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

  // Group entities by floor > area (same structure as Scenes/Routines)
  const groupedEntities = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    const filteredEntities = availableEntities.filter((e) => {
      if (!searchTerm.trim()) return true;
      return e.friendlyName.toLowerCase().includes(searchLower);
    });

    // Group by area
    const byArea: Record<string, DeviceDisplayInfo[]> = {};
    const noArea: DeviceDisplayInfo[] = [];

    for (const entity of filteredEntities) {
      if (entity.areaId) {
        if (!byArea[entity.areaId]) byArea[entity.areaId] = [];
        byArea[entity.areaId].push(entity);
      } else {
        noArea.push(entity);
      }
    }

    // Group areas by floor
    const byFloor: Record<string, { floor: HAFloor | null; areas: { area: HAArea; entities: DeviceDisplayInfo[] }[] }> = {};
    const noFloorAreas: { area: HAArea; entities: DeviceDisplayInfo[] }[] = [];

    for (const [areaId, areaEntities] of Object.entries(byArea)) {
      const area = areas.find((a) => a.area_id === areaId);
      if (!area) continue;

      const floor = floors.find((f) => f.floor_id === area.floor_id);
      const floorKey = floor?.floor_id || "__no_floor__";

      if (floor) {
        if (!byFloor[floorKey]) {
          byFloor[floorKey] = { floor, areas: [] };
        }
        byFloor[floorKey].areas.push({ area, entities: areaEntities });
      } else {
        noFloorAreas.push({ area, entities: areaEntities });
      }
    }

    return { byFloor, noFloorAreas, noArea };
  }, [availableEntities, areas, floors, searchTerm]);

  const handleClose = () => {
    setStep(1);
    setSelectedDomains([]);
    setIsMixedMode(false);
    setName("");
    setSelectedEntityIds([]);
    setScope("shared");
    setSearchTerm("");
    setExpandedAreas(new Set());
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

  const handleDomainSelect = (domain: string) => {
    if (isMixedMode) {
      setSelectedDomains((prev) => prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]);
    } else {
      setSelectedDomains([domain]);
    }
    setSelectedEntityIds([]);
  };

  const toggleMixedMode = (enabled: boolean) => {
    setIsMixedMode(enabled);
    if (enabled) {
      setScope("local");
    }
    if (!enabled && selectedDomains.length > 1) {
      setSelectedDomains([selectedDomains[0]]);
    }
    setSelectedEntityIds([]);
  };

  const toggleEntity = (entityId: string) => {
    setSelectedEntityIds((prev) =>
      prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId]
    );
  };

  const toggleArea = (areaEntities: DeviceDisplayInfo[]) => {
    const entityIds = areaEntities.map((e) => e.entityId);
    const allSelected = entityIds.every((id) => selectedEntityIds.includes(id));
    
    if (allSelected) {
      setSelectedEntityIds((prev) => prev.filter((id) => !entityIds.includes(id)));
    } else {
      setSelectedEntityIds((prev) => [...new Set([...prev, ...entityIds])]);
    }
  };

  const toggleAreaExpanded = (areaId: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId);
    } else {
      newExpanded.add(areaId);
    }
    setExpandedAreas(newExpanded);
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
    if (selectedDomains.length === 0) return;
    setIsSubmitting(true);

    const mode = isMixedMode && selectedDomains.length > 1 ? "mixedBinary" : "singleDomain";

    try {
      await createOrUpdateGroup({
        name,
        domain: selectedDomains[0] as HaGroupDomain,
        domains: selectedDomains,
        mode,
        entityIds: selectedEntityIds,
        scope,
      });

      toast({
        title: "Groupe créé",
        description: `Le groupe "${name}" a été créé avec succès.`,
      });

      handleClose();
    } catch (error) {
      console.error("[GroupWizard] Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le groupe. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDomainConfigs = availableDomains.filter((d) => selectedDomains.includes(d.value));
  const FirstIcon = selectedDomainConfigs[0]?.icon;

  // Render entity item (same style as Scenes/Routines)
  const renderEntityItem = (device: DeviceDisplayInfo) => {
    const isSelected = selectedEntityIds.includes(device.entityId);
    const domainConfig = getDomainConfig(device.entityId.split(".")[0]);
    const DomainIcon = domainConfig?.icon;

    return (
      <label
        key={device.entityId}
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${isSelected ? "bg-primary/10" : ""}`}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleEntity(device.entityId)}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {DomainIcon && <DomainIcon className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className="text-sm truncate">{device.friendlyName}</span>
          </div>
        </div>
      </label>
    );
  };

  // Render area section (same style as Scenes/Routines)
  const renderAreaSection = (area: HAArea, areaEntities: DeviceDisplayInfo[]) => {
    const isExpanded = expandedAreas.has(area.area_id);
    const selectedCount = areaEntities.filter((e) => selectedEntityIds.includes(e.entityId)).length;
    const allSelected = selectedCount === areaEntities.length && areaEntities.length > 0;

    return (
      <Collapsible key={area.area_id} open={isExpanded} onOpenChange={() => toggleAreaExpanded(area.area_id)}>
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => toggleArea(areaEntities)}
          />
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:text-primary transition-colors">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-medium text-sm">{area.name}</span>
            <span className="text-xs text-muted-foreground">
              ({selectedCount}/{areaEntities.length})
            </span>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pl-6 space-y-1">
          {areaEntities.map((entity) => renderEntityItem(entity))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // Group selected entities by floor > area > domain for summary
  const groupedSelectedEntities = useMemo(() => {
    const selected = availableEntities.filter((e) => selectedEntityIds.includes(e.entityId));
    
    const byArea: Record<string, DeviceDisplayInfo[]> = {};
    const noArea: DeviceDisplayInfo[] = [];

    for (const entity of selected) {
      if (entity.areaId) {
        if (!byArea[entity.areaId]) byArea[entity.areaId] = [];
        byArea[entity.areaId].push(entity);
      } else {
        noArea.push(entity);
      }
    }

    const byFloor: Record<string, { floor: HAFloor | null; areas: { area: HAArea; entities: DeviceDisplayInfo[] }[] }> = {};
    const noFloorAreas: { area: HAArea; entities: DeviceDisplayInfo[] }[] = [];

    for (const [areaId, areaEntities] of Object.entries(byArea)) {
      const area = areas.find((a) => a.area_id === areaId);
      if (!area) continue;

      const floor = floors.find((f) => f.floor_id === area.floor_id);
      const floorKey = floor?.floor_id || "__no_floor__";

      if (floor) {
        if (!byFloor[floorKey]) {
          byFloor[floorKey] = { floor, areas: [] };
        }
        byFloor[floorKey].areas.push({ area, entities: areaEntities });
      } else {
        noFloorAreas.push({ area, entities: areaEntities });
      }
    }

    return { byFloor, noFloorAreas, noArea };
  }, [availableEntities, selectedEntityIds, areas, floors]);

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
                
                {isMixedMode ? (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {binaryDomains.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer ${selectedDomains.includes(opt.value) ? "bg-primary/10 border-primary/50" : ""}`}
                      >
                        <Checkbox
                          checked={selectedDomains.includes(opt.value)}
                          onCheckedChange={() => handleDomainSelect(opt.value)}
                        />
                        <opt.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Select value={selectedDomains[0] || ""} onValueChange={(v) => setSelectedDomains([v])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDomains.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {mixedModeError && <p className="text-sm text-destructive">{mixedModeError}</p>}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Pourquoi choisir un type ?</span> Un groupe contrôle plusieurs appareils 
                ensemble. Sélectionnez le type d'appareils que vous souhaitez regrouper, ou activez le mode mixte 
                pour combiner différents types binaires.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="group-name">Nom du groupe</Label>
              <Input
                id="group-name"
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

            <div className="p-3 rounded-lg bg-muted/50">
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un appareil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Sélectionnés : <strong>{selectedEntityIds.length}</strong> appareil(s)
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
              {/* Par étage */}
              {Object.entries(groupedEntities.byFloor).map(([floorId, { floor, areas: floorAreas }]) => (
                <div key={floorId} className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {floor?.name || "Étage"}
                  </h4>
                  <div className="space-y-1 border-l-2 border-muted pl-3">
                    {floorAreas.map(({ area, entities: areaEntities }) => renderAreaSection(area, areaEntities))}
                  </div>
                </div>
              ))}

              {/* Pièces sans étage */}
              {groupedEntities.noFloorAreas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Autres pièces
                  </h4>
                  <div className="space-y-1 border-l-2 border-muted pl-3">
                    {groupedEntities.noFloorAreas.map(({ area, entities: areaEntities }) => 
                      renderAreaSection(area, areaEntities)
                    )}
                  </div>
                </div>
              )}

              {/* Entités sans pièce */}
              {groupedEntities.noArea.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Sans pièce assignée
                  </h4>
                  <div className="space-y-1 pl-3">
                    {groupedEntities.noArea.map((entity) => renderEntityItem(entity))}
                  </div>
                </div>
              )}

              {/* Message si aucun résultat */}
              {Object.keys(groupedEntities.byFloor).length === 0 && 
               groupedEntities.noFloorAreas.length === 0 && 
               groupedEntities.noArea.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun appareil trouvé
                </div>
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
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Vérifiez les paramètres de votre groupe avant de le sauvegarder.
              </p>
            </div>

            {/* Group info card */}
            <div className="p-4 rounded-lg border bg-card space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  {selectedDomainConfigs.length > 1 ? (
                    <Layers className="w-6 h-6 text-primary" />
                  ) : FirstIcon ? (
                    <FirstIcon className="w-6 h-6 text-primary" />
                  ) : (
                    <Package className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{name || "Sans nom"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDomainConfigs.length > 1 
                      ? "Groupe mixte" 
                      : selectedDomainConfigs[0]?.label || "Groupe"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                {isMixedGroup || scope === "local" ? (
                  <>
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Local uniquement</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>Partagé</span>
                  </>
                )}
              </div>
            </div>

            {/* Scope selection (hidden for mixed groups) */}
            {!isMixedGroup && (
              <div className="space-y-3">
                <Label>Portée du groupe</Label>
                <RadioGroup
                  value={scope}
                  onValueChange={(value: GroupScope) => setScope(value)}
                  className="grid grid-cols-1 gap-3"
                >
                  <label
                    htmlFor="group-scope-local"
                    className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value="local" id="group-scope-local" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <User className="w-5 h-5" />
                        Local uniquement
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Visible seulement dans cette application.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="group-scope-shared"
                    className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value="shared" id="group-scope-shared" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <Users className="w-5 h-5" />
                        Partagé
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Créé dans Home Assistant, accessible à tous.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            )}

            {/* Summary of selected entities */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {selectedEntityIds.length} appareil{selectedEntityIds.length > 1 ? "s" : ""} sélectionné{selectedEntityIds.length > 1 ? "s" : ""}
              </h4>

              <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
                {/* By floor */}
                {Object.entries(groupedSelectedEntities.byFloor).map(([floorId, { floor, areas: floorAreas }]) => (
                  <div key={floorId} className="space-y-2">
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {floor?.name || "Étage"}
                    </h5>
                    {floorAreas.map(({ area, entities: areaEntities }) => (
                      <div key={area.area_id} className="space-y-1">
                        <h6 className="text-xs font-medium text-muted-foreground ml-2">
                          {area.name}
                        </h6>
                        <div className="space-y-0.5 ml-2">
                          {areaEntities.map((entity) => {
                            const domainConfig = getDomainConfig(entity.entityId.split(".")[0]);
                            const DomainIcon = domainConfig?.icon;
                            return (
                              <div
                                key={entity.entityId}
                                className="flex items-center py-1 px-2 rounded bg-muted/30 text-sm"
                              >
                                {DomainIcon && <DomainIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-2" />}
                                <span className="truncate">{entity.friendlyName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Areas without floor */}
                {groupedSelectedEntities.noFloorAreas.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Autres pièces
                    </h5>
                    {groupedSelectedEntities.noFloorAreas.map(({ area, entities: areaEntities }) => (
                      <div key={area.area_id} className="space-y-1">
                        <h6 className="text-xs font-medium text-muted-foreground ml-2">
                          {area.name}
                        </h6>
                        <div className="space-y-0.5 ml-2">
                          {areaEntities.map((entity) => {
                            const domainConfig = getDomainConfig(entity.entityId.split(".")[0]);
                            const DomainIcon = domainConfig?.icon;
                            return (
                              <div
                                key={entity.entityId}
                                className="flex items-center py-1 px-2 rounded bg-muted/30 text-sm"
                              >
                                {DomainIcon && <DomainIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-2" />}
                                <span className="truncate">{entity.friendlyName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Entities without area */}
                {groupedSelectedEntities.noArea.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Sans pièce
                    </h5>
                    <div className="space-y-0.5">
                      {groupedSelectedEntities.noArea.map((entity) => {
                        const domainConfig = getDomainConfig(entity.entityId.split(".")[0]);
                        const DomainIcon = domainConfig?.icon;
                        return (
                          <div
                            key={entity.entityId}
                            className="flex items-center py-1 px-2 rounded bg-muted/30 text-sm"
                          >
                            {DomainIcon && <DomainIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-2" />}
                            <span className="truncate">{entity.friendlyName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Tout pourra être modifié plus tard depuis les paramètres du groupe.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Créer un groupe
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
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Annuler
            </Button>

            {step < TOTAL_STEPS ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()} className="relative">
                <span className={isSubmitting ? "opacity-0" : ""}>Enregistrer</span>
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin absolute inset-0 m-auto" />
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
