import { useState, useMemo } from "react";
import { useSmartStore } from "@/store/useSmartStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Star, Users, Pencil, Play } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { SmartWizard } from "./SmartWizard";
import { SmartBadge } from "./SmartBadge";

interface SmartTileProps {
  automationId: string;
  hideEditButton?: boolean;
  sortableProps?: {
    attributes?: any;
    listeners?: any;
    setNodeRef?: any;
    style?: any;
  };
}

export function SmartTile({ automationId, hideEditButton = false, sortableProps }: SmartTileProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const automations = useSmartStore((s) => s.automations);
  const toggleAutomationFavorite = useSmartStore((s) => s.toggleAutomationFavorite);
  const toggleAutomationEnabled = useSmartStore((s) => s.toggleAutomationEnabled);

  const automation = useMemo(
    () => automations.find((a) => a.id === automationId),
    [automations, automationId]
  );

  if (!automation) return null;

  const IconComponent = (LucideIcons as any)[automation.icon] || LucideIcons.Bot;
  const isFavorite = automation.isFavorite ?? false;
  const actionCount = automation.actions.length;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleAutomationFavorite(automationId);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditDialogOpen(true);
  };

  const handleEnabledChange = (checked: boolean) => {
    toggleAutomationEnabled(automationId);
    toast({
      title: checked ? "Automatisation activée" : "Automatisation désactivée",
      description: `"${automation.name}" est maintenant ${checked ? "active" : "inactive"}.`,
    });
  };

  return (
    <>
      <Card
        ref={sortableProps?.setNodeRef}
        style={sortableProps?.style}
        {...sortableProps?.attributes}
        {...sortableProps?.listeners}
        className={cn(
          "group relative overflow-hidden glass-card elevated-subtle elevated-active border-border/50 transition-opacity",
          sortableProps && "cursor-grab active:cursor-grabbing touch-none",
          !automation.enabled && "opacity-60"
        )}
      >
        <SmartBadge />

        <div className="p-4 pt-10">
          {/* Header aligné sur RoutineTile */}
          <div className="mt-1 flex items-start gap-3 mb-4">
            {/* Icône principale */}
            <div className="w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center bg-primary/20 text-primary">
              <IconComponent className="h-8 w-8" />
            </div>

            {/* Infos + actions */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-base truncate mb-0.5">{automation.name}</h3>
                  <Users 
                    className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" 
                    aria-label="Automation Home Assistant"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {!hideEditButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary flex-shrink-0"
                      onClick={handleEditClick}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="Modifier l'automatisation"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  
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

              {/* Actions count */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Play className="h-3.5 w-3.5" />
                <span className="truncate">{actionCount} action{actionCount > 1 ? "s" : ""}</span>
              </div>

              {automation.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {automation.description}
                </p>
              )}
            </div>
          </div>

          {/* Footer: Toggle enabled */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {automation.enabled ? "Active" : "Désactivée"}
            </span>
            <Switch
              checked={automation.enabled}
              onCheckedChange={handleEnabledChange}
              aria-label={automation.enabled ? "Désactiver l'automatisation" : "Activer l'automatisation"}
            />
          </div>
        </div>
      </Card>

      <SmartWizard 
        automation={automation} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />
    </>
  );
}
