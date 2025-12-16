import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Lightbulb,
  Blinds,
  Power,
  Fan,
  Music,
  ChevronUp,
  ChevronDown,
  Pencil,
  Play,
  Pause,
  Star,
  Volume2,
  Users,
  User,
  Thermometer,
  Lock,
  Droplet,
  Layers,
  Loader2,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { NeoliaGroup, HaGroupDomain } from "@/types/groups";
import { getGroupScope, getGroupDomains, getGroupMode } from "@/types/groups";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import { playMediaGroup, pauseMediaGroup, setGroupVolume } from "@/services/haGroups";
import { toast } from "sonner";
import { GroupBadge } from "./GroupBadge";
import { GroupEditDialog } from "./GroupEditDialog";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { cn } from "@/lib/utils";
import { getMixedGroupState } from "@/lib/entityUtils";

const DOMAIN_ICONS: Record<HaGroupDomain, any> = {
  light: Lightbulb,
  cover: Blinds,
  switch: Power,
  fan: Fan,
  media_player: Music,
  climate: Thermometer,
  lock: Lock,
  valve: Droplet,
};

interface GroupTileProps {
  group: NeoliaGroup;
  hideEditButton?: boolean;
  sortableProps?: {
    attributes?: any;
    listeners?: any;
    setNodeRef?: any;
    style?: any;
  };
}

