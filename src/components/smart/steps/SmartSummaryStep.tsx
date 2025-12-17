import { useMemo } from "react";
import { SmartWizardDraft, SmartAction, TRIGGER_TYPE_LABELS, CONDITION_TYPE_LABELS, AUTOMATION_MODES } from "@/types/smart";
import { useHAStore } from "@/store/useHAStore";
import { useSceneStore } from "@/store/useSceneStore";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, GitBranch, Play, Info, Lightbulb, Power, Blinds, Fan, Disc3, Thermometer, Lock, Clock, Sparkles, LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { HAArea, HAFloor } from "@/types/homeassistant";

interface SmartSummaryStepProps {
  draft: SmartWizardDraft;
  onUpdate?: (updates: Partial<SmartWizardDraft>) => void;
}

const getDomainIcon = (domain: string): LucideIcon => {
  switch (domain) {
    case "light": return Lightbulb;
    case "switch": return Power;
    case "cover": return Blinds;
    case "fan": return Fan;
    case "media_player": return Disc3;
    case "climate": return Thermometer;
    case "lock": return Lock;
    default: return Power;
  }
};

const getDomainLabel = (domain: string): string => {
  switch (domain) {
    case "light": return "Éclairages";
    case "switch": return "Interrupteurs";
    case "cover": return "Volets";
    case "fan": return "Ventilateurs";
    case "media_player": return "Médias";
    case "climate": return "Climatisation";
    case "lock": return "Serrures";
    default: return "Appareils";
  }
};

