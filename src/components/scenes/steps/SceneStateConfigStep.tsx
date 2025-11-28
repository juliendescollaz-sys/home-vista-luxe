import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useHAStore } from "@/store/useHAStore";
import { SceneWizardDraft, SceneEntityState } from "@/types/scenes";
import { Wand2 } from "lucide-react";
import type { HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface SceneStateConfigStepProps {
  draft: SceneWizardDraft;
  onUpdate: (updates: Partial<SceneWizardDraft>) => void;
}

export function SceneStateConfigStep({ draft, onUpdate }: SceneStateConfigStepProps) {
  const entities = useHAStore((s) => s.entities);
  const areas = useHAStore((s) => s.areas);
  const floors = useHAStore((s) => s.floors);
  const devices = useHAStore((s) => s.devices);
  const entityRegistry = useHAStore((s) => s.entityRegistry);

  const selectedEntities = useMemo(() => {
    return draft.selectedEntityIds
      .map((id) => entities.find((e) => e.entity_id === id))
      .filter(Boolean) as HAEntity[];
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

    // Basic state
    if (["on", "off"].includes(entity.state)) {
      state.state = entity.state as "on" | "off";
    } else if (["open", "closed", "opening", "closing"].includes(entity.state)) {
      state.state = entity.state.includes("open") ? "open" : "closed";
    } else if (["playing", "paused", "idle"].includes(entity.state)) {
      state.state = entity.state as "playing" | "paused" | "idle";
    }

    // Domain-specific attributes
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

  // Helper to get area_id for an entity (same logic as Step 2 and Step 4)
  const getEntityAreaId = (entityId: string): string | undefined => {
    const reg = entityRegistry.find(r => r.entity_id === entityId);
    if (reg?.area_id) return reg.area_id;
    if (reg?.device_id) {
      const device = devices.find(d => d.id === reg.device_id);
      if (device?.area_id) return device.area_id;
    }
    return undefined;
  };

  // Group entities by floor > area (same structure as Step 2 and Step 4)
  const groupedEntities = useMemo(() => {
    // Group by area
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

    // Group areas by floor
    const byFloor: Record<string, { floor: HAFloor | null; areas: { area: HAArea; entities: HAEntity[] }[] }> = {};
    const noFloorAreas: { area: HAArea; entities: HAEntity[] }[] = [];

    for (const [areaId, areaEntities] of Object.entries(byArea)) {
      const area = areas.find(a => a.area_id === areaId);
      if (!area) continue;

      const floor = floors.find(f => f.floor_id === area.floor_id);
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
  }, [selectedEntities, areas, floors, devices, entityRegistry]);

  const renderEntityConfig = (entity: HAEntity) => {
    const domain = entity.entity_id.split(".")[0];
    const currentState = draft.entityStates[entity.entity_id] || {};

    return (
      <div key={entity.entity_id} className="relative z-10 p-4 rounded-lg border bg-card space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium">
              {entity.attributes.friendly_name || entity.entity_id}
            </h4>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => useCurrentState(entity)}
            className="shrink-0"
          >
            <Wand2 className="w-4 h-4 mr-1" />
            État actuel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Choisissez l'état de cet appareil lorsque la scène est activée.
        </p>

        <div className="space-y-4">
          {/* Light */}
          {domain === "light" && (() => {
            const supportedColorModes = entity.attributes.supported_color_modes as string[] | undefined;
            const isDimmable = 
              (Array.isArray(supportedColorModes) &&
                supportedColorModes.some((m) =>
                  ["brightness", "hs", "xy", "rgb", "rgbw", "rgbww", "color_temp"].includes(m)
                )) ||
              typeof entity.attributes.brightness === "number";

            return (
              <>
                <div className="flex items-center justify-between">
                  <Label>Allumé</Label>
                  <Switch
                    checked={currentState.state !== "off"}
                    onCheckedChange={(checked) =>
                      updateEntityState(entity.entity_id, { state: checked ? "on" : "off" })
                    }
                  />
                </div>
                {isDimmable && currentState.state !== "off" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Luminosité</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(((currentState.brightness || 255) / 255) * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[currentState.brightness || 255]}
                      min={1}
                      max={255}
                      step={1}
                      onValueChange={([value]) =>
                        updateEntityState(entity.entity_id, { brightness: value })
                      }
                    />
                  </div>
                )}
              </>
            );
          })()}

          {/* Switch / Fan / Valve */}
          {(domain === "switch" || domain === "fan" || domain === "valve" || domain === "input_boolean") && (
            <div className="flex items-center justify-between">
              <Label>Activé</Label>
              <Switch
                checked={currentState.state === "on"}
                onCheckedChange={(checked) =>
                  updateEntityState(entity.entity_id, { state: checked ? "on" : "off" })
                }
              />
            </div>
          )}

          {/* Cover */}
          {domain === "cover" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Position</Label>
                <span className="text-sm text-muted-foreground">
                  {currentState.position ?? 100}%
                </span>
              </div>
              <Slider
                value={[currentState.position ?? 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) =>
                  updateEntityState(entity.entity_id, { position: value })
                }
              />
              <p className="text-xs text-muted-foreground">
                0% = fermé, 100% = ouvert
              </p>
            </div>
          )}

          {/* Climate */}
          {domain === "climate" && (
            <>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select
                  value={currentState.hvac_mode || "off"}
                  onValueChange={(value) =>
                    updateEntityState(entity.entity_id, { hvac_mode: value })
                  }
                >
                  <SelectTrigger>
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Température cible</Label>
                    <span className="text-sm text-muted-foreground">
                      {currentState.temperature ?? 20}°C
                    </span>
                  </div>
                  <Slider
                    value={[currentState.temperature ?? 20]}
                    min={10}
                    max={30}
                    step={0.5}
                    onValueChange={([value]) =>
                      updateEntityState(entity.entity_id, { temperature: value })
                    }
                  />
                </div>
              )}
            </>
          )}

          {/* Media Player */}
          {domain === "media_player" && (
            <>
              <div className="space-y-2">
                <Label>État</Label>
                <Select
                  value={currentState.state || "off"}
                  onValueChange={(value) =>
                    updateEntityState(entity.entity_id, { state: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Éteint</SelectItem>
                    <SelectItem value="playing">Lecture</SelectItem>
                    <SelectItem value="paused">Pause</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Volume</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((currentState.volume_level ?? 0.5) * 100)}%
                  </span>
                </div>
                <Slider
                  value={[(currentState.volume_level ?? 0.5) * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) =>
                    updateEntityState(entity.entity_id, { volume_level: value / 100 })
                  }
                />
              </div>
            </>
          )}

          {/* Lock */}
          {domain === "lock" && (
            <div className="flex items-center justify-between">
              <Label>Verrouillé</Label>
              <Switch
                checked={currentState.state === "on"}
                onCheckedChange={(checked) =>
                  updateEntityState(entity.entity_id, { state: checked ? "on" : "off" })
                }
              />
            </div>
          )}

          {/* Generic fallback */}
          {!["light", "switch", "fan", "valve", "input_boolean", "cover", "climate", "media_player", "lock"].includes(domain) && (
            <div className="flex items-center justify-between">
              <Label>Activé</Label>
              <Switch
                checked={currentState.state === "on"}
                onCheckedChange={(checked) =>
                  updateEntityState(entity.entity_id, { state: checked ? "on" : "off" })
                }
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Conseil :</span> Une scène, c'est une « photo » de votre maison. 
          Définissez comment chaque appareil doit se comporter quand la scène est activée. 
          Utilisez « État actuel » pour capturer rapidement l'état actuel d'un appareil.
        </p>
      </div>

      <div className="mt-4 flex-1 max-h-[400px] overflow-y-auto bg-background">
        {/* By floor */}
        {Object.entries(groupedEntities.byFloor).map(([floorId, { floor, areas: floorAreas }]) => (
          <section key={floorId} className="mb-4">
            {/* En-tête d'étage sticky */}
            <header className="sticky top-0 z-20 w-full px-1 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground bg-background border-b border-border/30">
              {floor?.name || "Étage"}
            </header>

            {/* Liste des cartes appareils de cet étage */}
            <div className="space-y-3 px-1 pt-3 pb-1 bg-background">
              {floorAreas.map(({ area, entities: areaEntities }) => (
                <div key={area.area_id} className="space-y-2 bg-background">
                  <h6 className="text-sm font-medium text-muted-foreground ml-1">
                    {area.name}
                  </h6>
                  <div className="space-y-2 ml-1">
                    {areaEntities.map(renderEntityConfig)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Areas without floor */}
        {groupedEntities.noFloorAreas.length > 0 && (
          <section className="mb-4">
            {/* En-tête sticky */}
            <header className="sticky top-0 z-20 w-full px-1 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground bg-background border-b border-border/30">
              Autres pièces
            </header>

            <div className="space-y-3 px-1 pt-3 pb-1 bg-background">
              {groupedEntities.noFloorAreas.map(({ area, entities: areaEntities }) => (
                <div key={area.area_id} className="space-y-2 bg-background">
                  <h6 className="text-sm font-medium text-muted-foreground ml-1">
                    {area.name}
                  </h6>
                  <div className="space-y-2 ml-1">
                    {areaEntities.map(renderEntityConfig)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Entities without area */}
        {groupedEntities.noArea.length > 0 && (
          <section className="mb-4">
            {/* En-tête sticky */}
            <header className="sticky top-0 z-20 w-full px-1 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground bg-background border-b border-border/30">
              Sans pièce
            </header>

            <div className="space-y-2 px-1 pt-3 pb-1 bg-background">
              {groupedEntities.noArea.map(renderEntityConfig)}
            </div>
          </section>
        )}
      </div>

      {selectedEntities.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Aucun appareil sélectionné. Retournez à l'étape précédente pour en choisir.
        </p>
      )}
    </div>
  );
}
