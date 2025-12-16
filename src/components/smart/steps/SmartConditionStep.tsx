import { useState, useMemo } from "react";
import {
  SmartWizardDraft,
  SmartCondition,
  ConditionGroup,
  ConditionType,
  CONDITION_TYPE_LABELS,
} from "@/types/smart";
import { useHAStore } from "@/store/useHAStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Info, GitBranch } from "lucide-react";
import * as LucideIcons from "lucide-react";

// Traduction des noms de capteurs anglais vers français
const SENSOR_TRANSLATIONS: Record<string, string> = {
  "temperature": "Température",
  "humidity": "Humidité",
  "pressure": "Pression",
  "wind speed": "Vitesse du vent",
  "wind direction": "Direction du vent",
  "battery": "Batterie",
  "power": "Puissance",
  "energy": "Énergie",
  "voltage": "Tension",
  "current": "Courant",
  "illuminance": "Luminosité",
  "brightness": "Luminosité",
  "motion": "Mouvement",
  "occupancy": "Occupation",
  "door": "Porte",
  "window": "Fenêtre",
  "weather": "Météo",
  "city weather": "Météo ville",
  "backup": "Sauvegarde",
  "latitude": "Latitude",
  "longitude": "Longitude",
  "next": "Prochain",
  "last": "Dernier",
  "scheduled": "Programmé",
  "automatic": "Automatique",
  "successful": "Réussi",
  "attempt": "Tentative",
};

function translateSensorName(name: string): string {
  let translated = name;
  // Remplacer les mots-clés anglais par leur traduction française
  for (const [en, fr] of Object.entries(SENSOR_TRANSLATIONS)) {
    const regex = new RegExp(en, "gi");
    translated = translated.replace(regex, fr);
  }
  return translated;
}

interface SmartConditionStepProps {
  draft: SmartWizardDraft;
  onUpdate: (updates: Partial<SmartWizardDraft>) => void;
}

