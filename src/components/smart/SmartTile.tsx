import { useState, useMemo } from "react";
import { SmartAutomation, TRIGGER_TYPE_LABELS } from "@/types/smart";
import { useSmartStore } from "@/store/useSmartStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Star, Users, Pencil, Zap, GitBranch, Play } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { SmartWizard } from "./SmartWizard";

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

  // Build summary of triggers and conditions
  const triggerSummary = useMemo(() => {
    if (automation.triggers.length === 0) return "Aucun déclencheur";
    const firstTrigger = automation.triggers[0];
    const label = TRIGGER_TYPE_LABELS[firstTrigger.type]?.label || "Déclencheur";
    if (automation.triggers.length === 1) return label;
    return `${label} +${automation.triggers.length - 1}`;
  }, [automation.triggers]);

  const conditionCount = useMemo(() => {
    return automation.conditions.groups.reduce((acc, g) => acc + g.conditions.length, 0);
  }, [automation.conditions]);

  const actionCount = automation.actions.length;

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
        {/* Badge shared */}
        <div className="absolute top-3 left-3 z-10">
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
            <Users className="h-3 w-3 mr-1" />
            Home Assistant
          </Badge>
        </div>

        <div className="p-4 pt-10">
          {/* Header aligné sur GroupTile/RoutineTile */}
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

              {/* Trigger info */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
                <span className="truncate">{triggerSummary}</span>
              </div>

              {automation.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {automation.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
            {conditionCount > 0 && (
              <div className="flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5" />
                <span>{conditionCount} condition{conditionCount > 1 ? "s" : ""}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Play className="h-3.5 w-3.5" />
              <span>{actionCount} action{actionCount > 1 ? "s" : ""}</span>
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
