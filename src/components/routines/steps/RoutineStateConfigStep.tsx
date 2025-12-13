import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoutineWizardDraft, RoutineAction } from "@/types/routines";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import { Lightbulb, Power, Blinds, ThermometerSun, Package } from "lucide-react";

interface RoutineStateConfigStepProps {
  draft: RoutineWizardDraft;
  onUpdate: (updates: Partial<RoutineWizardDraft>) => void;
}

export function RoutineStateConfigStep({ draft, onUpdate }: RoutineStateConfigStepProps) {
  const entities = useHAStore((s) => s.entities);
  const groups = useGroupStore((s) => s.groups);

  // Filter items that need state config (devices and groups, not scenes)
  const configurableItems = useMemo(() => {
    return draft.selectedItems.filter((item) => item.type === "device" || item.type === "group");
  }, [draft.selectedItems]);

  const updateItemState = (index: number, updates: Partial<RoutineAction>) => {
    const itemIndex = draft.selectedItems.findIndex(
      (item) =>
        item.type === configurableItems[index].type && item.id === configurableItems[index].id
    );

    if (itemIndex === -1) return;

    const newItems = [...draft.selectedItems];
    newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
    onUpdate({ selectedItems: newItems });
  };

  const updateDeviceTargetState = (
    index: number,
    stateUpdates: Partial<RoutineAction["targetState"]>
  ) => {
    const item = configurableItems[index];
    const currentState = item.targetState || {};
    updateItemState(index, {
      targetState: { ...currentState, ...stateUpdates },
    });
  };

  const renderDeviceConfig = (item: RoutineAction, index: number) => {
    const entity = entities.find((e) => e.entity_id === item.id);
    if (!entity) return null;

    const domain = item.id.split(".")[0];
    const friendlyName = entity.attributes.friendly_name || item.id;
    const targetState = item.targetState || { state: "on" };
    const isOn = targetState.state !== "off";

    const getIcon = () => {
      switch (domain) {
        case "light":
          return <Lightbulb className="h-5 w-5" />;
        case "cover":
          return <Blinds className="h-5 w-5" />;
        case "climate":
          return <ThermometerSun className="h-5 w-5" />;
        default:
          return <Power className="h-5 w-5" />;
      }
    };

    return (
      <div key={item.id} className="p-4 rounded-lg border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {getIcon()}
            </div>
            <div>
              <p className="font-medium">{friendlyName}</p>
              <p className="text-xs text-muted-foreground">{domain}</p>
            </div>
          </div>
          <Switch
            checked={isOn}
            onCheckedChange={(checked) =>
              updateDeviceTargetState(index, { state: checked ? "on" : "off" })
            }
          />
        </div>

        {isOn && domain === "light" && (
          <div className="space-y-3 pl-13">
            {entity.attributes.brightness !== undefined && (
              <div className="space-y-2">
                <Label className="text-sm">Luminosité: {Math.round(((targetState.brightness || 255) / 255) * 100)}%</Label>
                <Slider
                  value={[targetState.brightness || 255]}
                  max={255}
                  step={1}
                  onValueChange={([v]) => updateDeviceTargetState(index, { brightness: v })}
                />
              </div>
            )}
          </div>
        )}

        {isOn && domain === "cover" && (
          <div className="space-y-3 pl-13">
            <div className="space-y-2">
              <Label className="text-sm">Position: {targetState.position || 100}%</Label>
              <Slider
                value={[targetState.position || 100]}
                max={100}
                step={1}
                onValueChange={([v]) => updateDeviceTargetState(index, { position: v })}
              />
            </div>
          </div>
        )}

        {isOn && domain === "climate" && (
          <div className="space-y-3 pl-13">
            <div className="space-y-2">
              <Label className="text-sm">Mode</Label>
              <Select
                value={targetState.hvac_mode || "heat"}
                onValueChange={(v) => updateDeviceTargetState(index, { hvac_mode: v })}
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
            {targetState.hvac_mode !== "off" && (
              <div className="space-y-2">
                <Label className="text-sm">Température: {targetState.temperature || 20}°C</Label>
                <Slider
                  value={[targetState.temperature || 20]}
                  min={15}
                  max={30}
                  step={0.5}
                  onValueChange={([v]) => updateDeviceTargetState(index, { temperature: v })}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderGroupConfig = (item: RoutineAction, index: number) => {
    const group = groups.find((g) => g.id === item.id);
    if (!group) return null;

    const isOn = item.groupState !== "off";

    return (
      <div key={item.id} className="p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{group.name}</p>
              <p className="text-xs text-muted-foreground">
                Groupe • {group.entityIds.length} appareil{group.entityIds.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Switch
            checked={isOn}
            onCheckedChange={(checked) =>
              updateItemState(index, { groupState: checked ? "on" : "off" })
            }
          />
        </div>
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configurez l'état cible de chaque appareil et groupe lorsque la routine s'exécutera.
      </p>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {configurableItems.map((item, index) =>
          item.type === "device"
            ? renderDeviceConfig(item, index)
            : renderGroupConfig(item, index)
        )}
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Conseil :</span> Les scènes sélectionnées s'activeront 
          automatiquement avec leur configuration enregistrée.
        </p>
      </div>
    </div>
  );
}
