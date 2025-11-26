import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { Fan } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supportsFeature, FAN_FEATURES } from "@/lib/entityUtils";
import { toast } from "sonner";
import { useHAStore } from "@/store/useHAStore";
import { cn } from "@/lib/utils";

interface FanTileProps {
  entity: HAEntity;
  onControl: (service: string, data?: any) => Promise<void>;
}

export function FanTile({ entity, onControl }: FanTileProps) {
  const realIsOn = entity.state === "on";
  const name = entity.attributes.friendly_name || entity.entity_id;
  const percentage = entity.attributes.percentage || 0;
  const presetMode = entity.attributes.preset_mode;
  const presetModes = entity.attributes.preset_modes || [];
  const pendingActions = useHAStore((state) => state.pendingActions);
  const triggerEntityToggle = useHAStore((state) => state.triggerEntityToggle);
  const pending = pendingActions[entity.entity_id];
  const isPending = !!(pending && !pending.cooldownUntil);
  const isInCooldown = !!(pending?.cooldownUntil && Date.now() < pending.cooldownUntil);
  
  const supportsSpeed = supportsFeature(entity, FAN_FEATURES.SUPPORT_SET_SPEED);
  const supportsPreset = supportsFeature(entity, FAN_FEATURES.SUPPORT_PRESET_MODE);
  
  // État optimiste local pour le toggle ON/OFF
  const [optimisticOn, setOptimisticOn] = useState(realIsOn);
  const [speed, setSpeed] = useState(percentage);
  
  // Resynchronisation avec l'état réel de HA (uniquement si pas d'action en cours)
  useEffect(() => {
    if (!isPending && !isInCooldown) {
      setOptimisticOn(realIsOn);
    }
  }, [realIsOn, isPending, isInCooldown]);
  
  useEffect(() => {
    setSpeed(percentage);
  }, [percentage]);
  
  const handleToggle = async (checked: boolean) => {
    // Bloquer si action en cours ou cooldown actif
    if (isPending || isInCooldown) {
      return;
    }

    // Update optimiste immédiat
    const previous = optimisticOn;
    setOptimisticOn(checked);

    await triggerEntityToggle(
      entity.entity_id,
      checked ? "on" : "off",
      async () => {
        await onControl(checked ? "turn_on" : "turn_off");
      },
      () => {
        // Rollback en cas de timeout
        setOptimisticOn(previous);
      }
    );
  };
  
  const handleSpeedCommit = async (value: number[]) => {
    const previous = speed;
    try {
      await onControl("set_percentage", { percentage: value[0] });
    } catch (error) {
      setSpeed(previous);
      toast.error("Impossible de régler la vitesse");
    }
  };
  
  const handlePresetChange = async (preset: string) => {
    try {
      await onControl("set_preset_mode", { preset_mode: preset });
    } catch (error) {
      toast.error("Impossible de changer le mode");
    }
  };
  
  const isOn = optimisticOn; // Utiliser l'état optimiste pour l'affichage
  
  return (
    <Card className={cn(
      "glass-card elevated-subtle elevated-active border-border/50 overflow-hidden transition-opacity",
      isPending && "opacity-70"
    )}>
      <div className="p-4 pt-10">
        <div className="mt-1 flex items-start gap-3 mb-4">
          <div className={`w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${
            isOn ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Fan className={`h-8 w-8 ${isOn ? 'animate-spin' : ''}`} />
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {isOn ? (supportsSpeed ? `${speed}%` : "Allumé") : "Éteint"}
            </p>
          </div>
          
          <Switch
            checked={isOn}
            onCheckedChange={handleToggle}
            className="scale-125"
          />
        </div>
        
        {isOn && (
          <div className="space-y-3 pt-2 border-t border-border/30">
            {supportsSpeed && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vitesse</span>
                  <span className="font-medium">{speed}%</span>
                </div>
                <Slider
                  value={[speed]}
                  onValueChange={(v) => setSpeed(v[0])}
                  onValueCommit={handleSpeedCommit}
                  min={0}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>
            )}
            
            {supportsPreset && presetModes.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Mode</span>
                <Select value={presetMode} onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presetModes.map((mode: string) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
