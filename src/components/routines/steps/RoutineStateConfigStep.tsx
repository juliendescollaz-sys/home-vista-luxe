import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoutineWizardDraft, RoutineAction } from "@/types/routines";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import { isDimmableLight } from "@/lib/entityUtils";
import { Lightbulb, Power, Blinds, ThermometerSun, Package, Wand2, Fan, Disc3, Lock, Droplet, Settings } from "lucide-react";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface RoutineStateConfigStepProps {
  draft: RoutineWizardDraft;
  onUpdate: (updates: Partial<RoutineWizardDraft>) => void;
}

const getDomainIcon = (domain: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    light: Lightbulb,
    switch: Power,
    climate: ThermometerSun,
    media_player: Disc3,
    lock: Lock,
    fan: Fan,
    cover: Blinds,
    valve: Droplet,
  };
  return iconMap[domain] || Settings;
};

const getDomainLabel = (domain: string): string => {
  const labels: Record<string, string> = {
    light: "Éclairages",
    switch: "Interrupteurs",
    climate: "Climatisation",
    media_player: "Médias",
    lock: "Serrures",
    fan: "Ventilateurs",
    cover: "Volets",
    valve: "Vannes",
  };
  return labels[domain] || domain;
};

export function RoutineStateConfigStep({ draft, onUpdate }: RoutineStateConfigStepProps) {
  const entities = useHAStore((s) => s.entities);
  const entityRegistry = useHAStore((s) => s.entityRegistry);
  const devices = useHAStore((s) => s.devices);
  const areas = useHAStore((s) => s.areas);
  const floors = useHAStore((s) => s.floors);
  const groups = useGroupStore((s) => s.groups);

  // Helper pour obtenir l'area_id d'une entité
  const getEntityAreaId = (entityId: string): string | undefined => {
    const reg = entityRegistry.find((r) => r.entity_id === entityId);
    if (reg?.area_id) return reg.area_id;
    if (reg?.device_id) {
      const device = devices.find((d) => d.id === reg.device_id);
      if (device?.area_id) return device.area_id;
    }
    return undefined;
  };

  // Filter items that need state config (devices and groups, not scenes)
  const configurableItems = useMemo(() => {
    return draft.selectedItems.filter((item) => item.type === "device" || item.type === "group");
  }, [draft.selectedItems]);

  // Get device items only
  const deviceItems = useMemo(() => {
    return draft.selectedItems.filter((item) => item.type === "device");
  }, [draft.selectedItems]);

  // Get group items only
  const groupItems = useMemo(() => {
    return draft.selectedItems.filter((item) => item.type === "group");
  }, [draft.selectedItems]);

  // Group device items by floor > area > domain (same structure as SceneStateConfigStep)
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
      const area = areas.find((a) => a.area_id === areaId);
      if (!area) continue;

      const floor = floors.find((f) => f.floor_id === area.floor_id);
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

  const updateItemState = (itemId: string, itemType: string, updates: Partial<RoutineAction>) => {
    const itemIndex = draft.selectedItems.findIndex(
      (item) => item.type === itemType && item.id === itemId
    );

    if (itemIndex === -1) return;

    const newItems = [...draft.selectedItems];
    newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
    onUpdate({ selectedItems: newItems });
  };

  const updateDeviceTargetState = (
    itemId: string,
    stateUpdates: Partial<RoutineAction["targetState"]>
  ) => {
    const item = draft.selectedItems.find((i) => i.type === "device" && i.id === itemId);
    if (!item) return;
    const currentState = item.targetState || {};
    updateItemState(itemId, "device", {
      targetState: { ...currentState, ...stateUpdates },
    });
  };

  // Apply current state from HA entity
  const applyCurrentState = (entityId: string) => {
    const entity = entities.find((e) => e.entity_id === entityId);
    if (!entity) return;

    const domain = entityId.split(".")[0];
    const currentState: RoutineAction["targetState"] = {
      state: entity.state === "on" || entity.state === "open" ? "on" : "off",
    };

    if (domain === "light" && entity.attributes.brightness !== undefined) {
      currentState.brightness = entity.attributes.brightness;
    }
    if (domain === "cover" && entity.attributes.current_position !== undefined) {
      currentState.position = entity.attributes.current_position;
    }
    if (domain === "climate") {
      currentState.hvac_mode = entity.state;
      if (entity.attributes.temperature !== undefined) {
        currentState.temperature = entity.attributes.temperature;
      }
    }

    updateItemState(entityId, "device", { targetState: currentState });
  };

  const renderEntityConfig = (item: RoutineAction, entity: HAEntity) => {
    const domain = entity.entity_id.split(".")[0];
    const targetState = item.targetState || { state: "on" };
    const Icon = getDomainIcon(domain);

    // Check if entity has additional controls beyond simple on/off
    const hasAdditionalControls = (() => {
      if (domain === "light") {
        const supportedColorModes = entity.attributes.supported_color_modes as string[] | undefined;
        return (
          (Array.isArray(supportedColorModes) &&
            supportedColorModes.some((m) =>
              ["brightness", "hs", "xy", "rgb", "rgbw", "rgbww", "color_temp"].includes(m),
            )) ||
          typeof entity.attributes.brightness === "number"
        );
      }
      return domain === "cover" || domain === "climate" || domain === "media_player";
    })();

    const getToggleState = () => {
      if (domain === "cover") return (targetState.position ?? 100) > 0;
      if (domain === "climate") return targetState.hvac_mode !== "off";
      return targetState.state === "on" || targetState.state !== "off";
    };

    const handleToggle = (checked: boolean) => {
      if (domain === "cover") {
        updateDeviceTargetState(entity.entity_id, { position: checked ? 100 : 0 });
      } else if (domain === "climate") {
        updateDeviceTargetState(entity.entity_id, { hvac_mode: checked ? "heat" : "off" });
      } else {
        updateDeviceTargetState(entity.entity_id, { state: checked ? "on" : "off" });
      }
    };

    return (
      <div key={entity.entity_id} className="py-2 px-3 rounded-lg border bg-card/50">
        {/* Single line header */}
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate flex-1 min-w-0">{entity.attributes.friendly_name || entity.entity_id}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyCurrentState(entity.entity_id)}
            className="h-7 px-2 shrink-0 text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-md"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">État actuel</span>
          </Button>
          <Switch
            checked={getToggleState()}
            onCheckedChange={handleToggle}
            className="shrink-0"
          />
        </div>

        {/* Additional controls for complex entities */}
        {hasAdditionalControls && getToggleState() && (
          <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
            {/* Light brightness */}
            {domain === "light" && isDimmableLight(entity) && (
              <div className="flex items-center gap-3">
                <Label className="text-xs shrink-0 w-16">Luminosité</Label>
                <Slider
                  className="flex-1"
                  value={[targetState.brightness || 255]}
                  min={1}
                  max={255}
                  step={1}
                  onValueChange={([value]) => updateDeviceTargetState(entity.entity_id, { brightness: value })}
                />
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {Math.round((((targetState.brightness || 255) as number) / 255) * 100)}%
                </span>
              </div>
            )}

            {/* Cover position */}
            {domain === "cover" && (
              <div className="flex items-center gap-3">
                <Label className="text-xs shrink-0 w-16">Position</Label>
                <Slider
                  className="flex-1"
                  value={[targetState.position ?? 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => updateDeviceTargetState(entity.entity_id, { position: value })}
                />
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {(targetState.position ?? 100) as number}%
                </span>
              </div>
            )}

            {/* Climate */}
            {domain === "climate" && (
              <>
                <div className="flex items-center gap-3">
                  <Label className="text-xs shrink-0 w-16">Mode</Label>
                  <Select
                    value={targetState.hvac_mode || "heat"}
                    onValueChange={(value) => updateDeviceTargetState(entity.entity_id, { hvac_mode: value })}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="heat">Chauffage</SelectItem>
                      <SelectItem value="cool">Climatisation</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs shrink-0 w-16">Temp.</Label>
                  <Slider
                    className="flex-1"
                    value={[targetState.temperature ?? 20]}
                    min={10}
                    max={30}
                    step={0.5}
                    onValueChange={([value]) => updateDeviceTargetState(entity.entity_id, { temperature: value })}
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {(targetState.temperature ?? 20) as number}°C
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderGroupConfig = (item: RoutineAction) => {
    const group = groups.find((g) => g.id === item.id);
    if (!group) return null;

    const isOn = item.groupState !== "off";

    return (
      <div key={item.id} className="py-2 px-3 rounded-lg border bg-card/50">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">{group.name}</span>
            <span className="text-xs text-muted-foreground">
              {group.entityIds.length} appareil{group.entityIds.length > 1 ? "s" : ""}
            </span>
          </div>
          <Switch
            checked={isOn}
            onCheckedChange={(checked) =>
              updateItemState(item.id, "group", { groupState: checked ? "on" : "off" })
            }
            className="shrink-0"
          />
        </div>
      </div>
    );
  };

  const renderDomainGroup = (domain: string, items: { item: RoutineAction; entity: HAEntity }[]) => {
    const Icon = getDomainIcon(domain);
    return (
      <div key={domain} className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Icon className="w-3.5 h-3.5" />
          <span>{getDomainLabel(domain)}</span>
        </div>
        <div className="space-y-1.5">
          {items.map(({ item, entity }) => renderEntityConfig(item, entity))}
        </div>
      </div>
    );
  };

  const renderAreaContent = (entitiesByDomain: Record<string, { item: RoutineAction; entity: HAEntity }[]>) => {
    const domainOrder = ["light", "switch", "cover", "fan", "valve", "climate", "media_player", "lock"];
    const sortedDomains = Object.keys(entitiesByDomain).sort((a, b) => {
      const idxA = domainOrder.indexOf(a);
      const idxB = domainOrder.indexOf(b);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    return (
      <div className="space-y-3">
        {sortedDomains.map((domain) => renderDomainGroup(domain, entitiesByDomain[domain]))}
      </div>
    );
  };

  if (configurableItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Aucun appareil ou groupe à configurer.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Bloc Conseil */}
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Conseil :</span> Définissez l'état cible de chaque appareil et groupe 
          lorsque la routine s'exécutera. Cliquez sur la « baguette magique » pour capturer rapidement 
          l'état actuel d'un appareil.
        </p>
      </div>

      {/* Liste par étages / pièces / types */}
      <div className="bg-background max-h-[50vh] overflow-y-auto">
        {/* Devices: Étages avec pièces */}
        {Object.entries(groupedDevices.byFloor).map(([floorId, { floor, areas: floorAreas }]) => (
          <section key={floorId} className="mb-4">
            <header className="w-full px-1 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground bg-background border-b border-border/30">
              {floor?.name || "Étage"}
            </header>

            <div className="space-y-4 px-1 pt-3 pb-1 bg-background">
              {floorAreas.map(({ area, entitiesByDomain }) => (
                <div key={area.area_id} className="space-y-2 bg-background">
                  <h6 className="text-sm font-medium text-foreground ml-1">{area.name}</h6>
                  <div className="ml-1">{renderAreaContent(entitiesByDomain)}</div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Pièces sans étage */}
        {groupedDevices.noFloorAreas.length > 0 && (
          <section className="mb-4">
            <header className="w-full px-1 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground bg-background border-b border-border/30">
              Autres pièces
            </header>

            <div className="space-y-4 px-1 pt-3 pb-1 bg-background">
              {groupedDevices.noFloorAreas.map(({ area, entitiesByDomain }) => (
                <div key={area.area_id} className="space-y-2 bg-background">
                  <h6 className="text-sm font-medium text-foreground ml-1">{area.name}</h6>
                  <div className="ml-1">{renderAreaContent(entitiesByDomain)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Entités sans pièce */}
        {Object.keys(groupedDevices.noAreaByDomain).length > 0 && (
          <section className="mb-4">
            <header className="w-full px-1 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground bg-background border-b border-border/30">
              Sans pièce
            </header>

            <div className="px-1 pt-3 pb-1 bg-background">
              {renderAreaContent(groupedDevices.noAreaByDomain)}
            </div>
          </section>
        )}

        {/* Groups section */}
        {groupItems.length > 0 && (
          <section className="mb-4">
            <header className="w-full px-1 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground bg-background border-b border-border/30">
              Groupes
            </header>

            <div className="space-y-1.5 px-1 pt-3 pb-1 bg-background">
              {groupItems.map((item) => renderGroupConfig(item))}
            </div>
          </section>
        )}
      </div>

      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Note :</span> Les scènes sélectionnées s'activeront 
          automatiquement avec leur configuration enregistrée.
        </p>
      </div>
    </div>
  );
}
