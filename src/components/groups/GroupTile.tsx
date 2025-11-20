import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Lightbulb, Blinds, Power, Fan, Music, ChevronUp, ChevronDown, Trash2, Play, Pause } from "lucide-react";
import type { NeoliaGroup, HaGroupDomain } from "@/types/groups";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
import { playMediaGroup, pauseMediaGroup, setGroupVolume } from "@/services/haGroups";
import { toast } from "sonner";

const DOMAIN_ICONS: Record<HaGroupDomain, any> = {
  light: Lightbulb,
  cover: Blinds,
  switch: Power,
  fan: Fan,
  media_player: Music,
};

interface GroupTileProps {
  group: NeoliaGroup;
  onDelete?: () => void;
}

export function GroupTile({ group, onDelete }: GroupTileProps) {
  const entities = useHAStore((state) => state.entities);
  const { toggleGroup, openCover, closeCover } = useGroupStore();
  const [localVolume, setLocalVolume] = useState<number | null>(null);

  // Récupérer l'entité de groupe depuis HA
  const groupEntity = entities.find((e) => e.entity_id === group.haEntityId);
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

  const handleDelete = async () => {
    if (confirm(`Supprimer le groupe "${group.name}" ?`)) {
      onDelete?.();
    }
  };

  const handlePlayPause = async () => {
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

  return (
    <Card className="group relative overflow-hidden glass-card elevated-subtle elevated-active border-border/50">
      <div className="relative p-4">
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
            <h3 className="font-semibold text-base truncate mb-0.5">{group.name}</h3>
            <p className="text-sm text-muted-foreground">
              {group.entityIds.length} appareil{group.entityIds.length > 1 ? "s" : ""}
            </p>
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-1 -mr-1 text-muted-foreground hover:text-destructive active:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
              >
                <ChevronUp className="h-4 w-4" />
                Ouvrir
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 flex-1"
                onClick={handleClose}
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
                className="h-10 w-10 rounded-full"
                onClick={handlePlayPause}
              >
                {mediaPlayerState?.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <div className="flex-1 flex items-center gap-2">
                <Slider
                  value={[localVolume ?? mediaPlayerState?.avgVolume ?? 0.5]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  onValueCommit={handleVolumeCommit}
                  className="flex-1"
                />
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
    </Card>
  );
}
