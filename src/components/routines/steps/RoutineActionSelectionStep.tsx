import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RoutineWizardDraft, RoutineAction } from "@/types/routines";
import { useHAStore } from "@/store/useHAStore";
import { useSceneStore } from "@/store/useSceneStore";
import { useGroupStore } from "@/store/useGroupStore";
import { isControllableEntity } from "@/lib/entityUtils";
import { getDomainConfig } from "@/lib/groupDomains";
import { Search, ChevronDown, ChevronRight, LayoutGrid, Sparkles, Package, HelpCircle } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface RoutineActionSelectionStepProps {
  draft: RoutineWizardDraft;
  onUpdate: (updates: Partial<RoutineWizardDraft>) => void;
}

export function RoutineActionSelectionStep({ draft, onUpdate }: RoutineActionSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"devices" | "scenes" | "groups">("devices");

  // HA data
  const entities = useHAStore((s) => s.entities);
  const areas = useHAStore((s) => s.areas);
  const floors = useHAStore((s) => s.floors);
  const entityRegistry = useHAStore((s) => s.entityRegistry);
  const devices = useHAStore((s) => s.devices);

  // Scenes & Groups - Only shared ones (routines are HA automations, they need shared resources)
  const sharedScenes = useSceneStore((s) => s.sharedScenes);
  const groups = useGroupStore((s) => s.groups);

  // Only shared scenes and groups can be used in routines
  const eligibleScenes = useMemo(() => sharedScenes.filter(s => s.scope === "shared"), [sharedScenes]);
  const eligibleGroups = useMemo(() => groups.filter(g => g.scope === "shared"), [groups]);

  // Filter controllable entities (avec registry pour exclure les entités cachées)
  const eligibleEntities = useMemo(() => {
    return entities.filter((e) => {
      const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
      return isControllableEntity(e, reg);
    });
  }, [entities, entityRegistry]);

  // Helper pour obtenir l'area_id d'une entité
  const getEntityAreaId = (entityId: string): string | undefined => {
    const reg = entityRegistry.find(r => r.entity_id === entityId);
    if (reg?.area_id) return reg.area_id;
    if (reg?.device_id) {
      const device = devices.find(d => d.id === reg.device_id);
      if (device?.area_id) return device.area_id;
    }
    return undefined;
  };

  // Grouper les entités par étage > pièce (même structure que SceneDeviceSelectionStep)
  const groupedEntities = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    const filteredEntities = eligibleEntities.filter((e) => {
      if (!searchTerm.trim()) return true;
      const name = e.attributes.friendly_name || e.entity_id;
      return name.toLowerCase().includes(searchLower);
    });

    // Grouper par area
    const byArea: Record<string, HAEntity[]> = {};
    const noArea: HAEntity[] = [];

    for (const entity of filteredEntities) {
      const areaId = getEntityAreaId(entity.entity_id);
      
      if (areaId) {
        if (!byArea[areaId]) byArea[areaId] = [];
        byArea[areaId].push(entity);
      } else {
        noArea.push(entity);
      }
    }

    // Grouper les areas par floor
    const byFloor: Record<string, { floor: HAFloor | null; areas: { area: HAArea; entities: HAEntity[] }[] }> = {};
    const noFloorAreas: { area: HAArea; entities: HAEntity[] }[] = [];

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
  }, [eligibleEntities, areas, floors, devices, searchTerm, entityRegistry]);

  // Check if item is selected
  const isItemSelected = (type: RoutineAction["type"], id: string): boolean => {
    return draft.selectedItems.some((item) => item.type === type && item.id === id);
  };

  // Toggle item selection
  const toggleItem = (type: RoutineAction["type"], id: string) => {
    const exists = isItemSelected(type, id);
    let newItems: RoutineAction[];

    if (exists) {
      newItems = draft.selectedItems.filter((item) => !(item.type === type && item.id === id));
    } else {
      const newAction: RoutineAction = { type, id };
      if (type === "group") {
        newAction.groupState = "on";
      }
      newItems = [...draft.selectedItems, newAction];
    }

    onUpdate({ selectedItems: newItems });
  };

  // Toggle all entities in an area
  const toggleArea = (areaEntities: HAEntity[]) => {
    const entityIds = areaEntities.map((e) => e.entity_id);
    const allSelected = entityIds.every((id) => isItemSelected("device", id));
    
    if (allSelected) {
      // Deselect all
      const newItems = draft.selectedItems.filter(
        (item) => !(item.type === "device" && entityIds.includes(item.id))
      );
      onUpdate({ selectedItems: newItems });
    } else {
      // Select all missing
      const existingDeviceIds = draft.selectedItems
        .filter((item) => item.type === "device")
        .map((item) => item.id);
      const newDevices = entityIds
        .filter((id) => !existingDeviceIds.includes(id))
        .map((id): RoutineAction => ({ type: "device", id }));
      onUpdate({ selectedItems: [...draft.selectedItems, ...newDevices] });
    }
  };

  // Toggle area expansion
  const toggleAreaExpanded = (areaId: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId);
    } else {
      newExpanded.add(areaId);
    }
    setExpandedAreas(newExpanded);
  };

  const selectedCount = draft.selectedItems.length;
  const deviceCount = draft.selectedItems.filter((i) => i.type === "device").length;
  const sceneCount = draft.selectedItems.filter((i) => i.type === "scene").length;
  const groupCount = draft.selectedItems.filter((i) => i.type === "group").length;

  // Render entity item (same style as SceneDeviceItem)
  const renderEntityItem = (entity: HAEntity, hideLocation = false) => {
    const isSelected = isItemSelected("device", entity.entity_id);
    const domain = entity.entity_id.split(".")[0];
    const domainConfig = getDomainConfig(domain);
    const DomainIcon = domainConfig?.icon || HelpCircle;
    const friendlyName = entity.attributes.friendly_name || entity.entity_id;

    return (
      <label
        key={entity.entity_id}
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${isSelected ? "bg-primary/10" : ""}`}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleItem("device", entity.entity_id)}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <DomainIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">{friendlyName}</span>
          </div>
        </div>
      </label>
    );
  };

  // Render area section (same style as SceneDeviceSelectionStep)
  const renderAreaSection = (area: HAArea, areaEntities: HAEntity[]) => {
    const isExpanded = expandedAreas.has(area.area_id);
    const selectedCount = areaEntities.filter((e) => isItemSelected("device", e.entity_id)).length;
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
          {areaEntities.map((entity) => renderEntityItem(entity, true))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Sélectionnés : <strong>{selectedCount}</strong> élément{selectedCount > 1 ? "s" : ""}
        {selectedCount > 0 && (
          <span className="ml-1">
            ({deviceCount > 0 && `${deviceCount} appareil${deviceCount > 1 ? "s" : ""}`}
            {deviceCount > 0 && sceneCount > 0 && ", "}
            {sceneCount > 0 && `${sceneCount} scène${sceneCount > 1 ? "s" : ""}`}
            {(deviceCount > 0 || sceneCount > 0) && groupCount > 0 && ", "}
            {groupCount > 0 && `${groupCount} groupe${groupCount > 1 ? "s" : ""}`})
          </span>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="devices" className="flex-1 gap-1">
            <LayoutGrid className="h-4 w-4" />
            Appareils
          </TabsTrigger>
          <TabsTrigger value="scenes" className="flex-1 gap-1">
            <Sparkles className="h-4 w-4" />
            Scènes
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex-1 gap-1">
            <Package className="h-4 w-4" />
            Groupes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="mt-4 max-h-[400px] overflow-y-auto space-y-4 pr-2">
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
                {groupedEntities.noArea.map((entity) => renderEntityItem(entity, false))}
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
        </TabsContent>

        <TabsContent value="scenes" className="mt-4 max-h-[400px] overflow-y-auto space-y-1 pr-2">
          {eligibleScenes.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Aucune scène partagée disponible
              </p>
              <p className="text-xs text-muted-foreground/70">
                Seules les scènes partagées (Home Assistant) peuvent être utilisées dans les routines.
              </p>
            </div>
          ) : (
            eligibleScenes
              .filter((scene) => scene.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((scene) => {
                const IconComponent = (LucideIcons as any)[scene.icon] || LucideIcons.Sparkles;
                const isSelected = isItemSelected("scene", scene.id);
                return (
                  <label
                    key={scene.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${isSelected ? "bg-primary/10" : ""}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItem("scene", scene.id)}
                    />
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{scene.name}</span>
                    </div>
                  </label>
                );
              })
          )}
        </TabsContent>

        <TabsContent value="groups" className="mt-4 max-h-[400px] overflow-y-auto space-y-1 pr-2">
          {eligibleGroups.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Aucun groupe partagé disponible
              </p>
              <p className="text-xs text-muted-foreground/70">
                Seuls les groupes partagés (Home Assistant) peuvent être utilisés dans les routines.
              </p>
            </div>
          ) : (
            eligibleGroups
              .filter((group) => group.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((group) => {
                const isSelected = isItemSelected("group", group.id);
                return (
                  <label
                    key={group.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${isSelected ? "bg-primary/10" : ""}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItem("group", group.id)}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{group.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-6">
                        {group.entityIds.length} appareil{group.entityIds.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </label>
                );
              })
          )}
        </TabsContent>
      </Tabs>

      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Conseil :</span> Vous pouvez combiner appareils, scènes et groupes 
          dans une même routine. Les scènes s'activeront telles quelles, tandis que les appareils et groupes 
          pourront être configurés à l'étape suivante.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          <span className="font-semibold">Note :</span> Seuls les scènes et groupes partagés sont disponibles, 
          car les routines s'exécutent automatiquement via Home Assistant même lorsque l'application est fermée.
        </p>
      </div>
    </div>
  );
}
