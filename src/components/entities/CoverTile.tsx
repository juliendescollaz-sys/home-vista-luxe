import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { ChevronUp, ChevronDown, Square, Blinds } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { supportsFeature, COVER_FEATURES } from "@/lib/entityUtils";
import { toast } from "sonner";
import { useHAStore } from "@/store/useHAStore";
import { cn } from "@/lib/utils";

interface CoverTileProps {
  entity: HAEntity;
  onControl: (service: string, data?: any) => Promise<void>;
}

export function CoverTile({ entity, onControl }: CoverTileProps) {
  const realState = entity.state;
  const name = entity.attributes.friendly_name || entity.entity_id;
  const currentPosition = entity.attributes.current_position || 0;
  const currentTilt = entity.attributes.current_tilt_position || 0;
  const pendingActions = useHAStore((state) => state.pendingActions);
  const triggerEntityToggle = useHAStore((state) => state.triggerEntityToggle);
  const pending = pendingActions[entity.entity_id];
  const isPending = !!(pending && !pending.cooldownUntil);
  const isInCooldown = !!(pending?.cooldownUntil && Date.now() < pending.cooldownUntil);
  
  const supportsPosition = supportsFeature(entity, COVER_FEATURES.SUPPORT_SET_POSITION);
  const supportsStop = supportsFeature(entity, COVER_FEATURES.SUPPORT_STOP);
  const supportsTilt = supportsFeature(entity, COVER_FEATURES.SUPPORT_SET_TILT_POSITION);
  
  // État optimiste local pour l'état du cover
  const [optimisticState, setOptimisticState] = useState(realState);
  const [position, setPosition] = useState(currentPosition);
  const [tilt, setTilt] = useState(currentTilt);
  
  // Resynchronisation avec l'état réel de HA (uniquement si pas d'action en cours)
  useEffect(() => {
    if (!isPending && !isInCooldown) {
      setOptimisticState(realState);
    }
  }, [realState, isPending, isInCooldown]);
  
  useEffect(() => {
    setPosition(currentPosition);
    setTilt(currentTilt);
  }, [currentPosition, currentTilt]);
  
  const handleOpen = async () => {
    // Bloquer si action en cours ou cooldown actif
    if (isPending || isInCooldown) {
      return;
    }

    // Update optimiste immédiat
    const previous = optimisticState;
    setOptimisticState("opening");

    await triggerEntityToggle(
      entity.entity_id,
      "opening",
      async () => {
        await onControl("open_cover");
      },
      () => {
        setOptimisticState(previous);
      }
    );
  };
  
  const handleClose = async () => {
    // Bloquer si action en cours ou cooldown actif
    if (isPending || isInCooldown) {
      return;
    }

    // Update optimiste immédiat
    const previous = optimisticState;
    setOptimisticState("closing");

    await triggerEntityToggle(
      entity.entity_id,
      "closing",
      async () => {
        await onControl("close_cover");
      },
      () => {
        setOptimisticState(previous);
      }
    );
  };
  
  const handleStop = async () => {
    try {
      await onControl("stop_cover");
    } catch (error) {
      toast.error("Impossible d'arrêter le volet");
    }
  };
  
  const handlePositionCommit = async (value: number[]) => {
    const previous = position;
    try {
      await onControl("set_cover_position", { position: value[0] });
    } catch (error) {
      setPosition(previous);
      toast.error("Impossible de régler la position");
    }
  };
  
  const handleTiltCommit = async (value: number[]) => {
    const previous = tilt;
    try {
      await onControl("set_cover_tilt_position", { tilt_position: value[0] });
    } catch (error) {
      setTilt(previous);
      toast.error("Impossible de régler l'inclinaison");
    }
  };
  
  const state = optimisticState; // Utiliser l'état optimiste pour l'affichage
  
  return (
    <Card className={cn(
      "glass-card elevated-subtle elevated-active border-border/50 overflow-hidden transition-opacity",
      isPending && "opacity-70"
    )}>
      <div className="p-4 pt-10">
        {/* Header */}
        <div className="mt-1 flex items-start gap-3 mb-4">
          <div className={`w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${
            state === "open" ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Blinds className="h-8 w-8" />
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {state === "open" ? "Ouvert" : state === "closed" ? "Fermé" : state}
              {supportsPosition && ` • ${currentPosition}%`}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={state === "open" ? handleClose : handleOpen}
            className="h-10 w-10"
          >
            {state === "open" ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Controls */}
        <div className="space-y-3 pt-2 border-t border-border/30">
          {/* Position slider */}
          {supportsPosition && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Position</span>
                <span className="font-medium">{position}%</span>
              </div>
              <Slider
                value={[position]}
                onValueChange={(v) => setPosition(v[0])}
                onValueCommit={handlePositionCommit}
                min={0}
                max={100}
                step={1}
                className="py-1"
              />
            </div>
          )}
          
          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpen}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            
            {supportsStop && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Tilt slider */}
          {supportsTilt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Inclinaison</span>
                <span className="font-medium">{tilt}%</span>
              </div>
              <Slider
                value={[tilt]}
                onValueChange={(v) => setTilt(v[0])}
                onValueCommit={handleTiltCommit}
                min={0}
                max={100}
                step={1}
                className="py-1"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
