import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { Thermometer, Wind, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supportsFeature, CLIMATE_FEATURES } from "@/lib/entityUtils";
import { toast } from "sonner";

interface ClimateTileProps {
  entity: HAEntity;
  onControl: (service: string, data?: any) => Promise<void>;
}

export function ClimateTile({ entity, onControl }: ClimateTileProps) {
  const name = entity.attributes.friendly_name || entity.entity_id;
  const currentTemp = entity.attributes.current_temperature;
  const targetTemp = entity.attributes.temperature;
  const hvacMode = entity.state;
  const hvacModes = entity.attributes.hvac_modes || [];
  
  const supportsTarget = supportsFeature(entity, CLIMATE_FEATURES.SUPPORT_TARGET_TEMPERATURE);
  const supportsFanMode = supportsFeature(entity, CLIMATE_FEATURES.SUPPORT_FAN_MODE);
  
  const [temperature, setTemperature] = useState(targetTemp || 20);
  
  useEffect(() => {
    setTemperature(targetTemp || 20);
  }, [targetTemp]);
  
  const handleModeChange = async (mode: string) => {
    try {
      await onControl("set_hvac_mode", { hvac_mode: mode });
      toast.success("Mode changé");
    } catch (error) {
      toast.error("Erreur");
    }
  };
  
  const handleTempCommit = async (value: number[]) => {
    try {
      await onControl("set_temperature", { temperature: value[0] });
    } catch (error) {
      toast.error("Erreur");
    }
  };
  
  const translateMode = (mode: string) => {
    const translations: Record<string, string> = {
      off: "Arrêt",
      heat: "Chauffage",
      cool: "Climatisation",
      heat_cool: "Auto",
      auto: "Auto",
      dry: "Déshumidification",
      fan_only: "Ventilation",
    };
    return translations[mode] || mode;
  };
  
  return (
    <Card className="glass-card elevated-subtle elevated-active border-border/50 overflow-hidden">
      <div className="p-4 pt-10">
        {/* Header */}
        <div className="mt-1 flex items-start gap-3 mb-4">
          <div className={`w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${
            hvacMode !== "off" ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Thermometer className="h-8 w-8" />
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {currentTemp ? `${Math.round(currentTemp)}°C` : "—"}
              {targetTemp && ` → ${Math.round(targetTemp)}°C`}
            </p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="space-y-3 pt-2 border-t border-border/30">
          {/* Mode selector */}
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Mode</span>
            <Select value={hvacMode} onValueChange={handleModeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hvacModes.map((mode: string) => (
                  <SelectItem key={mode} value={mode}>
                    {translateMode(mode)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Temperature slider */}
          {supportsTarget && hvacMode !== "off" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Température cible</span>
                <span className="font-medium">{temperature}°C</span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={(v) => setTemperature(v[0])}
                onValueCommit={handleTempCommit}
                min={entity.attributes.min_temp || 10}
                max={entity.attributes.max_temp || 30}
                step={0.5}
                className="py-1"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
