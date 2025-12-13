import { useMemo } from "react";
import { RoutineWizardDraft, DAYS_OF_WEEK, MONTHS } from "@/types/routines";
import { useHAStore } from "@/store/useHAStore";
import { useSceneStore } from "@/store/useSceneStore";
import { useGroupStore } from "@/store/useGroupStore";
import { Clock, Lightbulb, Sparkles, Package, Users, Calendar } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface RoutineSummaryStepProps {
  draft: RoutineWizardDraft;
}

export function RoutineSummaryStep({ draft }: RoutineSummaryStepProps) {
  const entities = useHAStore((s) => s.entities);
  const entityRegistry = useHAStore((s) => s.entityRegistry);
  const devices = useHAStore((s) => s.devices);
  const areas = useHAStore((s) => s.areas);
  const floors = useHAStore((s) => s.floors);
  const localScenes = useSceneStore((s) => s.localScenes);
  const sharedScenes = useSceneStore((s) => s.sharedScenes);
  const groups = useGroupStore((s) => s.groups);

  const allScenes = useMemo(() => [...localScenes, ...sharedScenes], [localScenes, sharedScenes]);

  // Helper to get room and floor for an entity
  const getEntityLocation = (entityId: string): string => {
    const regEntry = entityRegistry.find((r) => r.entity_id === entityId) as any;
    let areaId = regEntry?.area_id;
    
    if (!areaId && regEntry?.device_id) {
      const device = devices.find((d: any) => d.id === regEntry.device_id);
      areaId = device?.area_id;
    }
    
    if (!areaId) return "";
    
    const area = areas.find((a) => a.area_id === areaId);
    if (!area) return "";
    
    const floor = floors.find((f) => f.floor_id === area.floor_id);
    
    if (floor) {
      return `${area.name} • ${floor.name}`;
    }
    return area.name;
  };

  const IconComponent = (LucideIcons as any)[draft.icon] || LucideIcons.Clock;

  const formatSchedule = (): string => {
    const { schedule } = draft;
    const time = schedule.time;

    switch (schedule.frequency) {
      case "once":
        return `Le ${schedule.date} à ${time}`;
      case "daily":
        if (schedule.daysOfWeek && schedule.daysOfWeek.length < 7) {
          const days = schedule.daysOfWeek.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.fullLabel).join(", ");
          return `Chaque ${days} à ${time}`;
        }
        return `Tous les jours à ${time}`;
      case "weekly":
        const weekDay = DAYS_OF_WEEK.find((d) => d.value === schedule.dayOfWeek)?.fullLabel || "Lundi";
        return `Chaque ${weekDay} à ${time}`;
      case "monthly":
        return `Le ${schedule.dayOfMonth || 1} de chaque mois à ${time}`;
      case "yearly":
        const month = MONTHS.find((m) => m.value === schedule.month)?.label || "Janvier";
        return `Le ${schedule.dayOfMonthYearly || 1} ${month} à ${time}`;
      default:
        return time;
    }
  };

  const deviceItems = draft.selectedItems.filter((i) => i.type === "device");
  const sceneItems = draft.selectedItems.filter((i) => i.type === "scene");
  const groupItems = draft.selectedItems.filter((i) => i.type === "group");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
          <IconComponent className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{draft.name}</h3>
          {draft.description && (
            <p className="text-sm text-muted-foreground">{draft.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Automation Home Assistant</span>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-medium">Planification</span>
        </div>
        <p className="text-sm">{formatSchedule()}</p>
      </div>

      {/* Actions summary */}
      <div className="space-y-4">
        <h4 className="font-medium">Actions ({draft.selectedItems.length})</h4>

        {/* Devices */}
        {deviceItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              <span>Appareils ({deviceItems.length})</span>
            </div>
            <div className="pl-6 space-y-1">
              {deviceItems.map((item) => {
                const entity = entities.find((e) => e.entity_id === item.id);
                const name = entity?.attributes.friendly_name || item.id;
                const location = getEntityLocation(item.id);
                const stateLabel = item.targetState?.state === "off" ? "Éteindre" : "Allumer";
                return (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <span>{name}</span>
                      {location && (
                        <span className="text-xs text-muted-foreground ml-2">({location})</span>
                      )}
                    </div>
                    <span className="text-muted-foreground flex-shrink-0">{stateLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scenes */}
        {sceneItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Scènes ({sceneItems.length})</span>
            </div>
            <div className="pl-6 space-y-1">
              {sceneItems.map((item) => {
                const scene = allScenes.find((s) => s.id === item.id);
                return (
                  <div key={item.id} className="text-sm">
                    {scene?.name || item.id}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Groups */}
        {groupItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Groupes ({groupItems.length})</span>
            </div>
            <div className="pl-6 space-y-1">
              {groupItems.map((item) => {
                const group = groups.find((g) => g.id === item.id);
                const stateLabel = item.groupState === "off" ? "Éteindre" : "Allumer";
                return (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span>{group?.name || item.id}</span>
                    <span className="text-muted-foreground">{stateLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Note :</span> Tous les paramètres pourront être modifiés 
          ultérieurement en éditant la routine.
        </p>
      </div>
    </div>
  );
}