export function GroupTile({ group, hideEditButton = false, sortableProps }: GroupTileProps) {
  // ===== HOOKS APPELÉS INCONDITIONNELLEMENT AU DÉBUT =====
  const entities = useHAStore((state) => state.entities);
  const pendingActions = useHAStore((state) => state.pendingActions);
  const toggleGroup = useGroupStore((state) => state.toggleGroup);
  const openCover = useGroupStore((state) => state.openCover);
  const closeCover = useGroupStore((state) => state.closeCover);
  const toggleGroupFavorite = useGroupStore((state) => state.toggleGroupFavorite);
  const groupFavorites = useGroupStore((state) => state.groupFavorites);
  // Sélecteur stable pour le runtime d'un groupe spécifique
  const groupRuntime = useGroupStore((state) => state.runtime[group.id]);
  
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { displayMode } = useDisplayMode();
  
  // ===== VALEURS DÉRIVÉES (après les hooks) =====
  const isFavorite = groupFavorites.includes(group.id);
  const isRuntimePending = groupRuntime?.isPending ?? false;

  const groupEntity = group.haEntityId ? entities.find((e) => e.entity_id === group.haEntityId) : undefined;
  const domains = getGroupDomains(group);
  const mode = getGroupMode(group);
  const isMixedGroup = mode === "mixedBinary" || domains.length > 1;

  const CustomIcon = group.icon ? (LucideIcons as any)[group.icon] : null;
  const Icon = CustomIcon ?? (isMixedGroup ? Layers : DOMAIN_ICONS[group.domain]);

  const scope = getGroupScope(group);
  
  // Calcul fiable de l'état actif selon le type de groupe
  const realIsActive = useMemo(() => {
    if (isMixedGroup) {
      // Pour les groupes mixtes, calculer l'état à partir des entités contrôlables
      return getMixedGroupState(group.entityIds, entities) === "on";
    }
    // Pour les groupes classiques avec haEntityId
    return groupEntity?.state === "on" || groupEntity?.state === "open";
  }, [isMixedGroup, group.entityIds, entities, groupEntity?.state]);
  
  // Indicateur "en cours" pour les groupes avec haEntityId (groupes partagés)
  const pending = group.haEntityId ? pendingActions[group.haEntityId] : undefined;
  const isPending = isRuntimePending || !!(pending && !pending.cooldownUntil);
  const isInCooldown = !!(pending?.cooldownUntil && Date.now() < pending.cooldownUntil);

  // État optimiste local pour le toggle ON/OFF (sauf media_player)
  const [optimisticActive, setOptimisticActive] = useState(realIsActive);

  // Resynchronisation avec l'état réel de HA (uniquement si pas d'action en cours)
  useEffect(() => {
    if (!isPending && !isInCooldown && group.domain !== "media_player") {
      setOptimisticActive(realIsActive);
    }
  }, [realIsActive, isPending, isInCooldown, group.domain]);

  // Pour media_player, toujours utiliser l'état réel
  const isActive = group.domain === "media_player" ? realIsActive : optimisticActive;

  const mediaPlayerState = useMemo(() => {
    if (group.domain !== "media_player") return null;

    const members = group.entityIds.map((id) => entities.find((e) => e.entity_id === id)).filter(Boolean);

    const isPlaying = members.some((m) => m?.state === "playing");
    const volumes = members.map((m) => m?.attributes?.volume_level).filter((v): v is number => typeof v === "number");

    const avgVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0.5;

    return { isPlaying, avgVolume, members };
  }, [group.domain, group.entityIds, entities]);

  const handleToggle = async () => {
    // Bloquer si action en cours ou cooldown actif
    if (isPending || isInCooldown) {
      return;
    }

    if (group.domain !== "media_player") {
      // Update optimiste immédiat
      const previous = optimisticActive;
      setOptimisticActive(!optimisticActive);
      
      // toggleGroup gère lui-même triggerEntityToggle pour les groupes partagés
      try {
        await toggleGroup(group.id, groupEntity?.state || "off", group.domain);
      } catch (error) {
        // Rollback en cas d'erreur
        setOptimisticActive(previous);
        toast.error("Impossible de changer l'état du groupe");
      }
    } else {
      try {
        await toggleGroup(group.id, groupEntity?.state || "off", group.domain);
      } catch (error) {
        toast.error("Impossible de changer l'état du groupe");
      }
    }
  };

  const handleOpen = async () => {
    // Bloquer si action en cours ou cooldown actif
    if (isPending || isInCooldown) {
      return;
    }

    // Update optimiste immédiat
    const previous = optimisticActive;
    setOptimisticActive(true);

    try {
      await openCover(group.id);
    } catch (error) {
      setOptimisticActive(previous);
      toast.error("Impossible d'ouvrir les volets");
    }
  };

  const handleClose = async () => {
    // Bloquer si action en cours ou cooldown actif
    if (isPending || isInCooldown) {
      return;
    }

    // Update optimiste immédiat
    const previous = optimisticActive;
    setOptimisticActive(false);

    try {
      await closeCover(group.id);
    } catch (error) {
      setOptimisticActive(previous);
      toast.error("Impossible de fermer les volets");
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditDialogOpen(true);
  };

  const volumePercentage = Math.round((localVolume ?? mediaPlayerState?.avgVolume ?? 0.5) * 100);

  const handlePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      if (mediaPlayerState?.isPlaying) {
        await pauseMediaGroup(group.entityIds);
      } else {
        await playMediaGroup(group.entityIds);
      }
      // Pas de toast - feedback visuel direct
    } catch (error) {
      toast.error("Erreur lors du contrôle de la lecture");
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setLocalVolume(value[0]);
  };

  const handleVolumeCommit = async (value: number[]) => {
    try {
      await setGroupVolume(group.entityIds, value[0]);
      setLocalVolume(null);
    } catch (error) {
      toast.error("Erreur lors du réglage du volume");
      setLocalVolume(null);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleGroupFavorite(group.id);
  };

  return (
    <Card
      ref={sortableProps?.setNodeRef}
      style={sortableProps?.style}
      {...sortableProps?.attributes}
      {...sortableProps?.listeners}
      className={cn(
        "group relative overflow-hidden glass-card elevated-subtle elevated-active border-border/50 transition-opacity",
        sortableProps && "cursor-grab active:cursor-grabbing touch-none"
      )}
    >
      {/* Overlay spinner pendant le pending */}
      {isPending && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-black/30 backdrop-blur-sm pointer-events-auto">
          <div className="w-6 h-6 border-[2px] border-white/25 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}

      <GroupBadge />

      <div className="p-4 pt-10">
        {/* Header aligné sur LightTile, légèrement abaissé */}
        <div className="mt-1 flex items-start gap-3 mb-4">
          {/* Icône principale */}
          <div
            className={`w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${
              isActive ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <Icon className="h-8 w-8" />
          </div>

          {/* Infos + actions */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-semibold text-base truncate mb-0.5">{group.name}</h3>
                {scope === "shared" ? (
                  <Users 
                    className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" 
                    aria-label="Groupe partagé"
                  />
                ) : (
                  <User 
                    className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" 
                    aria-label="Groupe local (app uniquement)"
                  />
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Bouton édition (crayon) */}
                {!hideEditButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary flex-shrink-0"
                    onClick={handleEditClick}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Modifier le groupe"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Bouton favoris */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={handleFavoriteClick}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Star className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {group.entityIds.length} appareil
              {group.entityIds.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Contrôles cover / media_player */}
        {(group.domain === "cover" || group.domain === "media_player") && (
          <div className="space-y-3 pt-2 border-t border-border/30">
            {group.domain === "cover" ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={handleOpen}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <ChevronUp className="h-4 w-4" />
                  Ouvrir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={handleClose}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <ChevronDown className="h-4 w-4" />
                  Fermer
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full flex-shrink-0"
                    onClick={handlePlayPause}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {mediaPlayerState?.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <div className="flex-1 flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                    <Volume2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Slider
                      value={[localVolume ?? mediaPlayerState?.avgVolume ?? 0.5]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      onValueCommit={handleVolumeCommit}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground font-medium w-10 text-right flex-shrink-0">
                      {volumePercentage}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Switch en bas pour light/switch/fan – sans bordure ni marge top */}
        {group.domain !== "cover" && group.domain !== "media_player" && (
          <div className="flex items-center justify-end pt-2">
            <Switch 
              checked={isActive} 
              onCheckedChange={handleToggle} 
              disabled={isPending}
              className="scale-125" 
            />
          </div>
        )}

      </div>

      <GroupEditDialog group={group} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
    </Card>
  );
}
