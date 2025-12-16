import { useState, useMemo } from "react";
import { SmartWizardDraft, SmartAction } from "@/types/smart";
import { useHAStore } from "@/store/useHAStore";
import { useSceneStore } from "@/store/useSceneStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Info, Play, Clock, Sparkles, Power, Search, ChevronDown, ChevronRight, Lightbulb, Thermometer, Music, Lock, Fan, Blinds, Droplet, Settings } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { isControllableEntity } from "@/lib/entityUtils";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface SmartActionStepProps {
  draft: SmartWizardDraft;
  onUpdate: (updates: Partial<SmartWizardDraft>) => void;
}

type ActionTypeOption = "device" | "scene" | "delay";

const ACTION_TYPES: Array<{ type: ActionTypeOption; label: string; description: string; icon: string }> = [
  { type: "device", label: "Contrôler un appareil", description: "Allumer, éteindre, ajuster...", icon: "Power" },
  { type: "scene", label: "Activer une scène", description: "Lancer une ambiance préconfigurée", icon: "Sparkles" },
  { type: "delay", label: "Attendre", description: "Pause avant l'action suivante", icon: "Clock" },
];

const getDomainIcon = (domain: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    light: Lightbulb,
    switch: Power,
    climate: Thermometer,
    media_player: Music,
    lock: Lock,
    fan: Fan,
    cover: Blinds,
    valve: Droplet,
  };
  return iconMap[domain] || Settings;
};

