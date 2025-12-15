import { useMemo } from "react";
import { RoutineWizardDraft, DAYS_OF_WEEK, MONTHS, RoutineAction } from "@/types/routines";
import { useHAStore } from "@/store/useHAStore";
import { useSceneStore } from "@/store/useSceneStore";
import { useGroupStore } from "@/store/useGroupStore";
import { 
  Clock, Lightbulb, Power, Blinds, Fan, Disc3, Thermometer, Lock, 
  Sparkles, Package, Users, Calendar, CheckCircle, LucideIcon, Droplet, Settings 
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface RoutineSummaryStepProps {
  draft: RoutineWizardDraft;
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
    case "valve": return Droplet;
    default: return Settings;
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
    case "valve": return "Vannes";
    default: return "Appareils";
  }
};

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

  // Helper to get area_id for an entity
  const getEntityAreaId = (entityId: string): string | undefined => {
    const reg = entityRegistry.find(r => r.entity_id === entityId);
    if (reg?.area_id) return reg.area_id;
    if (reg?.device_id) {
      const device = devices.find(d => d.id === reg.device_id);
      if (device?.area_id) return device.area_id;
    }
    return undefined;
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

  const formatState = (item: RoutineAction) => {
    const targetState = item.targetState;
    if (!targetState) return "Allumer";
    
    if (targetState.state === "off") return "Éteindre";
    
    const parts: string[] = ["Allumer"];
    
    if (targetState.brightness !== undefined) {
      parts.push(`${Math.round((targetState.brightness / 255) * 100)}%`);
    }
    if (targetState.position !== undefined) {
      parts[0] = targetState.position > 0 ? "Ouvrir" : "Fermer";
      if (targetState.position > 0 && targetState.position < 100) {
        parts.push(`${targetState.position}%`);
      }
    }
    if (targetState.hvac_mode) {
      parts[0] = targetState.hvac_mode === "off" ? "Éteindre" : "Allumer";
      if (targetState.temperature !== undefined) {
        parts.push(`${targetState.temperature}°C`);
      }
    }
    
    return parts.join(", ");
  };

  const deviceItems = draft.selectedItems.filter((i) => i.type === "device");
  const sceneItems = draft.selectedItems.filter((i) => i.type === "scene");
  const groupItems = draft.selectedItems.filter((i) => i.type === "group");

  // Group device items by floor > area (same structure as SceneSummaryStep)
  const groupedDevices = useMemo(() => {
    const deviceEntities = deviceItems.map((item) => {
      const entity = entities.find((e) => e.entity_id === item.id);
      return entity ? { item, entity } : null;
    }).filter(Boolean) as { item: RoutineAction; entity: HAEntity }[];

    // Grouper par area
    const byArea: Record<string, { item: RoutineAction; entity: HAEntity }[]> = {};
    const noArea: { item: RoutineAction; entity: HAEntity }[] = [];

    for (const { item, entity } of deviceEntities) {
      const areaId = getEntityAreaId(entity.entity_id);
      if (areaId) {
        if (!byArea[areaId]) byArea[areaId] = [];
        byArea[areaId].push({ item, entity });
      } else {
        noArea.push({ item, entity });
      }
    }

    // Group by domain within each area
    const groupByDomain = (items: { item: RoutineAction; entity: HAEntity }[]): Record<string, { item: RoutineAction; entity: HAEntity }[]> => {
      const byDomain: Record<string, { item: RoutineAction; entity: HAEntity }[]> = {};
      for (const entry of items) {
        const domain = entry.entity.entity_id.split(".")[0];
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(entry);
      }
      return byDomain;
    };

    // Grouper les areas par floor
    const byFloor: Record<string, { floor: HAFloor | null; areas: { area: HAArea; entitiesByDomain: Record<string, { item: RoutineAction; entity: HAEntity }[]> }[] }> = {};
    const noFloorAreas: { area: HAArea; entitiesByDomain: Record<string, { item: RoutineAction; entity: HAEntity }[]> }[] = [];

    for (const [areaId, areaItems] of Object.entries(byArea)) {
      const area = areas.find(a => a.area_id === areaId);
      if (!area) continue;

      const floor = floors.find(f => f.floor_id === area.floor_id);
      const floorKey = floor?.floor_id || "__no_floor__";
      const entitiesByDomain = groupByDomain(areaItems);

      if (floor) {
        if (!byFloor[floorKey]) {
          byFloor[floorKey] = { floor, areas: [] };
        }
        byFloor[floorKey].areas.push({ area, entitiesByDomain });
      } else {
        noFloorAreas.push({ area, entitiesByDomain });
      }
    }

    return { byFloor, noFloorAreas, noAreaByDomain: groupByDomain(noArea) };
  }, [deviceItems, entities, areas, floors, devices, entityRegistry]);

  // Render entities grouped by domain
  const renderEntitiesByDomain = (entitiesByDomain: Record<string, { item: RoutineAction; entity: HAEntity }[]>) => {
    return Object.entries(entitiesByDomain).map(([domain, items]) => {
      const DomainIcon = getDomainIcon(domain);
      return (
        <div key={domain} className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DomainIcon className="w-3 h-3" />
            <span>{getDomainLabel(domain)}</span>
          </div>
          <div className="space-y-0.5 ml-1">
            {items.map(({ item, entity }) => {
              const EntityIcon = getDomainIcon(entity.entity_id.split(".")[0]);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1 px-2 rounded bg-muted/30 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <EntityIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {entity.attributes.friendly_name || entity.entity_id}
                    </span>
                  </div>
                  <span className="text-muted-foreground shrink-0 ml-2 text-xs">
                    {formatState(item)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Vérifiez les paramètres de votre routine avant de la sauvegarder. 
          Une fois créée, la routine sera automatiquement planifiée dans Home Assistant.
        </p>
      </div>

      {/* Routine info card */}
      <div className="p-4 rounded-lg border bg-card space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{draft.name || "Sans nom"}</h3>
            {draft.description && (
              <p className="text-sm text-muted-foreground">{draft.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span>Automation Home Assistant</span>
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
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          {draft.selectedItems.length} action{draft.selectedItems.length > 1 ? "s" : ""} configurée{draft.selectedItems.length > 1 ? "s" : ""}
        </h4>

        <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
          {/* Devices by floor */}
          {Object.entries(groupedDevices.byFloor).map(([floorId, { floor, areas: floorAreas }]) => (
            <div key={floorId} className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {floor?.name || "Étage"}
              </h5>
              {floorAreas.map(({ area, entitiesByDomain }) => (
                <div key={area.area_id} className="space-y-2">
                  <h6 className="text-xs font-medium text-muted-foreground ml-2">
                    {area.name}
                  </h6>
                  <div className="space-y-2 ml-2">
                    {renderEntitiesByDomain(entitiesByDomain)}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Areas without floor */}
          {groupedDevices.noFloorAreas.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Autres pièces
              </h5>
              {groupedDevices.noFloorAreas.map(({ area, entitiesByDomain }) => (
                <div key={area.area_id} className="space-y-2">
                  <h6 className="text-xs font-medium text-muted-foreground ml-2">
                    {area.name}
                  </h6>
                  <div className="space-y-2 ml-2">
                    {renderEntitiesByDomain(entitiesByDomain)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Entities without area */}
          {Object.keys(groupedDevices.noAreaByDomain).length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Sans pièce
              </h5>
              <div className="space-y-2">
                {renderEntitiesByDomain(groupedDevices.noAreaByDomain)}
              </div>
            </div>
          )}

          {/* Scenes */}
          {sceneItems.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Scènes
              </h5>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  <span>Scènes ({sceneItems.length})</span>
                </div>
                <div className="space-y-0.5 ml-1">
                  {sceneItems.map((item) => {
                    const scene = allScenes.find((s) => s.id === item.id);
                    const SceneIcon = scene?.icon ? (LucideIcons as any)[scene.icon] || Sparkles : Sparkles;
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center py-1 px-2 rounded bg-muted/30 text-sm"
                      >
                        <SceneIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-2" />
                        <span>{scene?.name || item.id}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Groups */}
          {groupItems.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Groupes
              </h5>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Package className="w-3 h-3" />
                  <span>Groupes ({groupItems.length})</span>
                </div>
                <div className="space-y-0.5 ml-1">
                  {groupItems.map((item) => {
                    const group = groups.find((g) => g.id === item.id);
                    const stateLabel = item.groupState === "off" ? "Éteindre" : "Allumer";
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-1 px-2 rounded bg-muted/30 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{group?.name || item.id}</span>
                        </div>
                        <span className="text-muted-foreground shrink-0 ml-2 text-xs">
                          {stateLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Tout pourra être modifié plus tard depuis les paramètres de la routine.
      </p>
    </div>
  );
}