export function SmartConditionStep({ draft, onUpdate }: SmartConditionStepProps) {
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<ConditionType | null>(null);

  const entities = useHAStore((s) => s.entities);

  // Filter entities for different condition types
  const stateEntities = useMemo(() => {
    const domains = ["light", "switch", "cover", "fan", "lock", "door", "binary_sensor", "input_boolean", "person"];
    return entities.filter((e) => domains.some((d) => e.entity_id.startsWith(`${d}.`)));
  }, [entities]);

  const numericEntities = useMemo(() => {
    const domains = ["sensor", "input_number"];
    return entities.filter((e) => {
      if (!domains.some((d) => e.entity_id.startsWith(`${d}.`))) return false;
      const state = parseFloat(e.state);
      return !isNaN(state) || e.attributes?.unit_of_measurement;
    });
  }, [entities]);

  const personEntities = useMemo(() => {
    return entities.filter((e) => e.entity_id.startsWith("person.") || e.entity_id.startsWith("device_tracker."));
  }, [entities]);

  const zones = useMemo(() => {
    return entities.filter((e) => e.entity_id.startsWith("zone."));
  }, [entities]);

  const addGroup = () => {
    const newGroup: ConditionGroup = {
      id: crypto.randomUUID(),
      operator: "and",
      conditions: [],
    };
    onUpdate({
      conditions: {
        ...draft.conditions,
        groups: [...draft.conditions.groups, newGroup],
      },
    });
  };

  const removeGroup = (groupId: string) => {
    onUpdate({
      conditions: {
        ...draft.conditions,
        groups: draft.conditions.groups.filter((g) => g.id !== groupId),
      },
    });
  };

  const updateGroup = (groupId: string, updates: Partial<ConditionGroup>) => {
    onUpdate({
      conditions: {
        ...draft.conditions,
        groups: draft.conditions.groups.map((g) =>
          g.id === groupId ? { ...g, ...updates } : g
        ),
      },
    });
  };

  const addConditionToGroup = (groupId: string, condition: SmartCondition) => {
    onUpdate({
      conditions: {
        ...draft.conditions,
        groups: draft.conditions.groups.map((g) =>
          g.id === groupId
            ? { ...g, conditions: [...g.conditions, condition] }
            : g
        ),
      },
    });
    setAddingToGroup(null);
    setAddingType(null);
  };

  const removeConditionFromGroup = (groupId: string, conditionIndex: number) => {
    onUpdate({
      conditions: {
        ...draft.conditions,
        groups: draft.conditions.groups.map((g) =>
          g.id === groupId
            ? { ...g, conditions: g.conditions.filter((_, i) => i !== conditionIndex) }
            : g
        ),
      },
    });
  };

  const toggleRootOperator = () => {
    onUpdate({
      conditions: {
        ...draft.conditions,
        rootOperator: draft.conditions.rootOperator === "and" ? "or" : "and",
      },
    });
  };

  const renderConditionForm = (groupId: string, type: ConditionType) => {
    const onAdd = (condition: SmartCondition) => addConditionToGroup(groupId, condition);
    const onCancel = () => {
      setAddingToGroup(null);
      setAddingType(null);
    };

    switch (type) {
      case "state":
        return <StateConditionForm entities={stateEntities} onAdd={onAdd} onCancel={onCancel} />;
      case "time":
        return <TimeConditionForm onAdd={onAdd} onCancel={onCancel} />;
      case "sun":
        return <SunConditionForm onAdd={onAdd} onCancel={onCancel} />;
      case "numeric":
        return <NumericConditionForm entities={numericEntities} onAdd={onAdd} onCancel={onCancel} />;
      case "zone":
        return <ZoneConditionForm persons={personEntities} zones={zones} onAdd={onAdd} onCancel={onCancel} />;
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
            <p className="text-sm font-medium">Les conditions sont optionnelles</p>
            <p className="text-xs text-muted-foreground mt-1">
              Elles permettent de ne lancer l'automatisation que si certaines conditions sont remplies.
              Par exemple : "seulement si quelqu'un est à la maison" ou "seulement la nuit".
              <br /><br />
              <strong>Logique avancée :</strong> Créez plusieurs groupes de conditions. 
              Chaque groupe peut utiliser ET (toutes vraies) ou OU (au moins une vraie).
              Les groupes sont combinés entre eux avec ET ou OU.
            </p>
          </div>
        </div>
      </div>

      {/* Root operator toggle (if multiple groups) */}
      {draft.conditions.groups.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="text-sm text-muted-foreground">Combiner les groupes avec</span>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleRootOperator}
            className="gap-2"
          >
            <GitBranch className="w-4 h-4" />
            {draft.conditions.rootOperator === "and" ? "ET" : "OU"}
          </Button>
        </div>
      )}

      {/* Condition groups */}
      {draft.conditions.groups.map((group, groupIndex) => (
        <Card key={group.id} className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Groupe {groupIndex + 1}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateGroup(group.id, { operator: group.operator === "and" ? "or" : "and" })
                }
                className="h-7 text-xs border border-border"
              >
                <GitBranch className="w-3 h-3 mr-1" />
                {group.operator === "and" ? "ET" : "OU"}
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeGroup(group.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>

          {/* Conditions in group */}
          {group.conditions.length > 0 && (
            <div className="space-y-2">
              {group.conditions.map((condition, condIndex) => (
                <ConditionCard
                  key={condIndex}
                  condition={condition}
                  entities={entities}
                  onRemove={() => removeConditionFromGroup(group.id, condIndex)}
                />
              ))}
            </div>
          )}

          {/* Add condition to group */}
          {addingToGroup === group.id && addingType ? (
            <div className="pt-2 border-t">
              {renderConditionForm(group.id, addingType)}
            </div>
          ) : addingToGroup === group.id ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t">
              {(Object.keys(CONDITION_TYPE_LABELS) as ConditionType[])
                .filter((t) => t !== "template") // Hide template for simplicity
                .map((type) => {
                  const config = CONDITION_TYPE_LABELS[type];
                  const IconComp = (LucideIcons as any)[config.icon] || GitBranch;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddingType(type)}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background hover:bg-muted transition-colors text-left text-sm"
                    >
                      <IconComp className="w-4 h-4 text-primary" />
                      <span className="truncate">{config.label}</span>
                    </button>
                  );
                })}
              <Button variant="ghost" size="sm" onClick={() => setAddingToGroup(null)}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingToGroup(group.id)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une condition
            </Button>
          )}
        </Card>
      ))}

      {/* Add new group */}
      <Button variant="outline" onClick={addGroup} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Ajouter un groupe de conditions
      </Button>

      {draft.conditions.groups.length === 0 && (
        <p className="text-sm text-center text-muted-foreground">
          Aucune condition configurée. L'automatisation s'exécutera à chaque déclenchement.
        </p>
      )}
    </div>
  );
}

