import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Lightbulb, Thermometer, Music, Lock, Camera, MoreVertical, Power, Star, Pencil, Sun } from "lucide-react";
import type { HAEntity, EntityDomain, HAFloor, HAArea } from "@/types/homeassistant";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useHAStore } from "@/store/useHAStore";
import { Button } from "@/components/ui/button";
import { LocationBadge } from "./LocationBadge";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { lightSupportsBrightness } from "@/lib/entityUtils";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";

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
  size?: "default" | "compact" | "panel";
}

export const SortableDeviceCard = ({ entity, onToggle, floor, area, onOpenDetails, onEditName, size = "default" }: SortableDeviceCardProps) => {
  const domain = entity.entity_id.split(".")[0] as EntityDomain;
  const Icon = domainIcons[domain] || MoreVertical;
  const realIsActive = entity.state === "on";
  const name = entity.attributes.friendly_name || entity.entity_id;
  const isCompact = size === "compact";
  const isPanel = size === "panel";
  
  const client = useHAStore((state) => state.client);
  const favorites = useHAStore((state) => state.favorites);
  const toggleFavorite = useHAStore((state) => state.toggleFavorite);
  const pendingActions = useHAStore((state) => state.pendingActions);
  const triggerEntityToggle = useHAStore((state) => state.triggerEntityToggle);
  const isFavorite = favorites.includes(entity.entity_id);
  const pending = pendingActions[entity.entity_id];
  const isPending = !!(pending && !pending.cooldownUntil);
  const isInCooldown = !!(pending?.cooldownUntil && Date.now() < pending.cooldownUntil);
  const { controlEntity } = useOptimisticToggle();

  const supportsBrightness = domain === "light" && lightSupportsBrightness(entity);

  // État optimiste local pour le toggle ON/OFF
  const [optimisticActive, setOptimisticActive] = useState(realIsActive);

  // Luminosité (uniquement utile pour les lights dimmables)
  const [brightness, setBrightness] = useState<number>(
    typeof entity.attributes.brightness === "number" ? entity.attributes.brightness : 0,
  );

  // Resynchronisation avec l'état réel de HA (uniquement si pas d'action en cours)
  useEffect(() => {
    if (!isPending && !isInCooldown) {
      setOptimisticActive(realIsActive);
    }
  }, [realIsActive, isPending, isInCooldown]);

  useEffect(() => {
    if (typeof entity.attributes.brightness === "number") {
      setBrightness(entity.attributes.brightness);
    }
  }, [entity.attributes.brightness]);

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

  const handleBrightnessChange = (value: number[]) => {
    setBrightness(value[0]);
  };

  const handleBrightnessCommit = async (value: number[]) => {
    if (!client) return;
    const previous = brightness;
    try {
      await client.callService("light", "turn_on", { brightness: value[0] }, { entity_id: entity.entity_id });
    } catch (error) {
      setBrightness(previous);
      toast.error("Impossible de régler la luminosité");
    }
  };

  // Tailles selon le mode : compact < default < panel
  const iconContainerSize = isPanel ? "w-16 h-16" : isCompact ? "w-10 h-10" : "w-14 h-14";
  const iconSize = isPanel ? "h-9 w-9" : isCompact ? "h-5 w-5" : "h-8 w-8";
  const titleSize = isPanel ? "text-lg" : isCompact ? "text-sm" : "text-base";
  const stateSize = isPanel ? "text-base" : isCompact ? "text-xs" : "text-sm";
  const padding = isPanel ? "p-5 pt-12" : isCompact ? "p-3 pt-3" : "p-4 pt-10";
  const gap = isPanel ? "gap-4 mb-5" : isCompact ? "gap-2 mb-2" : "gap-3 mb-4";
  const actionBtnSize = isPanel ? "h-9 w-9" : isCompact ? "h-6 w-6" : "h-7 w-7";
  const actionIconSize = isPanel ? "h-5 w-5" : isCompact ? "h-3.5 w-3.5" : "h-4 w-4";
  const switchScale = isPanel ? "scale-150" : isCompact ? "" : "scale-125";

  // Affichage état : pour les lights dimmables, afficher le %
  const stateDisplay = (() => {
    if (domain === "light" && supportsBrightness && isActive && brightness > 0) {
      return `${Math.round((brightness / 255) * 100)}%`;
    }
    return entity.state;
  })();

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

      <div className={padding}>
        <div className={`mt-1 flex items-start ${gap}`}>
          <div className={`${iconContainerSize} rounded-xl flex-shrink-0 transition-colors flex items-center justify-center ${
            isActive ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Icon className={iconSize} />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className={`font-semibold ${titleSize} truncate mb-0.5`}>{name}</h3>
            <p className={`${stateSize} text-muted-foreground capitalize`}>{stateDisplay}</p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {onEditName && (
              <button
                type="button"
                onClick={handleEditClick}
                className={`inline-flex items-center justify-center ${actionBtnSize} rounded-full border border-border/40 bg-background/40 hover:bg-accent/60 hover:border-accent/60 text-muted-foreground hover:text-foreground transition-colors`}
                aria-label="Renommer l'appareil"
              >
                <Pencil className={isPanel ? "h-4 w-4" : isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={`${actionBtnSize} bg-transparent active:bg-accent/50 active:scale-95 transition-all`}
              onClick={handleFavoriteClick}
            >
              <Star className={`${actionIconSize} ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </div>

        {/* Contrôles ON/OFF + Slider luminosité pour lights dimmables */}
        {(domain === "light" || domain === "switch") && (
          <div className={`space-y-2 ${isPanel ? "pt-3" : isCompact ? "pt-1" : "pt-2"}`} onClick={(e) => e.stopPropagation()}>
            {/* Slider luminosité pour lights dimmables quand allumé */}
            {domain === "light" && supportsBrightness && isActive && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5" />
                    <span>Luminosité</span>
                  </div>
                  <span className="font-medium text-foreground">{Math.round((brightness / 255) * 100)}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  onValueChange={handleBrightnessChange}
                  onValueCommit={handleBrightnessCommit}
                  min={1}
                  max={255}
                  step={1}
                  className="py-1"
                />
              </div>
            )}
            
            <div className="flex items-center justify-end">
              <Switch
                checked={isActive}
                onCheckedChange={handleToggle}
                className={`data-[state=checked]:bg-primary ${switchScale}`}
              />
            </div>
          </div>
        )}
       </div>
    </Card>
  );
};
