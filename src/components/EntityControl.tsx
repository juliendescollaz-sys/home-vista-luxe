import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect, memo } from "react";

interface EntityControlProps {
  entity: HAEntity;
  client: any;
  mediaPlayerName: string;
}

const EntityControl = memo(({ entity, client, mediaPlayerName }: EntityControlProps) => {
  const [localValue, setLocalValue] = useState<number>(0);
  const domain = entity.entity_id.split(".")[0];

  // Nettoyer le nom en retirant le nom de la pièce
  const cleanName = entity.attributes.friendly_name?.replace(mediaPlayerName, "").trim() || entity.attributes.friendly_name;

  useEffect(() => {
    // Initialiser la valeur pour les sliders de type number
    if (domain === "number" && entity.state) {
      const numValue = parseFloat(entity.state);
      if (!isNaN(numValue)) {
        setLocalValue(numValue);
      }
    }
  }, [entity.state, domain]);

  const callEntityService = async (service: string, data?: any) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }

    try {
      await client.callService(domain, service, data, { entity_id: entity.entity_id });
      // Pas de toast de succès - feedback visuel direct
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      toast.error("Erreur de connexion");
    }
  };

  const handleSwitchToggle = (checked: boolean) => {
    callEntityService(checked ? "turn_on" : "turn_off");
  };

  const handleSelectChange = (value: string) => {
    callEntityService("select_option", { option: value });
  };

  const handleNumberChange = (value: number[]) => {
    setLocalValue(value[0]);
  };

  const handleNumberChangeEnd = (value: number[]) => {
    callEntityService("set_value", { value: value[0] });
  };

  const handleButtonPress = () => {
    callEntityService("press");
  };

  // Switch (toggle on/off)
  if (domain === "switch") {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">{cleanName}</Label>
          <Switch
            checked={entity.state === "on"}
            onCheckedChange={handleSwitchToggle}
          />
        </div>
      </Card>
    );
  }

  // Select (dropdown)
  if (domain === "select") {
    const options = entity.attributes.options || [];
    return (
      <Card className="p-4">
        <div className="space-y-2">
          <Label className="text-base">{cleanName}</Label>
          <Select value={entity.state} onValueChange={handleSelectChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>
    );
  }

  // Number (slider)
  if (domain === "number") {
    const min = entity.attributes.min ?? 0;
    const max = entity.attributes.max ?? 100;
    const step = entity.attributes.step ?? 1;
    
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">{cleanName}</Label>
            <span className="text-sm font-medium">{localValue}</span>
          </div>
          <Slider
            value={[localValue]}
            onValueChange={handleNumberChange}
            onValueCommit={handleNumberChangeEnd}
            min={min}
            max={max}
            step={step}
          />
        </div>
      </Card>
    );
  }

  // Button (press action)
  if (domain === "button") {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">{cleanName}</Label>
          <Button onClick={handleButtonPress} size="sm">
            Activer
          </Button>
        </div>
      </Card>
    );
  }

  // Sensor ou autre (read-only)
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">{cleanName}</Label>
        <div className="text-right">
          <p className="text-sm font-medium">
            {entity.state} {entity.attributes.unit_of_measurement || ""}
          </p>
        </div>
      </div>
    </Card>
  );
});

EntityControl.displayName = "EntityControl";

export default EntityControl;