// ============ Condition Card ============

interface ConditionCardProps {
  condition: SmartCondition;
  entities: any[];
  onRemove: () => void;
}

function ConditionCard({ condition, entities, onRemove }: ConditionCardProps) {
  const config = CONDITION_TYPE_LABELS[condition.type];
  const IconComp = (LucideIcons as any)[config.icon] || GitBranch;

  const getDescription = () => {
    switch (condition.type) {
      case "state": {
        const entity = entities.find((e) => e.entity_id === condition.entityId);
        const name = entity?.attributes?.friendly_name || condition.entityId;
        return `${name} = "${condition.state}"`;
      }
      case "time": {
        const parts = [];
        if (condition.after) parts.push(`après ${condition.after}`);
        if (condition.before) parts.push(`avant ${condition.before}`);
        if (condition.weekday && condition.weekday.length < 7) {
          const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
          parts.push(condition.weekday.map((d) => days[d]).join(", "));
        }
        return parts.join(", ") || "Plage horaire";
      }
      case "sun": {
        const parts = [];
        if (condition.after) {
          const label = condition.after === "sunrise" ? "lever" : "coucher";
          parts.push(`après ${label}`);
        }
        if (condition.before) {
          const label = condition.before === "sunrise" ? "lever" : "coucher";
          parts.push(`avant ${label}`);
        }
        return parts.join(", ") || "Position du soleil";
      }
      case "numeric": {
        const entity = entities.find((e) => e.entity_id === condition.entityId);
        const name = entity?.attributes?.friendly_name || condition.entityId;
        const parts = [];
        if (condition.above !== undefined) parts.push(`> ${condition.above}`);
        if (condition.below !== undefined) parts.push(`< ${condition.below}`);
        return `${name} ${parts.join(" et ")}`;
      }
      case "zone": {
        const entity = entities.find((e) => e.entity_id === condition.entityId);
        const zone = entities.find((e) => e.entity_id === condition.zone);
        const personName = entity?.attributes?.friendly_name || condition.entityId;
        const zoneName = zone?.attributes?.friendly_name || condition.zone;
        return `${personName} dans ${zoneName}`;
      }
      default:
        return config.label;
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <IconComp className="w-4 h-4 text-primary" />
        <span className="text-sm">{getDescription()}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
        <Trash2 className="w-3 h-3 text-destructive" />
      </Button>
    </div>
  );
}

// ============ Condition Forms ============

interface ConditionFormProps {
  onAdd: (condition: SmartCondition) => void;
  onCancel: () => void;
}

function StateConditionForm({ entities, onAdd, onCancel }: ConditionFormProps & { entities: any[] }) {
  const [entityId, setEntityId] = useState("");
  const [state, setState] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Appareil</Label>
        <Select value={entityId} onValueChange={setEntityId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
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
        <Label>État requis</Label>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="on">Allumé (on)</SelectItem>
            <SelectItem value="off">Éteint (off)</SelectItem>
            <SelectItem value="home">À la maison (home)</SelectItem>
            <SelectItem value="not_home">Absent (not_home)</SelectItem>
            <SelectItem value="open">Ouvert</SelectItem>
            <SelectItem value="closed">Fermé</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onAdd({ type: "state", entityId, state })} disabled={!entityId || !state}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}

function TimeConditionForm({ onAdd, onCancel }: ConditionFormProps) {
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [weekday, setWeekday] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const toggleDay = (day: number) => {
    setWeekday((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Après</Label>
          <Input type="time" value={after} onChange={(e) => setAfter(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Avant</Label>
          <Input type="time" value={before} onChange={(e) => setBefore(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Jours de la semaine</Label>
        <div className="flex flex-wrap gap-2">
          {days.map((day, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={cn(
                "px-3 py-1 rounded-full text-sm border transition-colors",
                weekday.includes(i)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          onClick={() =>
            onAdd({
              type: "time",
              after: after || undefined,
              before: before || undefined,
              weekday: weekday.length < 7 ? weekday : undefined,
            })
          }
          disabled={!after && !before && weekday.length === 7}
        >
          Ajouter
        </Button>
      </div>
    </div>
  );
}

function SunConditionForm({ onAdd, onCancel }: ConditionFormProps) {
  const [after, setAfter] = useState<"sunrise" | "sunset" | "none">("none");
  const [before, setBefore] = useState<"sunrise" | "sunset" | "none">("none");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Après</Label>
        <Select value={after} onValueChange={(v) => setAfter(v as "sunrise" | "sunset" | "none")}>
          <SelectTrigger>
            <SelectValue placeholder="Aucun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            <SelectItem value="sunrise">Lever du soleil</SelectItem>
            <SelectItem value="sunset">Coucher du soleil</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Avant</Label>
        <Select value={before} onValueChange={(v) => setBefore(v as "sunrise" | "sunset" | "none")}>
          <SelectTrigger>
            <SelectValue placeholder="Aucun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            <SelectItem value="sunrise">Lever du soleil</SelectItem>
            <SelectItem value="sunset">Coucher du soleil</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          onClick={() =>
            onAdd({
              type: "sun",
              after: after !== "none" ? after : undefined,
              before: before !== "none" ? before : undefined,
            })
          }
          disabled={after === "none" && before === "none"}
        >
          Ajouter
        </Button>
      </div>
    </div>
  );
}

function NumericConditionForm({ entities, onAdd, onCancel }: ConditionFormProps & { entities: any[] }) {
  const [entityId, setEntityId] = useState("");
  const [above, setAbove] = useState("");
  const [below, setBelow] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Capteur</Label>
        <Select value={entityId} onValueChange={setEntityId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {entities.map((e) => (
              <SelectItem key={e.entity_id} value={e.entity_id}>
                {translateSensorName(e.attributes?.friendly_name || e.entity_id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Au-dessus de</Label>
          <Input type="number" value={above} onChange={(e) => setAbove(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>En-dessous de</Label>
          <Input type="number" value={below} onChange={(e) => setBelow(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          onClick={() =>
            onAdd({
              type: "numeric",
              entityId,
              above: above ? parseFloat(above) : undefined,
              below: below ? parseFloat(below) : undefined,
            })
          }
          disabled={!entityId || (!above && !below)}
        >
          Ajouter
        </Button>
      </div>
    </div>
  );
}

function ZoneConditionForm({ persons, zones, onAdd, onCancel }: ConditionFormProps & { persons: any[]; zones: any[] }) {
  const [entityId, setEntityId] = useState("");
  const [zone, setZone] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Personne</Label>
        <Select value={entityId} onValueChange={setEntityId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
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
            <SelectValue placeholder="Sélectionner" />
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
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onAdd({ type: "zone", entityId, zone })} disabled={!entityId || !zone}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}
