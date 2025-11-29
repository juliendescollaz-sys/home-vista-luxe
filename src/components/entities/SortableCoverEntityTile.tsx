import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { HAEntity, HAFloor, HAArea } from "@/types/homeassistant";
import { ChevronUp, ChevronDown, Pause, Star, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useCallback } from "react";
import { supportsFeature, COVER_FEATURES } from "@/lib/entityUtils";
import { toast } from "sonner";
import { useHAStore } from "@/store/useHAStore";
import { cn } from "@/lib/utils";
import { getCoverIconByDeviceClass } from "./coverIconByDeviceClass";
import { LocationBadge } from "../LocationBadge";

interface SortableCoverEntityTileProps {
  entity: HAEntity;
  floor?: HAFloor | null;
  area?: HAArea | null;
  onEditName?: (entity: HAEntity) => void;
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

export function SortableCoverEntityTile({ entity, floor, area, onEditName }: SortableCoverEntityTileProps) {
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
  
  // Store
  const client = useHAStore((state) => state.client);
  const favorites = useHAStore((state) => state.favorites);
  const toggleFavorite = useHAStore((state) => state.toggleFavorite);
  const pendingActions = useHAStore((state) => state.pendingActions);
  const triggerEntityToggle = useHAStore((state) => state.triggerEntityToggle);
  
  const isFavorite = favorites.includes(entity.entity_id);
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
  
  // DnD sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entity.entity_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : (isPending ? 0.7 : 1),
    zIndex: isDragging ? 50 : 'auto',
  };
  
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
  
  // Helper pour appeler les services
  const callCoverService = useCallback(async (service: string, data?: any) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }
    await client.callService("cover", service, data || {}, { entity_id: entity.entity_id });
  }, [client, entity.entity_id]);
  
  // Handlers d'actions
  const handleOpen = useCallback(async () => {
    if (isPending || isInCooldown) return;
    
    const previous = optimisticState;
    setOptimisticState("opening");
    
    await triggerEntityToggle(
      entity.entity_id,
      "opening",
      async () => {
        await callCoverService("open_cover");
      },
      () => {
        setOptimisticState(previous);
      }
    );
  }, [isPending, isInCooldown, optimisticState, entity.entity_id, triggerEntityToggle, callCoverService]);
  
  const handleClose = useCallback(async () => {
    if (isPending || isInCooldown) return;
    
    const previous = optimisticState;
    setOptimisticState("closing");
    
    await triggerEntityToggle(
      entity.entity_id,
      "closing",
      async () => {
        await callCoverService("close_cover");
      },
      () => {
        setOptimisticState(previous);
      }
    );
  }, [isPending, isInCooldown, optimisticState, entity.entity_id, triggerEntityToggle, callCoverService]);
  
  const handleStop = useCallback(async () => {
    try {
      await callCoverService("stop_cover");
    } catch (error) {
      toast.error("Impossible d'arrêter le volet");
    }
  }, [callCoverService]);
  
  const handlePositionCommit = useCallback(async (values: number[]) => {
    const newPos = Math.max(0, Math.min(100, values[0] ?? 0));
    const previous = position;
    
    try {
      await callCoverService("set_cover_position", { position: newPos });
    } catch (error) {
      setPosition(previous);
      toast.error("Impossible de régler la position");
    }
  }, [callCoverService, position]);
  
  const handleTiltCommit = useCallback(async (values: number[]) => {
    const newTilt = Math.max(0, Math.min(100, values[0] ?? 0));
    const previous = tilt;
    
    try {
      await callCoverService("set_cover_tilt_position", { tilt_position: newTilt });
    } catch (error) {
      setTilt(previous);
      toast.error("Impossible de régler l'inclinaison");
    }
  }, [callCoverService, tilt]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(entity.entity_id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditName?.(entity);
  };
  
  // État affiché (optimiste)
  const state = optimisticState;
  const isOpen = state === "open" || state === "opening";
  const isUnavailable = state === "unavailable";
  
  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative overflow-hidden glass-card elevated-subtle elevated-active border-border/50 cursor-grab active:cursor-grabbing"
      )}
    >
      <LocationBadge floor={floor} area={area} />
      
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

          <div className="flex items-center gap-1 flex-shrink-0">
            {onEditName && (
              <button
                type="button"
                onClick={handleEditClick}
                className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-border/40 bg-background/40 hover:bg-accent/60 hover:border-accent/60 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Renommer l'appareil"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-transparent active:bg-accent/50 active:scale-95 transition-all"
              onClick={handleFavoriteClick}
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </div>
        
        {/* Slider de position - compact, aligné sur la tuile média */}
        {supportsPosition && (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
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
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Fermé</span>
              <span>Ouvert</span>
            </div>
          </div>
        )}
        
        {/* Boutons d'action open/stop/close - UNIQUEMENT si pas de position */}
        {!supportsPosition && (
          <div 
            className={cn(
              "grid gap-2 pt-2 border-t border-border/30",
              supportsStop ? "grid-cols-3" : "grid-cols-2"
            )}
            onClick={(e) => e.stopPropagation()}
          >
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
          <div className="space-y-1.5 pt-2 border-t border-border/30" onClick={(e) => e.stopPropagation()}>
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
