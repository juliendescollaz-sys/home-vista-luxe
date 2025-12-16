import { useState, useMemo } from "react";
import { SmartWizardDraft, SmartTrigger, TriggerType, TRIGGER_TYPE_LABELS } from "@/types/smart";
import { useHAStore } from "@/store/useHAStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Clock, Sunrise, Gauge, MapPin, Power, Info } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface SmartTriggerStepProps {
  draft: SmartWizardDraft;
  onUpdate: (updates: Partial<SmartWizardDraft>) => void;
}

export function SmartTriggerStep({ draft, onUpdate }: SmartTriggerStepProps) {
  const [addingType, setAddingType] = useState<TriggerType | null>(null);

  const entities = useHAStore((s) => s.entities);
  const areas = useHAStore((s) => s.areas);

  // Filter entities for different trigger types
  const stateEntities = useMemo(() => {
    const domains = ["light", "switch", "cover", "fan", "lock", "door", "binary_sensor", "input_boolean"];
    return entities.filter(e => domains.some(d => e.entity_id.startsWith(`${d}.`)));
  }, [entities]);

  const numericEntities = useMemo(() => {
    const domains = ["sensor", "input_number"];
    return entities.filter(e => {
      if (!domains.some(d => e.entity_id.startsWith(`${d}.`))) return false;
      // Must have a numeric state or unit
      const state = parseFloat(e.state);
      return !isNaN(state) || e.attributes?.unit_of_measurement;
    });
  }, [entities]);

  const personEntities = useMemo(() => {
    return entities.filter(e => e.entity_id.startsWith("person.") || e.entity_id.startsWith("device_tracker."));
  }, [entities]);

  const zones = useMemo(() => {
    return entities.filter(e => e.entity_id.startsWith("zone."));
  }, [entities]);

  const addTrigger = (trigger: SmartTrigger) => {
    onUpdate({ triggers: [...draft.triggers, trigger] });
    setAddingType(null);
  };

  const removeTrigger = (index: number) => {
    onUpdate({ triggers: draft.triggers.filter((_, i) => i !== index) });
  };

  const updateTrigger = (index: number, updates: Partial<SmartTrigger>) => {
    onUpdate({
      triggers: draft.triggers.map((t, i) =>
        i === index ? { ...t, ...updates } as SmartTrigger : t
      ),
    });
  };

  const renderTriggerForm = (type: TriggerType) => {
    switch (type) {
      case "state":
        return (
          <StateTrigggerForm
            entities={stateEntities}
            onAdd={(t) => addTrigger(t)}
            onCancel={() => setAddingType(null)}
          />
        );
      case "time":
        return (
          <TimeTriggerForm
            onAdd={(t) => addTrigger(t)}
            onCancel={() => setAddingType(null)}
          />
        );
      case "sun":
        return (
          <SunTriggerForm
            onAdd={(t) => addTrigger(t)}
            onCancel={() => setAddingType(null)}
          />
        );
      case "numeric":
        return (
          <NumericTriggerForm
            entities={numericEntities}
            onAdd={(t) => addTrigger(t)}
            onCancel={() => setAddingType(null)}
          />
        );
      case "zone":
        return (
          <ZoneTriggerForm
            persons={personEntities}
            zones={zones}
            onAdd={(t) => addTrigger(t)}
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
            <p className="text-sm font-medium">Qu'est-ce qu'un déclencheur ?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Le déclencheur est l'événement qui lance l'automatisation. Vous pouvez ajouter plusieurs déclencheurs : 
              l'automatisation s'exécutera dès que l'un d'eux se produit.
            </p>
          </div>
        </div>
      </div>

      {/* Existing triggers */}
      {draft.triggers.length > 0 && (
        <div className="space-y-3">
          <Label>Déclencheurs configurés ({draft.triggers.length})</Label>
          {draft.triggers.map((trigger, index) => (
            <TriggerCard
              key={index}
              trigger={trigger}
              entities={entities}
              onRemove={() => removeTrigger(index)}
              onUpdate={(updates) => updateTrigger(index, updates)}
            />
          ))}
        </div>
      )}

      {/* Add trigger */}
      {addingType ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            {(() => {
              const IconComp = (LucideIcons as any)[TRIGGER_TYPE_LABELS[addingType].icon] || Power;
              return <IconComp className="w-5 h-5 text-primary" />;
            })()}
            <span className="font-medium">{TRIGGER_TYPE_LABELS[addingType].label}</span>
          </div>
          {renderTriggerForm(addingType)}
        </Card>
      ) : (
        <div className="space-y-3">
          <Label>Ajouter un déclencheur</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(TRIGGER_TYPE_LABELS).map(([type, config]) => {
              const IconComp = (LucideIcons as any)[config.icon] || Power;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAddingType(type as TriggerType)}
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
    </div>
  );
}

// ============ Trigger Card ============

interface TriggerCardProps {
  trigger: SmartTrigger;
  entities: any[];
  onRemove: () => void;
  onUpdate: (updates: Partial<SmartTrigger>) => void;
}

function TriggerCard({ trigger, entities, onRemove }: TriggerCardProps) {
  const config = TRIGGER_TYPE_LABELS[trigger.type];
  const IconComp = (LucideIcons as any)[config.icon] || Power;

  const getDescription = () => {
    switch (trigger.type) {
      case "state": {
        const entity = entities.find(e => e.entity_id === trigger.entityId);
        const name = entity?.attributes?.friendly_name || trigger.entityId;
        if (trigger.to) return `${name} passe à "${trigger.to}"`;
        return `${name} change d'état`;
      }
      case "time":
        return `À ${trigger.at}`;
      case "sun":
        const label = trigger.event === "sunrise" ? "Lever du soleil" : "Coucher du soleil";
        if (trigger.offset) {
          const sign = trigger.offset >= 0 ? "+" : "";
          return `${label} (${sign}${trigger.offset} min)`;
        }
        return label;
      case "numeric": {
        const entity = entities.find(e => e.entity_id === trigger.entityId);
        const name = entity?.attributes?.friendly_name || trigger.entityId;
        const parts = [];
        if (trigger.above !== undefined) parts.push(`> ${trigger.above}`);
        if (trigger.below !== undefined) parts.push(`< ${trigger.below}`);
        return `${name} ${parts.join(" et ")}`;
      }
      case "zone": {
        const entity = entities.find(e => e.entity_id === trigger.entityId);
        const zone = entities.find(e => e.entity_id === trigger.zone);
        const personName = entity?.attributes?.friendly_name || trigger.entityId;
        const zoneName = zone?.attributes?.friendly_name || trigger.zone;
        return `${personName} ${trigger.event === "enter" ? "entre dans" : "quitte"} ${zoneName}`;
      }
      default:
        return config.label;
    }
  };

  return (
    <Card className="p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <IconComp className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{getDescription()}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </Card>
  );
}

// ============ Trigger Forms ============

interface TriggerFormProps<T extends SmartTrigger> {
  onAdd: (trigger: T) => void;
  onCancel: () => void;
}

function StateTrigggerForm({ entities, onAdd, onCancel }: TriggerFormProps<any> & { entities: any[] }) {
  const [entityId, setEntityId] = useState("");
  const [to, setTo] = useState("");

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
        <Label>Nouvel état (optionnel)</Label>
        <Select value={to} onValueChange={setTo}>
          <SelectTrigger>
            <SelectValue placeholder="Tout changement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tout changement</SelectItem>
            <SelectItem value="on">Allumé (on)</SelectItem>
            <SelectItem value="off">Éteint (off)</SelectItem>
            <SelectItem value="open">Ouvert</SelectItem>
            <SelectItem value="closed">Fermé</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onAdd({ type: "state", entityId, to: to || undefined })} disabled={!entityId}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}

function TimeTriggerForm({ onAdd, onCancel }: TriggerFormProps<any>) {
  const [time, setTime] = useState("08:00");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Heure</Label>
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onAdd({ type: "time", at: time })}>Ajouter</Button>
      </div>
    </div>
  );
}

function SunTriggerForm({ onAdd, onCancel }: TriggerFormProps<any>) {
  const [event, setEvent] = useState<"sunrise" | "sunset">("sunset");
  const [offset, setOffset] = useState(0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Événement</Label>
        <Select value={event} onValueChange={(v) => setEvent(v as "sunrise" | "sunset")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sunrise">Lever du soleil</SelectItem>
            <SelectItem value="sunset">Coucher du soleil</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Décalage (minutes)</Label>
        <Input
          type="number"
          value={offset}
          onChange={(e) => setOffset(parseInt(e.target.value) || 0)}
          placeholder="0 = au moment exact, -30 = 30 min avant, +30 = 30 min après"
        />
        <p className="text-xs text-muted-foreground">
          Négatif = avant, Positif = après
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onAdd({ type: "sun", event, offset: offset || undefined })}>Ajouter</Button>
      </div>
    </div>
  );
}

function NumericTriggerForm({ entities, onAdd, onCancel }: TriggerFormProps<any> & { entities: any[] }) {
  const [entityId, setEntityId] = useState("");
  const [above, setAbove] = useState<string>("");
  const [below, setBelow] = useState<string>("");

  const selectedEntity = entities.find(e => e.entity_id === entityId);
  const unit = selectedEntity?.attributes?.unit_of_measurement || "";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Capteur</Label>
        <Select value={entityId} onValueChange={setEntityId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un capteur" />
          </SelectTrigger>
          <SelectContent>
            {entities.map((e) => (
              <SelectItem key={e.entity_id} value={e.entity_id}>
                {e.attributes?.friendly_name || e.entity_id}
                {e.attributes?.unit_of_measurement && ` (${e.attributes.unit_of_measurement})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Au-dessus de {unit}</Label>
          <Input
            type="number"
            value={above}
            onChange={(e) => setAbove(e.target.value)}
            placeholder="Ex: 25"
          />
        </div>
        <div className="space-y-2">
          <Label>En-dessous de {unit}</Label>
          <Input
            type="number"
            value={below}
            onChange={(e) => setBelow(e.target.value)}
            placeholder="Ex: 18"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          onClick={() => onAdd({
            type: "numeric",
            entityId,
            above: above ? parseFloat(above) : undefined,
            below: below ? parseFloat(below) : undefined,
          })}
          disabled={!entityId || (!above && !below)}
        >
          Ajouter
        </Button>
      </div>
    </div>
  );
}

function ZoneTriggerForm({ persons, zones, onAdd, onCancel }: TriggerFormProps<any> & { persons: any[]; zones: any[] }) {
  const [entityId, setEntityId] = useState("");
  const [zone, setZone] = useState("");
  const [event, setEvent] = useState<"enter" | "leave">("enter");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Personne</Label>
        <Select value={entityId} onValueChange={setEntityId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une personne" />
          </SelectTrigger>
          <SelectContent>
            {persons.map((e) => (
              <SelectItem key={e.entity_id} value={e.entity_id}>
                {e.attributes?.friendly_name || e.entity_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Zone</Label>
        <Select value={zone} onValueChange={setZone}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une zone" />
          </SelectTrigger>
          <SelectContent>
            {zones.map((z) => (
              <SelectItem key={z.entity_id} value={z.entity_id}>
                {z.attributes?.friendly_name || z.entity_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Événement</Label>
        <Select value={event} onValueChange={(v) => setEvent(v as "enter" | "leave")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enter">Entre dans la zone</SelectItem>
            <SelectItem value="leave">Quitte la zone</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onAdd({ type: "zone", entityId, zone, event })} disabled={!entityId || !zone}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}
