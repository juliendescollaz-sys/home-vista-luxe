import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { Lightbulb, Palette, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supportsFeature, LIGHT_FEATURES } from "@/lib/entityUtils";
import { toast } from "sonner";
import { useHAStore } from "@/store/useHAStore";
import { cn } from "@/lib/utils";

interface LightTileProps {
  entity: HAEntity;
  onControl: (service: string, data?: any) => Promise<void>;
}

export function LightTile({ entity, onControl }: LightTileProps) {
  const isOn = entity.state === "on";
  const name = entity.attributes.friendly_name || entity.entity_id;
  const pendingActions = useHAStore((state) => state.pendingActions);
  const isPending = !!pendingActions[entity.entity_id];

  const supportsBrightness = supportsFeature(entity, LIGHT_FEATURES.SUPPORT_BRIGHTNESS);
  const supportsColor = supportsFeature(entity, LIGHT_FEATURES.SUPPORT_COLOR);
  const supportsColorTemp = supportsFeature(entity, LIGHT_FEATURES.SUPPORT_COLOR_TEMP);

  const [brightness, setBrightness] = useState(entity.attributes.brightness || 0);
  const [colorTemp, setColorTemp] = useState(entity.attributes.color_temp || 0);

  useEffect(() => {
    setBrightness(entity.attributes.brightness || 0);
    setColorTemp(entity.attributes.color_temp || 0);
  }, [entity.attributes.brightness, entity.attributes.color_temp]);

  const handleToggle = async (checked: boolean) => {
    try {
      await onControl(checked ? "turn_on" : "turn_off");
      toast.success(checked ? "Allumé" : "Éteint");
    } catch (error) {
      toast.error("Erreur lors du contrôle");
    }
  };

  const handleBrightnessChange = (value: number[]) => {
    setBrightness(value[0]);
  };

  const handleBrightnessCommit = async (value: number[]) => {
    try {
      await onControl("turn_on", { brightness: value[0] });
    } catch (error) {
      toast.error("Erreur lors du réglage");
    }
  };

  const handleColorTempCommit = async (value: number[]) => {
    try {
      await onControl("turn_on", { color_temp: value[0] });
    } catch (error) {
      toast.error("Erreur lors du réglage");
    }
  };

  return (
    <Card className={cn(
      "glass-card elevated-subtle elevated-active border-border/50 overflow-hidden transition-opacity",
      isPending && "opacity-70"
    )}>
      <div className="p-4 pt-10">
        {/* Header */}
        <div className="mt-1 flex items-start gap-3 mb-4">
          <div
            className={`w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${
              isOn ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <Lightbulb className="h-8 w-8" fill={isOn ? "currentColor" : "none"} />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {isOn ? (supportsBrightness ? `${Math.round((brightness / 255) * 100)}%` : "Allumé") : "Éteint"}
            </p>
          </div>

          <Switch checked={isOn} onCheckedChange={handleToggle} className="scale-125" />
        </div>

        {/* Controls */}
        {isOn && (
          <div className="space-y-3 pt-2 border-t border-border/30">
            {supportsBrightness && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sun className="h-4 w-4" />
                    <span>Luminosité</span>
                  </div>
                  <span className="font-medium">{Math.round((brightness / 255) * 100)}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  onValueChange={handleBrightnessChange}
                  onValueCommit={handleBrightnessCommit}
                  min={0}
                  max={255}
                  step={1}
                  className="py-1"
                />
              </div>
            )}

            {supportsColorTemp && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Palette className="h-4 w-4" />
                    <span>Température</span>
                  </div>
                </div>
                <Slider
                  value={[colorTemp]}
                  onValueChange={(v) => setColorTemp(v[0])}
                  onValueCommit={handleColorTempCommit}
                  min={entity.attributes.min_mireds || 153}
                  max={entity.attributes.max_mireds || 500}
                  step={1}
                  className="py-1"
                />
              </div>
            )}

            {supportsColor && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => toast.info("Sélecteur de couleur à venir")}
              >
                <Palette className="h-4 w-4 mr-2" />
                Choisir une couleur
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