export function SmartSummaryStep({ draft, onUpdate }: SmartSummaryStepProps) {
  const entities = useHAStore((s) => s.entities);
  const entityRegistry = useHAStore((s) => s.entityRegistry);
  const devices = useHAStore((s) => s.devices);
  const areas = useHAStore((s) => s.areas);
  const floors = useHAStore((s) => s.floors);
  const sharedScenes = useSceneStore((s) => s.sharedScenes);
  const localScenes = useSceneStore((s) => s.localScenes);
  const allScenes = useMemo(() => [...localScenes, ...sharedScenes], [localScenes, sharedScenes]);

  const IconComponent = (LucideIcons as any)[draft.icon] || LucideIcons.Bot;

  const getEntityName = (entityId: string) => {
    const entity = entities.find((e) => e.entity_id === entityId);
    return entity?.attributes?.friendly_name || entityId;
  };

  const getEntityAreaId = (entityId: string): string | undefined => {
    const reg = entityRegistry.find(r => r.entity_id === entityId);
    if (reg?.area_id) return reg.area_id;
    if (reg?.device_id) {
      const device = devices.find(d => d.id === reg.device_id);
      if (device?.area_id) return device.area_id;
    }
    return undefined;
  };

  const getSceneName = (sceneId: string) => {
    const scene = allScenes.find((s) => s.id === sceneId || s.id === `scene.${sceneId}`);
    return scene?.name || sceneId;
  };

  const getActionLabel = (action: SmartAction): string => {
    const service = action.service || "";
    const isOn = service.includes("turn_on") || service.includes("open");
    return isOn ? "Allumer" : "Éteindre";
  };

  const renderTriggerSummary = () => {
    return draft.triggers.map((trigger, index) => {
      const config = TRIGGER_TYPE_LABELS[trigger.type];
      let description = "";

      switch (trigger.type) {
        case "state":
          description = `${getEntityName(trigger.entityId)} ${trigger.to ? `passe à "${trigger.to}"` : "change d'état"}`;
          break;
        case "time":
          description = `À ${trigger.at}`;
          break;
        case "sun":
          const sunLabel = trigger.event === "sunrise" ? "Lever du soleil" : "Coucher du soleil";
          description = trigger.offset
            ? `${sunLabel} (${trigger.offset >= 0 ? "+" : ""}${trigger.offset} min)`
            : sunLabel;
          break;
        case "numeric":
          const parts = [];
          if (trigger.above !== undefined) parts.push(`> ${trigger.above}`);
          if (trigger.below !== undefined) parts.push(`< ${trigger.below}`);
          description = `${getEntityName(trigger.entityId)} ${parts.join(" et ")}`;
          break;
        case "zone":
          description = `${getEntityName(trigger.entityId)} ${trigger.event === "enter" ? "entre dans" : "quitte"} ${getEntityName(trigger.zone)}`;
          break;
      }

      return (
        <div key={index} className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="shrink-0">{config.label}</Badge>
          <span className="text-muted-foreground">{description}</span>
        </div>
      );
    });
  };

  const renderConditionSummary = () => {
    if (draft.conditions.groups.length === 0) {
      return <p className="text-sm text-muted-foreground italic">Aucune condition (toujours exécuté)</p>;
    }

    return draft.conditions.groups.map((group, groupIndex) => (
      <div key={group.id} className="space-y-1">
        {groupIndex > 0 && (
          <Badge variant="secondary" className="my-1">
            {draft.conditions.rootOperator === "and" ? "ET" : "OU"}
          </Badge>
        )}
        <div className="pl-2 border-l-2 border-primary/30 space-y-1">
          {group.conditions.map((condition, condIndex) => {
            const config = CONDITION_TYPE_LABELS[condition.type];
            let description = "";

            switch (condition.type) {
              case "state":
                description = `${getEntityName(condition.entityId)} = "${condition.state}"`;
                break;
              case "time":
                const timeParts = [];
                if (condition.after) timeParts.push(`après ${condition.after}`);
                if (condition.before) timeParts.push(`avant ${condition.before}`);
                description = timeParts.join(", ");
                break;
              case "sun":
                const sunParts = [];
                if (condition.after) sunParts.push(`après ${condition.after === "sunrise" ? "lever" : "coucher"}`);
                if (condition.before) sunParts.push(`avant ${condition.before === "sunrise" ? "lever" : "coucher"}`);
                description = sunParts.join(", ");
                break;
              case "numeric":
                const numParts = [];
                if (condition.above !== undefined) numParts.push(`> ${condition.above}`);
                if (condition.below !== undefined) numParts.push(`< ${condition.below}`);
                description = `${getEntityName(condition.entityId)} ${numParts.join(" et ")}`;
                break;
              case "zone":
                description = `${getEntityName(condition.entityId)} dans ${getEntityName(condition.zone)}`;
                break;
            }

            return (
              <div key={condIndex} className="flex items-center gap-2 text-sm">
                {condIndex > 0 && (
                  <span className="text-xs text-muted-foreground">{group.operator === "and" ? "ET" : "OU"}</span>
                )}
                <span className="text-muted-foreground">{description}</span>
              </div>
            );
          })}
        </div>
      </div>
    ));
  };

  // Group device actions by floor > area > domain
  const groupedDeviceActions = useMemo(() => {
    const deviceActions = draft.actions.filter(a => (a.type === "device" || a.type === "service") && a.entityId);
    
    const byArea: Record<string, { action: SmartAction; entityId: string }[]> = {};
    const noArea: { action: SmartAction; entityId: string }[] = [];

    for (const action of deviceActions) {
      const entityId = action.entityId!;
      const areaId = getEntityAreaId(entityId);
      if (areaId) {
        if (!byArea[areaId]) byArea[areaId] = [];
        byArea[areaId].push({ action, entityId });
      } else {
        noArea.push({ action, entityId });
      }
    }

    const byFloor: Record<string, { floor: HAFloor | null; areas: { area: HAArea; items: { action: SmartAction; entityId: string }[] }[] }> = {};
    const noFloorAreas: { area: HAArea; items: { action: SmartAction; entityId: string }[] }[] = [];

    for (const [areaId, areaItems] of Object.entries(byArea)) {
      const area = areas.find(a => a.area_id === areaId);
      if (!area) continue;

      const floor = floors.find(f => f.floor_id === area.floor_id);
      const floorKey = floor?.floor_id || "__no_floor__";

      if (floor) {
        if (!byFloor[floorKey]) {
          byFloor[floorKey] = { floor, areas: [] };
        }
        byFloor[floorKey].areas.push({ area, items: areaItems });
      } else {
        noFloorAreas.push({ area, items: areaItems });
      }
    }

    return { byFloor, noFloorAreas, noArea };
  }, [draft.actions, areas, floors, entityRegistry, devices]);

  // Non-device actions (scenes, delays)
  const otherActions = useMemo(() => {
    return draft.actions.filter(a => a.type === "scene" || a.type === "delay");
  }, [draft.actions]);

  // Group items by domain
  const groupByDomain = (items: { action: SmartAction; entityId: string }[]): Record<string, { action: SmartAction; entityId: string }[]> => {
    const byDomain: Record<string, { action: SmartAction; entityId: string }[]> = {};
    for (const item of items) {
      const domain = item.entityId.split(".")[0];
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(item);
    }
    return byDomain;
  };

  const renderItemsByDomain = (items: { action: SmartAction; entityId: string }[]) => {
    const byDomain = groupByDomain(items);
    return Object.entries(byDomain).map(([domain, domainItems]) => {
      const DomainIcon = getDomainIcon(domain);
      return (
        <div key={domain} className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DomainIcon className="w-3 h-3" />
            <span>{getDomainLabel(domain)}</span>
          </div>
          <div className="space-y-0.5 ml-1">
            {domainItems.map((item, idx) => {
              const EntityIcon = getDomainIcon(domain);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1 px-2 rounded bg-muted/30 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <EntityIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{getEntityName(item.entityId)}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0 ml-2 text-xs">
                    {getActionLabel(item.action)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  const deviceActionCount = draft.actions.filter(a => (a.type === "device" || a.type === "service") && a.entityId).length;

  const renderActionSummary = () => {
    return (
      <div className="space-y-4">
        {/* Device actions grouped by floor > area > domain */}
        {deviceActionCount > 0 && (
          <div className="space-y-3">
            {/* By floor */}
            {Object.entries(groupedDeviceActions.byFloor).map(([floorId, { floor, areas: floorAreas }]) => (
              <div key={floorId} className="space-y-2">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {floor?.name || "Étage"}
                </h5>
                {floorAreas.map(({ area, items }) => (
                  <div key={area.area_id} className="space-y-2">
                    <h6 className="text-xs font-medium text-muted-foreground ml-2">
                      {area.name}
                    </h6>
                    <div className="space-y-2 ml-2">
                      {renderItemsByDomain(items)}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Areas without floor */}
            {groupedDeviceActions.noFloorAreas.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Autres pièces
                </h5>
                {groupedDeviceActions.noFloorAreas.map(({ area, items }) => (
                  <div key={area.area_id} className="space-y-2">
                    <h6 className="text-xs font-medium text-muted-foreground ml-2">
                      {area.name}
                    </h6>
                    <div className="space-y-2 ml-2">
                      {renderItemsByDomain(items)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Devices without area */}
            {groupedDeviceActions.noArea.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Sans pièce
                </h5>
                <div className="space-y-2">
                  {renderItemsByDomain(groupedDeviceActions.noArea)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other actions (scenes, delays) */}
        {otherActions.length > 0 && (
          <div className="space-y-1">
            {otherActions.map((action, index) => {
              if (action.type === "scene") {
                return (
                  <div key={index} className="flex items-center gap-2 py-1 px-2 rounded bg-muted/30 text-sm">
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>Activer "{getSceneName(action.entityId || "")}"</span>
                  </div>
                );
              }
              if (action.type === "delay") {
                return (
                  <div key={index} className="flex items-center gap-2 py-1 px-2 rounded bg-muted/30 text-sm">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>Attendre {action.delaySeconds} secondes</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-2">
      {/* Preview card */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
            <IconComponent className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{draft.name || "Sans nom"}</h3>
            {draft.description && (
              <p className="text-sm text-muted-foreground">{draft.description}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Triggers */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <Label>Déclencheurs (QUAND)</Label>
        </div>
        <Card className="p-3 space-y-2">
          {renderTriggerSummary()}
        </Card>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          <Label>Conditions (SI)</Label>
        </div>
        <Card className="p-3 space-y-2">
          {renderConditionSummary()}
        </Card>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-primary" />
          <Label>Actions (ALORS) – {draft.actions.length} action{draft.actions.length > 1 ? "s" : ""}</Label>
        </div>
        <Card className="p-3 max-h-[200px] overflow-y-auto">
          {renderActionSummary()}
        </Card>
      </div>

      {/* Mode */}
      {onUpdate && (
        <div className="space-y-2">
          <Label>Mode d'exécution</Label>
          <Select value={draft.mode} onValueChange={(v) => onUpdate({ mode: v as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTOMATION_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value || "single"}>
                  <div>
                    <span className="font-medium">{mode.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{mode.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Info */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Cette automatisation sera enregistrée dans Home Assistant et s'exécutera automatiquement, 
            même si l'application est fermée. Vous pourrez la modifier ou la désactiver à tout moment.
          </p>
        </div>
      </div>
    </div>
  );
}