export function SmartActionStep({ draft, onUpdate }: SmartActionStepProps) {
  const [addingType, setAddingType] = useState<ActionTypeOption | null>(null);

  const entities = useHAStore((s) => s.entities);
  const areas = useHAStore((s) => s.areas);
  const floors = useHAStore((s) => s.floors);
  const devices = useHAStore((s) => s.devices);
  const entityRegistry = useHAStore((s) => s.entityRegistry);
  const sharedScenes = useSceneStore((s) => s.sharedScenes);
  const localScenes = useSceneStore((s) => s.localScenes);

  const controllableEntities = useMemo(() => {
    return entities.filter((e) => isControllableEntity(e));
  }, [entities]);

  const allScenes = useMemo(() => [...localScenes, ...sharedScenes], [localScenes, sharedScenes]);

  const addAction = (action: SmartAction) => {
    onUpdate({ actions: [...draft.actions, action] });
    setAddingType(null);
  };

  const removeAction = (index: number) => {
    onUpdate({ actions: draft.actions.filter((_, i) => i !== index) });
  };

  const moveAction = (index: number, direction: "up" | "down") => {
    const newActions = [...draft.actions];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newActions.length) return;
    [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
    onUpdate({ actions: newActions });
  };

  const renderActionForm = () => {
    switch (addingType) {
      case "device":
        return (
          <DeviceActionForm
            entities={controllableEntities}
            areas={areas}
            floors={floors}
            devices={devices}
            entityRegistry={entityRegistry}
            onAdd={addAction}
            onCancel={() => setAddingType(null)}
          />
        );
      case "scene":
        return (
          <SceneActionForm
            scenes={allScenes}
            onAdd={addAction}
            onCancel={() => setAddingType(null)}
          />
        );
      case "delay":
        return (
          <DelayActionForm
            onAdd={addAction}
            onCancel={() => setAddingType(null)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-1">
      {/* Info box */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Qu'est-ce qu'une action ?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les actions sont exécutées dans l'ordre quand l'automatisation se déclenche 
              et que toutes les conditions sont remplies. Vous pouvez ajouter des délais 
              entre les actions si nécessaire.
            </p>
          </div>
        </div>
      </div>

      {/* Existing actions */}
      {draft.actions.length > 0 && (
        <div className="space-y-2">
          <Label>Actions configurées ({draft.actions.length})</Label>
          {draft.actions.map((action, index) => (
            <ActionCard
              key={index}
              action={action}
              index={index}
              total={draft.actions.length}
              entities={entities}
              scenes={allScenes}
              onRemove={() => removeAction(index)}
              onMoveUp={() => moveAction(index, "up")}
              onMoveDown={() => moveAction(index, "down")}
            />
          ))}
        </div>
      )}

      {/* Add action */}
      {addingType ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            {(() => {
              const config = ACTION_TYPES.find((t) => t.type === addingType);
              const IconComp = config ? (LucideIcons as any)[config.icon] || Play : Play;
              return <IconComp className="w-5 h-5 text-primary" />;
            })()}
            <span className="font-medium">
              {ACTION_TYPES.find((t) => t.type === addingType)?.label}
            </span>
          </div>
          {renderActionForm()}
        </Card>
      ) : (
        <div className="space-y-3">
          <Label>Ajouter une action</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ACTION_TYPES.map((config) => {
              const IconComp = (LucideIcons as any)[config.icon] || Play;
              return (
                <button
                  key={config.type}
                  type="button"
                  onClick={() => setAddingType(config.type)}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-background hover:bg-muted transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <IconComp className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {draft.actions.length === 0 && (
        <p className="text-sm text-center text-muted-foreground">
          Ajoutez au moins une action pour que l'automatisation fasse quelque chose.
        </p>
      )}
    </div>
  );
}

// ============ Action Card ============

interface ActionCardProps {
  action: SmartAction;
  index: number;
  total: number;
  entities: HAEntity[];
  scenes: any[];
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ActionCard({ action, index, total, entities, scenes, onRemove, onMoveUp, onMoveDown }: ActionCardProps) {
  const getIcon = () => {
    switch (action.type) {
      case "device":
        return Power;
      case "scene":
        return Sparkles;
      case "delay":
        return Clock;
      default:
        return Play;
    }
  };

  const getDescription = () => {
    switch (action.type) {
      case "device": {
        const entity = entities.find((e) => e.entity_id === action.entityId);
        const name = entity?.attributes?.friendly_name || action.entityId;
        const state = action.data?.state || "on";
        return `${name} → ${state === "on" ? "Allumer" : "Éteindre"}`;
      }
      case "scene": {
        const scene = scenes.find((s) => s.id === action.entityId || s.id === `scene.${action.entityId}`);
        return `Activer "${scene?.name || action.entityId}"`;
      }
      case "delay":
        return `Attendre ${action.delaySeconds || 0} secondes`;
      case "service":
        // Find entity name for service actions
        const serviceEntity = entities.find((e) => e.entity_id === action.entityId);
        const serviceName = serviceEntity?.attributes?.friendly_name || action.entityId || "";
        const isOn = action.service?.includes("turn_on") || action.service?.includes("open");
        return `${serviceName} → ${isOn ? "Allumer" : "Éteindre"}`;
      default:
        return "Action";
    }
  };

  const IconComp = getIcon();

  return (
    <Card className="p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          {index > 0 && (
            <button onClick={onMoveUp} className="text-muted-foreground hover:text-foreground text-xs">
              ▲
            </button>
          )}
          {index < total - 1 && (
            <button onClick={onMoveDown} className="text-muted-foreground hover:text-foreground text-xs">
              ▼
            </button>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <IconComp className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Action {index + 1}</p>
          <p className="text-xs text-muted-foreground">{getDescription()}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </Card>
  );
}

// ============ Device Action Form with hierarchical selection ============

interface DeviceActionFormProps {
  entities: HAEntity[];
  areas: HAArea[];
  floors: HAFloor[];
  devices: any[];
  entityRegistry: any[];
  onAdd: (action: SmartAction) => void;
  onCancel: () => void;
}

function DeviceActionForm({ entities, areas, floors, devices, entityRegistry, onAdd, onCancel }: DeviceActionFormProps) {
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [state, setState] = useState<"on" | "off">("on");
  const [brightness, setBrightness] = useState(100);
  const [search, setSearch] = useState("");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  const hasLights = selectedEntityIds.some((id) => id.startsWith("light."));
  const hasCovers = selectedEntityIds.some((id) => id.startsWith("cover."));

  // Get entity area_id
  const getEntityAreaId = (entityId: string): string | undefined => {
    const reg = entityRegistry.find((r: any) => r.entity_id === entityId);
    if (reg?.area_id) return reg.area_id;
    if (reg?.device_id) {
      const device = devices.find((d: any) => d.id === reg.device_id);
      if (device?.area_id) return device.area_id;
    }
    return undefined;
  };

  // Group entities by floor > area
  const groupedEntities = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    const filteredEntities = entities.filter((e) => {
      if (!search.trim()) return true;
      const name = e.attributes.friendly_name || e.entity_id;
      return name.toLowerCase().includes(searchLower);
    });

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
  }, [entities, areas, floors, devices, search, entityRegistry]);

  const toggleEntity = (entityId: string) => {
    setSelectedEntityIds((prev) =>
      prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId]
    );
  };

  const toggleArea = (areaEntities: HAEntity[]) => {
    const entityIds = areaEntities.map((e) => e.entity_id);
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

  const handleSubmit = () => {
    for (const entityId of selectedEntityIds) {
      const isLight = entityId.startsWith("light.");
      const isCover = entityId.startsWith("cover.");
      
      const service = state === "on"
        ? (isCover ? "cover.open_cover" : isLight ? "light.turn_on" : "homeassistant.turn_on")
        : (isCover ? "cover.close_cover" : isLight ? "light.turn_off" : "homeassistant.turn_off");
      
      onAdd({
        type: "service",
        service,
        entityId,
        data: isLight && state === "on" ? { brightness_pct: brightness } : undefined,
      });
    }
  };

  const renderEntityItem = (entity: HAEntity, hideLocation = false) => {
    const isSelected = selectedEntityIds.includes(entity.entity_id);
    const friendlyName = entity.attributes.friendly_name || entity.entity_id;
    const domain = entity.entity_id.split(".")[0];
    const Icon = getDomainIcon(domain);

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
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate">{friendlyName}</span>
        </div>
      </label>
    );
  };

  const renderAreaSection = (area: HAArea, areaEntities: HAEntity[]) => {
    const isExpanded = expandedAreas.has(area.area_id);
    const selectedCount = areaEntities.filter((e) => selectedEntityIds.includes(e.entity_id)).length;
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
      {/* Search */}
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
        Sélectionnés : <strong>{selectedEntityIds.length}</strong> appareil(s)
      </div>

      {/* Hierarchical device list */}
      <div className="max-h-[250px] overflow-y-auto space-y-4 pr-2">
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

        {Object.keys(groupedEntities.byFloor).length === 0 && 
         groupedEntities.noFloorAreas.length === 0 && 
         groupedEntities.noArea.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun appareil trouvé
          </div>
        )}
      </div>

      {/* Action configuration */}
      {selectedEntityIds.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={state} onValueChange={(v) => setState(v as "on" | "off")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">{hasCovers ? "Ouvrir" : "Allumer"}</SelectItem>
                <SelectItem value="off">{hasCovers ? "Fermer" : "Éteindre"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasLights && state === "on" && (
            <div className="space-y-2">
              <Label>Luminosité ({brightness}%)</Label>
              <Slider
                value={[brightness]}
                onValueChange={([v]) => setBrightness(v)}
                min={1}
                max={100}
                step={1}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={selectedEntityIds.length === 0}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}

// ============ Scene Action Form ============

interface SceneActionFormProps {
  scenes: any[];
  onAdd: (action: SmartAction) => void;
  onCancel: () => void;
}

function SceneActionForm({ scenes, onAdd, onCancel }: SceneActionFormProps) {
  const [sceneId, setSceneId] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Scène</Label>
        <Select value={sceneId} onValueChange={setSceneId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une scène" />
          </SelectTrigger>
          <SelectContent>
            {scenes.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          onClick={() => onAdd({ type: "scene", entityId: sceneId })}
          disabled={!sceneId}
        >
          Ajouter
        </Button>
      </div>
    </div>
  );
}

// ============ Delay Action Form ============

interface DelayActionFormProps {
  onAdd: (action: SmartAction) => void;
  onCancel: () => void;
}

function DelayActionForm({ onAdd, onCancel }: DelayActionFormProps) {
  const [seconds, setSeconds] = useState(5);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Durée (secondes)</Label>
        <Input
          type="number"
          value={seconds}
          onChange={(e) => setSeconds(parseInt(e.target.value) || 0)}
          min={1}
          max={3600}
        />
        <p className="text-xs text-muted-foreground">
          Exemple : 5 secondes, 60 secondes (1 minute), 300 secondes (5 minutes)
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onAdd({ type: "delay", delaySeconds: seconds })} disabled={seconds < 1}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}
