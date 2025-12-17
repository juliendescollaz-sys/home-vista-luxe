import { useMemo } from "react";
import { SmartWizardDraft, TRIGGER_TYPE_LABELS, CONDITION_TYPE_LABELS, AUTOMATION_MODES } from "@/types/smart";
import { useHAStore } from "@/store/useHAStore";
import { useSceneStore } from "@/store/useSceneStore";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, GitBranch, Play, Info } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface SmartSummaryStepProps {
  draft: SmartWizardDraft;
  onUpdate?: (updates: Partial<SmartWizardDraft>) => void;
}

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

  const getEntityLocation = (entityId: string): string | null => {
    // Find entity in registry
    const regEntry = entityRegistry.find((e) => e.entity_id === entityId);
    if (!regEntry) return null;

    // Find device to get area_id
    const device = devices.find((d) => d.id === regEntry.device_id);
    const areaId = regEntry.area_id || device?.area_id;
    if (!areaId) return null;

    // Find area
    const area = areas.find((a) => a.area_id === areaId);
    if (!area) return null;

    // Find floor
    const floor = floors.find((f) => f.floor_id === area.floor_id);
    
    if (floor) {
      return `${area.name} • ${floor.name}`;
    }
    return area.name;
  };

  const getSceneName = (sceneId: string) => {
    const scene = allScenes.find((s) => s.id === sceneId || s.id === `scene.${sceneId}`);
    return scene?.name || sceneId;
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

  const renderActionSummary = () => {
    return draft.actions.map((action, index) => {
      let description = "";
      let location: string | null = null;
      let icon = Play;

      switch (action.type) {
        case "device":
        case "service":
          const service = action.service || "";
          const isOn = service.includes("turn_on") || service.includes("open");
          description = `${getEntityName(action.entityId || "")} → ${isOn ? "Allumer/Ouvrir" : "Éteindre/Fermer"}`;
          location = getEntityLocation(action.entityId || "");
          icon = LucideIcons.Power;
          break;
        case "scene":
          description = `Activer "${getSceneName(action.entityId || "")}"`;
          icon = LucideIcons.Sparkles;
          break;
        case "delay":
          description = `Attendre ${action.delaySeconds} secondes`;
          icon = LucideIcons.Clock;
          break;
      }

      const IconComp = icon;

      return (
        <div key={index} className="flex items-start gap-2 text-sm">
          <Badge variant="secondary" className="shrink-0 mt-0.5">{index + 1}</Badge>
          <IconComp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex flex-col min-w-0">
            <span className="text-muted-foreground">{description}</span>
            {location && (
              <span className="text-xs text-muted-foreground/70">{location}</span>
            )}
          </div>
        </div>
      );
    });
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
          <Label>Actions (ALORS)</Label>
        </div>
        <Card className="p-3 space-y-2">
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
