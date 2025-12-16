import { useState, useMemo } from "react";
import { SmartWizardDraft, SmartAction } from "@/types/smart";
import { useHAStore } from "@/store/useHAStore";
import { useSceneStore } from "@/store/useSceneStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Info, Play, Clock, Lightbulb, Sparkles, Power } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { isControllableEntity } from "@/lib/entityUtils";

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

export function SmartActionStep({ draft, onUpdate }: SmartActionStepProps) {
  const [addingType, setAddingType] = useState<ActionTypeOption | null>(null);

  const entities = useHAStore((s) => s.entities);
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

  const updateAction = (index: number, updates: Partial<SmartAction>) => {
    onUpdate({
      actions: draft.actions.map((a, i) =>
        i === index ? { ...a, ...updates } : a
      ),
    });
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
    <div className="space-y-6">
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
  entities: any[];
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
        return `Service: ${action.service}`;
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
            <button onClick={onMoveUp} className="text-muted-foreground hover:text-foreground">
              ▲
            </button>
          )}
          {index < total - 1 && (
            <button onClick={onMoveDown} className="text-muted-foreground hover:text-foreground">
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

// ============ Action Forms ============

interface ActionFormProps {
  onAdd: (action: SmartAction) => void;
  onCancel: () => void;
}

function DeviceActionForm({ entities, onAdd, onCancel }: ActionFormProps & { entities: any[] }) {
  const [entityId, setEntityId] = useState("");
  const [state, setState] = useState<"on" | "off">("on");
  const [brightness, setBrightness] = useState(100);

  const selectedEntity = entities.find((e) => e.entity_id === entityId);
  const isLight = entityId.startsWith("light.");
  const isCover = entityId.startsWith("cover.");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Appareil</Label>
        <Select value={entityId} onValueChange={setEntityId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un appareil" />
          </SelectTrigger>
          <SelectContent>
            {entities.map((e) => (
              <SelectItem key={e.entity_id} value={e.entity_id}>
                {e.attributes?.friendly_name || e.entity_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Action</Label>
        <Select value={state} onValueChange={(v) => setState(v as "on" | "off")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="on">{isCover ? "Ouvrir" : "Allumer"}</SelectItem>
            <SelectItem value="off">{isCover ? "Fermer" : "Éteindre"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLight && state === "on" && (
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

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          onClick={() => {
            const service = state === "on"
              ? (isCover ? "cover.open_cover" : isLight ? "light.turn_on" : "homeassistant.turn_on")
              : (isCover ? "cover.close_cover" : isLight ? "light.turn_off" : "homeassistant.turn_off");
            
            onAdd({
              type: "service",
              service,
              entityId,
              data: isLight && state === "on" ? { brightness_pct: brightness } : undefined,
            });
          }}
          disabled={!entityId}
        >
          Ajouter
        </Button>
      </div>
    </div>
  );
}

function SceneActionForm({ scenes, onAdd, onCancel }: ActionFormProps & { scenes: any[] }) {
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

function DelayActionForm({ onAdd, onCancel }: ActionFormProps) {
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
