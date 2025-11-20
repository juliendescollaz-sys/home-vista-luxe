import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Lightbulb, Blinds, Power, Fan, Music, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import type { NeoliaGroup, HaGroupDomain } from "@/types/groups";
import { useHAStore } from "@/store/useHAStore";
import { useGroupStore } from "@/store/useGroupStore";
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

  // Récupérer l'entité de groupe depuis HA
  const groupEntity = entities.find((e) => e.entity_id === group.haEntityId);
  const isActive = groupEntity?.state === "on" || groupEntity?.state === "open";
  const Icon = DOMAIN_ICONS[group.domain];

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
