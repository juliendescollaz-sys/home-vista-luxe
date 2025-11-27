import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useHAStore } from "@/store/useHAStore";
import { SceneWizardDraft } from "@/types/scenes";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SceneDeviceSelectionStepProps {
  draft: SceneWizardDraft;
  onUpdate: (updates: Partial<SceneWizardDraft>) => void;
}

export function SceneDeviceSelectionStep({ draft, onUpdate }: SceneDeviceSelectionStepProps) {
  const entities = useHAStore((s) => s.entities);
  const areas = useHAStore((s) => s.areas);
  const floors = useHAStore((s) => s.floors);
  const devices = useHAStore((s) => s.devices);

  const [search, setSearch] = useState("");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  // Filter controllable entities
  const controllableEntities = useMemo(() => {
    const controllableDomains = [
      "light", "switch", "cover", "fan", "valve", "climate", 
      "media_player", "scene", "script", "input_boolean", "lock"
    ];
    
    return entities.filter((e) => {
      const domain = e.entity_id.split(".")[0];
      return controllableDomains.includes(domain);
    });
  }, [entities]);

  const entityRegistry = useHAStore((s) => s.entityRegistry);

  // Group entities by floor > area
  const groupedEntities = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    const filteredEntities = controllableEntities.filter((e) => {
      if (!search.trim()) return true;
      const name = e.attributes.friendly_name || e.entity_id;
      return name.toLowerCase().includes(searchLower);
    });

    // Group by area
    const byArea: Record<string, typeof filteredEntities> = {};
    const noArea: typeof filteredEntities = [];

    for (const entity of filteredEntities) {
      const registry = entityRegistry[entity.entity_id];
      const device = devices.find((d) => d.id === registry?.device_id);
      const areaId = registry?.area_id || device?.area_id;
      
      if (areaId) {
        if (!byArea[areaId]) byArea[areaId] = [];
        byArea[areaId].push(entity);
      } else {
        noArea.push(entity);
      }
    }

    // Group areas by floor
    const byFloor: Record<string, { floor: typeof floors[0] | null; areas: { area: typeof areas[0]; entities: typeof filteredEntities }[] }> = {};
    const noFloorAreas: { area: typeof areas[0]; entities: typeof filteredEntities }[] = [];

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
  }, [controllableEntities, areas, floors, devices, search, entityRegistry]);

  const toggleEntity = (entityId: string) => {
    const newSelected = draft.selectedEntityIds.includes(entityId)
      ? draft.selectedEntityIds.filter((id) => id !== entityId)
      : [...draft.selectedEntityIds, entityId];
    onUpdate({ selectedEntityIds: newSelected });
  };

  const toggleArea = (areaEntities: typeof controllableEntities) => {
    const entityIds = areaEntities.map((e) => e.entity_id);
    const allSelected = entityIds.every((id) => draft.selectedEntityIds.includes(id));
    
    if (allSelected) {
      onUpdate({
        selectedEntityIds: draft.selectedEntityIds.filter((id) => !entityIds.includes(id)),
      });
    } else {
      const newSelected = new Set([...draft.selectedEntityIds, ...entityIds]);
      onUpdate({ selectedEntityIds: Array.from(newSelected) });
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

  const getDomainIcon = (domain: string) => {
    const icons: Record<string, string> = {
      light: "💡",
      switch: "🔌",
      cover: "🪟",
      fan: "🌀",
      climate: "🌡️",
      media_player: "🔊",
      lock: "🔒",
      valve: "🚰",
      scene: "🎬",
      script: "📜",
      input_boolean: "⚡",
    };
    return icons[domain] || "⚙️";
  };

  const renderEntityItem = (entity: typeof controllableEntities[0]) => {
    const domain = entity.entity_id.split(".")[0];
    const isSelected = draft.selectedEntityIds.includes(entity.entity_id);

    return (
      <label
        key={entity.entity_id}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
          "hover:bg-accent/50",
          isSelected && "bg-primary/10"
        )}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleEntity(entity.entity_id)}
        />
        <span className="text-lg">{getDomainIcon(domain)}</span>
        <span className="flex-1 text-sm truncate">
          {entity.attributes.friendly_name || entity.entity_id}
        </span>
      </label>
    );
  };

  const renderAreaSection = (area: typeof areas[0], areaEntities: typeof controllableEntities) => {
    const isExpanded = expandedAreas.has(area.area_id);
    const selectedCount = areaEntities.filter((e) => draft.selectedEntityIds.includes(e.entity_id)).length;
    const allSelected = selectedCount === areaEntities.length;

    return (
      <Collapsible key={area.area_id} open={isExpanded} onOpenChange={() => toggleAreaExpanded(area.area_id)}>
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => toggleArea(areaEntities)}
          />
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:text-primary transition-colors">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-medium">{area.name}</span>
            <span className="text-xs text-muted-foreground">
              ({selectedCount}/{areaEntities.length})
            </span>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pl-6 space-y-1">
          {areaEntities.map(renderEntityItem)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un appareil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Sélectionnés : <strong>{draft.selectedEntityIds.length}</strong> appareil(s)
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
        {/* By Floor */}
        {Object.entries(groupedEntities.byFloor).map(([floorId, { floor, areas: floorAreas }]) => (
          <div key={floorId} className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {floor?.name || "Étage"}
            </h4>
            <div className="space-y-1 border-l-2 border-muted pl-3">
              {floorAreas.map(({ area, entities: areaEntities }) => renderAreaSection(area, areaEntities))}
            </div>
          </div>
        ))}

        {/* Areas without floor */}
        {groupedEntities.noFloorAreas.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Autres pièces
            </h4>
            <div className="space-y-1 border-l-2 border-muted pl-3">
              {groupedEntities.noFloorAreas.map(({ area, entities: areaEntities }) => 
                renderAreaSection(area, areaEntities)
              )}
            </div>
          </div>
        )}

        {/* Entities without area */}
        {groupedEntities.noArea.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sans pièce assignée
            </h4>
            <div className="space-y-1 pl-3">
              {groupedEntities.noArea.map(renderEntityItem)}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <p>
          <strong>Conseil :</strong> Choisissez tous les appareils dont l'état sera défini par cette scène. 
          Vous pourrez régler l'état précis de chaque appareil à l'étape suivante 
          (intensité, couleur, position, volume…).
        </p>
      </div>
    </div>
  );
}
