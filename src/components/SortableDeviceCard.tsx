import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Lightbulb, Thermometer, Music, Lock, Camera, MoreVertical, Power, Star, Pencil } from "lucide-react";
import type { HAEntity, EntityDomain, HAFloor, HAArea } from "@/types/homeassistant";
import { Switch } from "@/components/ui/switch";
import { useHAStore } from "@/store/useHAStore";
import { Button } from "@/components/ui/button";
import { LocationBadge } from "./LocationBadge";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const domainIcons: Partial<Record<EntityDomain, any>> = {
  light: Lightbulb,
  climate: Thermometer,
  media_player: Music,
  lock: Lock,
  camera: Camera,
  switch: Power,
  sensor: Thermometer,
  binary_sensor: Thermometer,
  cover: MoreVertical,
  scene: Lightbulb,
  script: Lightbulb,
  button: Lightbulb,
};

interface SortableDeviceCardProps {
  entity: HAEntity;
  onToggle?: (entityId: string) => void;
  floor?: HAFloor | null;
  area?: HAArea | null;
  onOpenDetails?: (entity: HAEntity) => void;
  onEditName?: (entity: HAEntity) => void;
  size?: "default" | "compact";
}

export const SortableDeviceCard = ({ entity, onToggle, floor, area, onOpenDetails, onEditName, size = "default" }: SortableDeviceCardProps) => {
  const domain = entity.entity_id.split(".")[0] as EntityDomain;
  const Icon = domainIcons[domain] || MoreVertical;
  const realIsActive = entity.state === "on";
  const name = entity.attributes.friendly_name || entity.entity_id;
  const isCompact = size === "compact";
  
  const favorites = useHAStore((state) => state.favorites);
  const toggleFavorite = useHAStore((state) => state.toggleFavorite);
  const pendingActions = useHAStore((state) => state.pendingActions);
  const triggerEntityToggle = useHAStore((state) => state.triggerEntityToggle);
  const isFavorite = favorites.includes(entity.entity_id);
  const pending = pendingActions[entity.entity_id];
  const isPending = !!(pending && !pending.cooldownUntil);
  const isInCooldown = !!(pending?.cooldownUntil && Date.now() < pending.cooldownUntil);

  // État optimiste local pour le toggle ON/OFF
  const [optimisticActive, setOptimisticActive] = useState(realIsActive);

  // Resynchronisation avec l'état réel de HA (uniquement si pas d'action en cours)
  useEffect(() => {
    if (!isPending && !isInCooldown) {
      setOptimisticActive(realIsActive);
    }
  }, [realIsActive, isPending, isInCooldown]);

  const isActive = optimisticActive;

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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(entity.entity_id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditName?.(entity);
  };

  const handleCardClick = () => {
    if (domain !== "media_player") {
      onOpenDetails?.(entity);
    }
  };

  const handleToggle = async () => {
    // Bloquer si action en cours ou cooldown actif
    if (isPending || isInCooldown) {
      return;
    }

    // Update optimiste immédiat
    const previous = optimisticActive;
    const next = !optimisticActive;
    setOptimisticActive(next);

    // Appeler triggerEntityToggle qui gère le pending, timeout, cooldown et rollback
    await triggerEntityToggle(
      entity.entity_id,
      next ? "on" : "off",
      async () => {
        await onToggle?.(entity.entity_id);
      },
      () => {
        // Rollback en cas de timeout
        setOptimisticActive(previous);
      }
    );
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className="group relative overflow-hidden glass-card elevated-subtle elevated-active border-border/50 cursor-grab active:cursor-grabbing"
    >
      {!isCompact && <LocationBadge floor={floor} area={area} />}
      
      <div className={isCompact ? "p-3 pt-3" : "p-4 pt-10"}>
        <div className={`mt-1 flex items-start ${isCompact ? "gap-2 mb-2" : "gap-3 mb-4"}`}>
          <div className={`${isCompact ? "w-10 h-10" : "w-14 h-14"} rounded-lg flex-shrink-0 transition-colors flex items-center justify-center ${
            isActive ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Icon className={isCompact ? "h-5 w-5" : "h-8 w-8"} />
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className={`font-semibold ${isCompact ? "text-sm" : "text-base"} truncate mb-0.5`}>{name}</h3>
            <p className={`${isCompact ? "text-xs" : "text-sm"} text-muted-foreground capitalize`}>{entity.state}</p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {onEditName && (
              <button
                type="button"
                onClick={handleEditClick}
                className={`inline-flex items-center justify-center ${isCompact ? "h-6 w-6" : "h-7 w-7"} rounded-full border border-border/40 bg-background/40 hover:bg-accent/60 hover:border-accent/60 text-muted-foreground hover:text-foreground transition-colors`}
                aria-label="Renommer l'appareil"
              >
                <Pencil className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={`${isCompact ? "h-6 w-6" : "h-7 w-7"} bg-transparent active:bg-accent/50 active:scale-95 transition-all`}
              onClick={handleFavoriteClick}
            >
              <Star className={`${isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </div>

        {(domain === "light" || domain === "switch") && (
          <div className={`flex items-center justify-end ${isCompact ? "pt-1" : "pt-2"}`} onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              className={`data-[state=checked]:bg-primary ${isCompact ? "" : "scale-125"}`}
            />
          </div>
        )}
       </div>
    </Card>
  );
};
