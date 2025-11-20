import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Lightbulb, Blinds, Power, Fan, Music, ChevronUp, ChevronDown, Pencil, Play, Pause, Star, Volume2, Cloud, Lock } from "lucide-react";
import type { NeoliaGroup, HaGroupDomain } from "@/types/groups";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import { playMediaGroup, pauseMediaGroup, setGroupVolume } from "@/services/haGroups";
import { toast } from "sonner";
import { GroupBadge } from "./GroupBadge";
import { GroupEditDialog } from "./GroupEditDialog";

const DOMAIN_ICONS: Record<HaGroupDomain, any> = {
  light: Lightbulb,
  cover: Blinds,
  switch: Power,
  fan: Fan,
  media_player: Music,
};

interface GroupTileProps {
  group: NeoliaGroup;
  showBadge?: boolean;
  hideEditButton?: boolean;
  sortableProps?: {
    attributes?: any;
    listeners?: any;
    setNodeRef?: any;
    style?: any;
  };
}

export function GroupTile({ group, showBadge = false, hideEditButton = false, sortableProps }: GroupTileProps) {
  const entities = useHAStore((state) => state.entities);
  const { toggleGroup, openCover, closeCover, toggleGroupFavorite, groupFavorites } = useGroupStore();
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const isFavorite = groupFavorites.includes(group.id);

  // Récupérer l'entité de groupe depuis HA (seulement pour les groupes partagés)
  const groupEntity = group.haEntityId ? entities.find((e) => e.entity_id === group.haEntityId) : undefined;
  const isActive = groupEntity?.state === "on" || groupEntity?.state === "open";
  const Icon = DOMAIN_ICONS[group.domain];

  // Pour les media_player: calculer état global et volume moyen
  const mediaPlayerState = useMemo(() => {
    if (group.domain !== "media_player") return null;

    const members = group.entityIds
      .map((id) => entities.find((e) => e.entity_id === id))
      .filter(Boolean);

    const isPlaying = members.some((m) => m?.state === "playing");
    const volumes = members
      .map((m) => m?.attributes?.volume_level)
      .filter((v): v is number => typeof v === "number");
    
    const avgVolume = volumes.length > 0 
      ? volumes.reduce((a, b) => a + b, 0) / volumes.length 
      : 0.5;

    return { isPlaying, avgVolume, members };
  }, [group.domain, group.entityIds, entities]);

  const handleToggle = async () => {
    try {
      await toggleGroup(group.id, groupEntity?.state || "off", group.domain);
      toast.success(isActive ? "Éteint" : "Allumé");
    } catch (error) {
      toast.error("Erreur lors du contrôle du groupe");
    }
  };

  const handleOpen = async () => {
    try {
      await openCover(group.id);
      toast.success("Ouverture en cours");
    } catch (error) {
      toast.error("Erreur lors de l'ouverture");
    }
  };

  const handleClose = async () => {
    try {
      await closeCover(group.id);
      toast.success("Fermeture en cours");
    } catch (error) {
      toast.error("Erreur lors de la fermeture");
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
        toast.success("Pause");
      } else {
        await playMediaGroup(group.entityIds);
        toast.success("Lecture");
      }
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
      className={`group relative overflow-hidden glass-card elevated-subtle elevated-active border-border/50 ${sortableProps ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
    >
      {showBadge && <GroupBadge />}
      
      <div className={`relative ${showBadge ? 'pt-8' : ''} p-4`}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`w-14 h-14 rounded-lg flex-shrink-0 transition-colors flex items-center justify-center ${
              isActive ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <Icon className="h-8 w-8" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-base truncate">{group.name}</h3>
              {group.isShared ? (
                <Cloud className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {group.entityIds.length} appareil{group.entityIds.length > 1 ? "s" : ""}
            </p>
          </div>

          {/* Favorite & Edit buttons */}
          <div className="flex items-center gap-1 flex-shrink-0 -mt-1 -mr-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-transparent active:bg-accent/50 active:scale-95 transition-all"
              onClick={handleFavoriteClick}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Star className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </Button>
            {!hideEditButton && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary active:bg-primary/10"
                onClick={handleEditClick}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 flex items-center justify-end gap-2">
          {group.domain === "cover" ? (
            <>
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
            </>
          ) : group.domain === "media_player" ? (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full flex-shrink-0"
                onClick={handlePlayPause}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {mediaPlayerState?.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
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
            </>
          ) : (
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-primary scale-125"
            />
          )}
        </div>
      </div>

      <GroupEditDialog 
        group={group} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />
    </Card>
  );
}
