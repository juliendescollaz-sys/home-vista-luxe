import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useHAStore } from "@/store/useHAStore";
import { SceneWizardDraft, SceneEntityState } from "@/types/scenes";
import { Wand2, Lightbulb, Power, Thermometer, Music, Lock, Fan, Blinds, Droplet, Settings } from "lucide-react";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface SceneStateConfigStepProps {
  draft: SceneWizardDraft;
  onUpdate: (updates: Partial<SceneWizardDraft>) => void;
}

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

export function SceneStateConfigStep({ draft, onUpdate }: SceneStateConfigStepProps) {
  const entities = useHAStore((s) => s.entities);
  const areas = useHAStore((s) => s.areas);
  const floors = useHAStore((s) => s.floors);
  const devices = useHAStore((s) => s.devices);
  const entityRegistry = useHAStore((s) => s.entityRegistry);

  const selectedEntities = useMemo(() => {
    return draft.selectedEntityIds.map((id) => entities.find((e) => e.entity_id === id)).filter(Boolean) as HAEntity[];
  }, [draft.selectedEntityIds, entities]);

  const updateEntityState = (entityId: string, state: Partial<SceneEntityState["targetState"]>) => {
    const current = draft.entityStates[entityId] || {};
    onUpdate({
      entityStates: {
        ...draft.entityStates,
        [entityId]: { ...current, ...state },
      },
    });
  };

  const useCurrentState = (entity: HAEntity) => {
    const domain = entity.entity_id.split(".")[0];
    const state: SceneEntityState["targetState"] = {};

    if (["on", "off"].includes(entity.state)) {
      state.state = entity.state as "on" | "off";
    } else if (["open", "closed", "opening", "closing"].includes(entity.state)) {
      state.state = entity.state.includes("open") ? "open" : "closed";
    } else if (["playing", "paused", "idle"].includes(entity.state)) {
      state.state = entity.state as "playing" | "paused" | "idle";
    }

    if (domain === "light") {
      if (entity.attributes.brightness !== undefined) {
        state.brightness = entity.attributes.brightness;
      }
      if (entity.attributes.color_temp !== undefined) {
        state.color_temp = entity.attributes.color_temp;
      }
      if (entity.attributes.rgb_color !== undefined) {
        state.rgb_color = entity.attributes.rgb_color;
      }
    } else if (domain === "cover") {
      if (entity.attributes.current_position !== undefined) {
        state.position = entity.attributes.current_position;
      }
    } else if (domain === "climate") {
      if (entity.attributes.hvac_mode !== undefined) {
        state.hvac_mode = entity.attributes.hvac_mode;
      }
      if (entity.attributes.temperature !== undefined) {
        state.temperature = entity.attributes.temperature;
      }
    } else if (domain === "media_player") {
      if (entity.attributes.volume_level !== undefined) {
        state.volume_level = entity.attributes.volume_level;
      }
    }

    updateEntityState(entity.entity_id, state);
  };

  const getEntityAreaId = (entityId: string): string | undefined => {
    const reg = entityRegistry.find((r) => r.entity_id === entityId);
    if (reg?.area_id) return reg.area_id;
    if (reg?.device_id) {
      const device = devices.find((d) => d.id === reg.device_id);
      if (device?.area_id) return device.area_id;
    }
    return undefined;
  };

  // Group entities by floor > area > domain
  const groupedEntities = useMemo(() => {
    const byArea: Record<string, HAEntity[]> = {};
    const noArea: HAEntity[] = [];

    for (const entity of selectedEntities) {
      const areaId = getEntityAreaId(entity.entity_id);
      if (areaId) {
        if (!byArea[areaId]) byArea[areaId] = [];
        byArea[areaId].push(entity);
      } else {
        noArea.push(entity);
      }
    }

    // Group by domain within each area
    const groupByDomain = (ents: HAEntity[]): Record<string, HAEntity[]> => {
      const byDomain: Record<string, HAEntity[]> = {};
      for (const e of ents) {
        const domain = e.entity_id.split(".")[0];
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(e);
      }
      return byDomain;
    };

    const byFloor: Record<string, { floor: HAFloor | null; areas: { area: HAArea; entitiesByDomain: Record<string, HAEntity[]> }[] }> = {};
    const noFloorAreas: { area: HAArea; entitiesByDomain: Record<string, HAEntity[]> }[] = [];

    for (const [areaId, areaEntities] of Object.entries(byArea)) {
      const area = areas.find((a) => a.area_id === areaId);
      if (!area) continue;

      const floor = floors.find((f) => f.floor_id === area.floor_id);
      const floorKey = floor?.floor_id || "__no_floor__";
      const entitiesByDomain = groupByDomain(areaEntities);

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
  }, [selectedEntities, areas, floors, devices, entityRegistry]);

  const renderEntityConfig = (entity: HAEntity) => {
    const domain = entity.entity_id.split(".")[0];
    const currentState = draft.entityStates[entity.entity_id] || {};
    const Icon = getDomainIcon(domain);

    return (
      <div key={entity.entity_id} className="p-3 rounded-lg border bg-card/50">
        {/* Header compact */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{entity.attributes.friendly_name || entity.entity_id}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => useCurrentState(entity)} className="h-7 px-2 shrink-0">
            <Wand2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Controls */}
        <div className="space-y-2">
          {/* Light */}
          {domain === "light" &&
            (() => {
              const supportedColorModes = entity.attributes.supported_color_modes as string[] | undefined;
              const isDimmable =
                (Array.isArray(supportedColorModes) &&
                  supportedColorModes.some((m) =>
                    ["brightness", "hs", "xy", "rgb", "rgbw", "rgbww", "color_temp"].includes(m),
                  )) ||
                typeof entity.attributes.brightness === "number";

              return (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Allumé</Label>
                    <Switch
                      checked={currentState.state !== "off"}
                      onCheckedChange={(checked) =>
                        updateEntityState(entity.entity_id, { state: checked ? "on" : "off" })
                      }
                    />
                  </div>
                  {isDimmable && currentState.state !== "off" && (
                    <div className="flex items-center gap-3">
                      <Label className="text-xs shrink-0 w-16">Luminosité</Label>
                      <Slider
                        className="flex-1"
                        value={[currentState.brightness || 255]}
                        min={1}
                        max={255}
                        step={1}
                        onValueChange={([value]) => updateEntityState(entity.entity_id, { brightness: value })}
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {Math.round((((currentState.brightness || 255) as number) / 255) * 100)}%
                      </span>
                    </div>
                  )}
                </>
              );
            })()}

          {/* Switch / Fan / Valve */}
          {(domain === "switch" || domain === "fan" || domain === "valve" || domain === "input_boolean") && (
            <div className="flex items-center justify-between">
              <Label className="text-xs">Activé</Label>
              <Switch
                checked={currentState.state === "on"}
                onCheckedChange={(checked) => updateEntityState(entity.entity_id, { state: checked ? "on" : "off" })}
              />
            </div>
          )}

          {/* Cover */}
          {domain === "cover" && (
            <div className="flex items-center gap-3">
              <Label className="text-xs shrink-0 w-16">Position</Label>
              <Slider
                className="flex-1"
                value={[currentState.position ?? 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => updateEntityState(entity.entity_id, { position: value })}
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {(currentState.position ?? 100) as number}%
              </span>
            </div>
          )}

          {/* Climate */}
          {domain === "climate" && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label className="text-xs shrink-0 w-16">Mode</Label>
                <Select
                  value={currentState.hvac_mode || "off"}
                  onValueChange={(value) => updateEntityState(entity.entity_id, { hvac_mode: value })}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Éteint</SelectItem>
                    <SelectItem value="heat">Chauffage</SelectItem>
                    <SelectItem value="cool">Climatisation</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {currentState.hvac_mode && currentState.hvac_mode !== "off" && (
                <div className="flex items-center gap-3">
                  <Label className="text-xs shrink-0 w-16">Temp.</Label>
                  <Slider
                    className="flex-1"
                    value={[currentState.temperature ?? 20]}
                    min={10}
                    max={30}
                    step={0.5}
                    onValueChange={([value]) => updateEntityState(entity.entity_id, { temperature: value })}
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {(currentState.temperature ?? 20) as number}°C
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Media Player */}
          {domain === "media_player" && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label className="text-xs shrink-0 w-16">État</Label>
                <Select
                  value={currentState.state || "off"}
                  onValueChange={(value) => updateEntityState(entity.entity_id, { state: value as any })}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Éteint</SelectItem>
                    <SelectItem value="playing">Lecture</SelectItem>
                    <SelectItem value="paused">Pause</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs shrink-0 w-16">Volume</Label>
                <Slider
                  className="flex-1"
                  value={[((currentState.volume_level ?? 0.5) as number) * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => updateEntityState(entity.entity_id, { volume_level: value / 100 })}
                />
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {Math.round(((currentState.volume_level ?? 0.5) as number) * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Lock */}
          {domain === "lock" && (
            <div className="flex items-center justify-between">
              <Label className="text-xs">Verrouillé</Label>
              <Switch
                checked={currentState.state === "on"}
                onCheckedChange={(checked) => updateEntityState(entity.entity_id, { state: checked ? "on" : "off" })}
              />
            </div>
          )}

          {/* Generic fallback */}
          {!["light", "switch", "fan", "valve", "input_boolean", "cover", "climate", "media_player", "lock"].includes(
            domain,
          ) && (
            <div className="flex items-center justify-between">
              <Label className="text-xs">Activé</Label>
              <Switch
                checked={currentState.state === "on"}
                onCheckedChange={(checked) => updateEntityState(entity.entity_id, { state: checked ? "on" : "off" })}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDomainGroup = (domain: string, domainEntities: HAEntity[]) => {
    const Icon = getDomainIcon(domain);
    return (
      <div key={domain} className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Icon className="w-3.5 h-3.5" />
          <span>{getDomainLabel(domain)}</span>
        </div>
        <div className="space-y-1.5">
          {domainEntities.map(renderEntityConfig)}
        </div>
      </div>
    );
  };

  const renderAreaContent = (entitiesByDomain: Record<string, HAEntity[]>) => {
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

  return (
    <div className="flex flex-col gap-4">
      {/* Bloc Conseil */}
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Conseil :</span> Une scène, c&apos;est une « photo » de votre maison.
          Définissez comment chaque appareil doit se comporter quand la scène est activée. Utilisez « État actuel » pour
          capturer rapidement l&apos;état actuel d&apos;un appareil.
        </p>
      </div>

      {/* Liste par étages / pièces / types */}
      <div className="bg-background">
        {/* Étages avec pièces */}
        {Object.entries(groupedEntities.byFloor).map(([floorId, { floor, areas: floorAreas }]) => (
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
        {groupedEntities.noFloorAreas.length > 0 && (
          <section className="mb-4">
            <header className="w-full px-1 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground bg-background border-b border-border/30">
              Autres pièces
            </header>

            <div className="space-y-4 px-1 pt-3 pb-1 bg-background">
              {groupedEntities.noFloorAreas.map(({ area, entitiesByDomain }) => (
                <div key={area.area_id} className="space-y-2 bg-background">
                  <h6 className="text-sm font-medium text-foreground ml-1">{area.name}</h6>
                  <div className="ml-1">{renderAreaContent(entitiesByDomain)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Entités sans pièce */}
        {Object.keys(groupedEntities.noAreaByDomain).length > 0 && (
          <section className="mb-4">
            <header className="w-full px-1 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground bg-background border-b border-border/30">
              Sans pièce
            </header>

            <div className="px-1 pt-3 pb-1 bg-background">
              {renderAreaContent(groupedEntities.noAreaByDomain)}
            </div>
          </section>
        )}
      </div>

      {selectedEntities.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Aucun appareil sélectionné. Retournez à l&apos;étape précédente pour en choisir.
        </p>
      )}
    </div>
  );
}
