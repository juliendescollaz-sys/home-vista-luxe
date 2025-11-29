import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { ChevronUp, ChevronDown, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useCallback } from "react";
import { supportsFeature, COVER_FEATURES } from "@/lib/entityUtils";
import { toast } from "sonner";
import { useHAStore } from "@/store/useHAStore";
import { cn } from "@/lib/utils";
import { getCoverIconByDeviceClass } from "./coverIconByDeviceClass";

interface CoverEntityTileProps {
  entity: HAEntity;
  onControl: (service: string, data?: any) => Promise<void>;
}

/**
 * Traduit l'état HA du cover en texte français lisible
 */
function getCoverStateLabel(state: string, position?: number | null): string {
  const positionSuffix = typeof position === "number" ? ` (${position}%)` : "";
  
  switch (state) {
    case "open":
      return `Ouvert${positionSuffix}`;
    case "closed":
      return "Fermé";
    case "opening":
      return "Ouverture…";
    case "closing":
      return "Fermeture…";
    case "unavailable":
      return "Indisponible";
    case "unknown":
      return "Inconnu";
    default:
      return state;
  }
}

export function CoverEntityTile({ entity, onControl }: CoverEntityTileProps) {
  const realState = entity.state;
  const name = entity.attributes.friendly_name || entity.entity_id;
  const deviceClass = entity.attributes.device_class ?? null;
  
  // Position et tilt depuis les attributs
  const currentPosition = typeof entity.attributes.current_position === "number" 
    ? entity.attributes.current_position 
    : null;
  const currentTilt = typeof entity.attributes.current_tilt_position === "number"
    ? entity.attributes.current_tilt_position
    : null;
  
  // Store pour les actions optimistes
  const pendingActions = useHAStore((state) => state.pendingActions);
  const triggerEntityToggle = useHAStore((state) => state.triggerEntityToggle);
  const pending = pendingActions[entity.entity_id];
  const isPending = !!(pending && !pending.cooldownUntil);
  const isInCooldown = !!(pending?.cooldownUntil && Date.now() < pending.cooldownUntil);
  
  // Position supportée = on a une valeur numérique pour current_position
  const supportsPosition = currentPosition !== null;
  
  // Features supportées (fallback buttons)
  const supportsStop = supportsFeature(entity, COVER_FEATURES.SUPPORT_STOP);
  const supportsTilt = supportsFeature(entity, COVER_FEATURES.SUPPORT_SET_TILT_POSITION);
  const supportsOpen = supportsFeature(entity, COVER_FEATURES.SUPPORT_OPEN);
  const supportsClose = supportsFeature(entity, COVER_FEATURES.SUPPORT_CLOSE);
  
  // État optimiste local
  const [optimisticState, setOptimisticState] = useState(realState);
  const [position, setPosition] = useState(currentPosition ?? 0);
  const [tilt, setTilt] = useState(currentTilt ?? 0);
  
  // Resynchronisation avec l'état réel de HA
  useEffect(() => {
    if (!isPending && !isInCooldown) {
      setOptimisticState(realState);
    }
  }, [realState, isPending, isInCooldown]);
  
  useEffect(() => {
    if (currentPosition !== null) {
      setPosition(currentPosition);
    }
  }, [currentPosition]);
  
  useEffect(() => {
    if (currentTilt !== null) {
      setTilt(currentTilt);
    }
  }, [currentTilt]);
  
  // Icône selon device_class
  const Icon = getCoverIconByDeviceClass(deviceClass);
  
  // Handlers d'actions
  const handleOpen = useCallback(async () => {
    if (isPending || isInCooldown) return;
    
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
  }, [isPending, isInCooldown, optimisticState, entity.entity_id, triggerEntityToggle, onControl]);
  
  const handleClose = useCallback(async () => {
    if (isPending || isInCooldown) return;
    
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
  }, [isPending, isInCooldown, optimisticState, entity.entity_id, triggerEntityToggle, onControl]);
  
  const handleStop = useCallback(async () => {
    try {
      await onControl("stop_cover");
    } catch (error) {
      toast.error("Impossible d'arrêter le volet");
    }
  }, [onControl]);
  
  const handlePositionCommit = useCallback(async (values: number[]) => {
    const newPos = Math.max(0, Math.min(100, values[0] ?? 0));
    const previous = position;
    
    try {
      await onControl("set_cover_position", { position: newPos });
    } catch (error) {
      setPosition(previous);
      toast.error("Impossible de régler la position");
    }
  }, [onControl, position]);
  
  const handleTiltCommit = useCallback(async (values: number[]) => {
    const newTilt = Math.max(0, Math.min(100, values[0] ?? 0));
    const previous = tilt;
    
    try {
      await onControl("set_cover_tilt_position", { tilt_position: newTilt });
    } catch (error) {
      setTilt(previous);
      toast.error("Impossible de régler l'inclinaison");
    }
  }, [onControl, tilt]);
  
  // État affiché (optimiste)
  const state = optimisticState;
  const isOpen = state === "open" || state === "opening";
  const isUnavailable = state === "unavailable";
  
  return (
    <Card className={cn(
      "glass-card elevated-subtle elevated-active border-border/50 overflow-hidden transition-opacity",
      isPending && "opacity-70"
    )}>
      <div className="p-4 pt-10">
        {/* Header - identique à MediaPlayerCard */}
        <div className="mt-1 flex items-start gap-3 mb-4">
          <div 
            className={cn(
              "w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center",
              isOpen ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
            )}
            aria-label={`Icône ${deviceClass || "volet"}`}
          >
            <Icon className="h-8 w-8" />
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {getCoverStateLabel(state, supportsPosition ? currentPosition : null)}
            </p>
          </div>
          
          {/* Bouton principal toggle open/close */}
          <Button
            variant="outline"
            size="icon"
            onClick={isOpen ? handleClose : handleOpen}
            disabled={isUnavailable || isPending}
            className="h-10 w-10"
            aria-label={isOpen ? "Fermer" : "Ouvrir"}
          >
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Slider de position - structure alignée sur MediaPlayerCard */}
        {supportsPosition && (
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Position</span>
              <span>{position}%</span>
            </div>
            <Slider
              value={[position]}
              onValueChange={(v) => setPosition(v[0])}
              onValueCommit={handlePositionCommit}
              min={0}
              max={100}
              step={1}
              disabled={isUnavailable}
              className="w-full"
              aria-label="Position du volet"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Fermé</span>
              <span>Ouvert</span>
            </div>
          </div>
        )}
        
        {/* Boutons d'action open/stop/close - UNIQUEMENT si pas de position */}
        {!supportsPosition && (
          <div className={cn(
            "grid gap-2 pt-2 border-t border-border/30",
            supportsStop ? "grid-cols-3" : "grid-cols-2"
          )}>
            {supportsOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpen}
                disabled={isUnavailable || isPending}
                aria-label="Ouvrir complètement"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            
            {supportsStop && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
                disabled={isUnavailable}
                aria-label="Arrêter le mouvement"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}
            
            {supportsClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isUnavailable || isPending}
                aria-label="Fermer complètement"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        
        {/* Slider d'inclinaison (tilt) - uniquement si supporté */}
        {supportsTilt && (
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Inclinaison</span>
              <span>{tilt}%</span>
            </div>
            <Slider
              value={[tilt]}
              onValueChange={(v) => setTilt(v[0])}
              onValueCommit={handleTiltCommit}
              min={0}
              max={100}
              step={1}
              disabled={isUnavailable}
              className="w-full"
              aria-label="Inclinaison des lames"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
