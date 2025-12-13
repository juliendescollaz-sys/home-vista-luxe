import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RoutineWizardDraft, RoutineAction } from "@/types/routines";
import { useHAStore } from "@/store/useHAStore";
import { useSceneStore } from "@/store/useSceneStore";
import { useGroupStore } from "@/store/useGroupStore";
import { isControllableEntity } from "@/lib/entityUtils";
import { Search, ChevronDown, ChevronRight, Lightbulb, Sparkles, Package } from "lucide-react";
import * as LucideIcons from "lucide-react";

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

  // Scenes & Groups
  const localScenes = useSceneStore((s) => s.localScenes);
  const sharedScenes = useSceneStore((s) => s.sharedScenes);
  const groups = useGroupStore((s) => s.groups);

  const allScenes = useMemo(() => [...localScenes, ...sharedScenes], [localScenes, sharedScenes]);

  // Filter controllable entities
  const eligibleEntities = useMemo(() => {
    return entities.filter((e) => isControllableEntity(e));
  }, [entities]);

  // Group entities by area
  const groupedEntities = useMemo(() => {
    const grouped: Record<string, typeof eligibleEntities> = {};
    const noArea: typeof eligibleEntities = [];

    for (const entity of eligibleEntities) {
      const regEntry = entityRegistry.find((r) => r.entity_id === entity.entity_id);
      let areaId = regEntry?.area_id;
      
      if (!areaId && regEntry?.device_id) {
        const device = devices.find((d: any) => d.id === regEntry.device_id);
        areaId = device?.area_id;
      }

      if (areaId) {
        if (!grouped[areaId]) grouped[areaId] = [];
        grouped[areaId].push(entity);
      } else {
        noArea.push(entity);
      }
    }

    return { grouped, noArea };
  }, [eligibleEntities, entityRegistry, deviceRegistry]);

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

  // Filter by search
  const filterBySearch = (name: string): boolean => {
    if (!searchTerm.trim()) return true;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const selectedCount = draft.selectedItems.length;
  const deviceCount = draft.selectedItems.filter((i) => i.type === "device").length;
  const sceneCount = draft.selectedItems.filter((i) => i.type === "scene").length;
  const groupCount = draft.selectedItems.filter((i) => i.type === "group").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        {selectedCount} élément{selectedCount > 1 ? "s" : ""} sélectionné{selectedCount > 1 ? "s" : ""}
        {selectedCount > 0 && (
          <span className="ml-2">
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
            <Lightbulb className="h-4 w-4" />
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

        <TabsContent value="devices" className="mt-4 max-h-[40vh] overflow-y-auto space-y-2">
          {/* Grouped by area */}
          {Object.entries(groupedEntities.grouped).map(([areaId, areaEntities]) => {
            const area = areas.find((a) => a.area_id === areaId);
            const floor = floors.find((f) => f.floor_id === area?.floor_id);
            const areaName = area?.name || areaId;
            const floorName = floor?.name;
            const isExpanded = expandedAreas.has(areaId);

            const filteredEntities = areaEntities.filter((e) =>
              filterBySearch(e.attributes.friendly_name || e.entity_id)
            );

            if (filteredEntities.length === 0) return null;

            return (
              <Collapsible key={areaId} open={isExpanded} onOpenChange={() => toggleAreaExpanded(areaId)}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-medium">{areaName}</span>
                  {floorName && <span className="text-xs text-muted-foreground">• {floorName}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">({filteredEntities.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 space-y-1 mt-1">
                  {filteredEntities.map((entity) => (
                    <label
                      key={entity.entity_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isItemSelected("device", entity.entity_id)}
                        onCheckedChange={() => toggleItem("device", entity.entity_id)}
                      />
                      <span className="text-sm">
                        {entity.attributes.friendly_name || entity.entity_id}
                      </span>
                    </label>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* No area */}
          {groupedEntities.noArea.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50">
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-muted-foreground">Sans pièce assignée</span>
                <span className="text-xs text-muted-foreground ml-auto">({groupedEntities.noArea.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-1 mt-1">
                {groupedEntities.noArea
                  .filter((e) => filterBySearch(e.attributes.friendly_name || e.entity_id))
                  .map((entity) => (
                    <label
                      key={entity.entity_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isItemSelected("device", entity.entity_id)}
                        onCheckedChange={() => toggleItem("device", entity.entity_id)}
                      />
                      <span className="text-sm">
                        {entity.attributes.friendly_name || entity.entity_id}
                      </span>
                    </label>
                  ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </TabsContent>

        <TabsContent value="scenes" className="mt-4 max-h-[40vh] overflow-y-auto space-y-1">
          {allScenes
            .filter((scene) => filterBySearch(scene.name))
            .map((scene) => {
              const IconComponent = (LucideIcons as any)[scene.icon] || LucideIcons.Sparkles;
              return (
                <label
                  key={scene.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={isItemSelected("scene", scene.id)}
                    onCheckedChange={() => toggleItem("scene", scene.id)}
                  />
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{scene.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {scene.scope === "shared" ? "Partagée" : "Locale"}
                    </p>
                  </div>
                </label>
              );
            })}
          {allScenes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune scène disponible
            </p>
          )}
        </TabsContent>

        <TabsContent value="groups" className="mt-4 max-h-[40vh] overflow-y-auto space-y-1">
          {groups
            .filter((group) => filterBySearch(group.name))
            .map((group) => {
              const IconComponent = LucideIcons.Package;
              return (
                <label
                  key={group.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={isItemSelected("group", group.id)}
                    onCheckedChange={() => toggleItem("group", group.id)}
                  />
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{group.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {group.entityIds.length} appareil{group.entityIds.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </label>
              );
            })}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun groupe disponible
            </p>
          )}
        </TabsContent>
      </Tabs>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Conseil :</span> Vous pouvez combiner appareils, scènes et groupes 
          dans une même routine. Les scènes s'activeront telles quelles, tandis que les appareils et groupes 
          pourront être configurés à l'étape suivante.
        </p>
      </div>
    </div>
  );
}
