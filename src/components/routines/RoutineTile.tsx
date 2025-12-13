import { useState, useMemo } from "react";
import { NeoliaRoutine } from "@/types/routines";
import { useRoutineStore } from "@/store/useRoutineStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Star, User, Users, Pencil, Clock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { RoutineWizard } from "./RoutineWizard";
import { RoutineBadge } from "./RoutineBadge";

interface RoutineTileProps {
  routineId: string;
  hideEditButton?: boolean;
  sortableProps?: {
    attributes?: any;
    listeners?: any;
    setNodeRef?: any;
    style?: any;
  };
}

export function RoutineTile({ routineId, hideEditButton = false, sortableProps }: RoutineTileProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const localRoutines = useRoutineStore((s) => s.localRoutines);
  const sharedRoutines = useRoutineStore((s) => s.sharedRoutines);
  const toggleRoutineFavorite = useRoutineStore((s) => s.toggleRoutineFavorite);
  const toggleRoutineEnabled = useRoutineStore((s) => s.toggleRoutineEnabled);

  const routine = useMemo(
    () => [...localRoutines, ...sharedRoutines].find((r) => r.id === routineId),
    [localRoutines, sharedRoutines, routineId]
  );

  if (!routine) return null;

  const IconComponent = (LucideIcons as any)[routine.icon] || LucideIcons.Clock;
  const isFavorite = routine.isFavorite ?? false;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleRoutineFavorite(routineId);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditDialogOpen(true);
  };

  const handleEnabledChange = (checked: boolean) => {
    toggleRoutineEnabled(routineId);
    toast({
      title: checked ? "Routine activée" : "Routine désactivée",
      description: `"${routine.name}" est maintenant ${checked ? "active" : "inactive"}.`,
    });
  };

  const formatSchedule = (routine: NeoliaRoutine): string => {
    const { schedule } = routine;
    const time = schedule.time;
    
    switch (schedule.frequency) {
      case "once":
        return `${schedule.date} à ${time}`;
      case "daily":
        if (schedule.daysOfWeek && schedule.daysOfWeek.length < 7) {
          const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
          const selectedDays = schedule.daysOfWeek.map(d => days[d]).join(", ");
          return `${selectedDays} à ${time}`;
        }
        return `Tous les jours à ${time}`;
      case "weekly":
        const weekDays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        return `Chaque ${weekDays[schedule.dayOfWeek || 1]} à ${time}`;
      case "monthly":
        return `Le ${schedule.dayOfMonth || 1} de chaque mois à ${time}`;
      case "yearly":
        const months = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
        return `Le ${schedule.dayOfMonthYearly || 1} ${months[schedule.month || 1]} à ${time}`;
      default:
        return time;
    }
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
          !routine.enabled && "opacity-60"
        )}
      >
        <RoutineBadge />

        <div className="p-4 pt-10">
          {/* Header aligné sur GroupTile */}
          <div className="mt-1 flex items-start gap-3 mb-4">
            {/* Icône principale */}
            <div className="w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center bg-primary/20 text-primary">
              <IconComponent className="h-8 w-8" />
            </div>

            {/* Infos + actions */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-base truncate mb-0.5">{routine.name}</h3>
                  {routine.scope === "shared" ? (
                    <Users 
                      className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" 
                      aria-label="Routine partagée"
                    />
                  ) : (
                    <User 
                      className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" 
                      aria-label="Routine locale"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {!hideEditButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary flex-shrink-0"
                      onClick={handleEditClick}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="Modifier la routine"
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

              {/* Schedule info */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="truncate">{formatSchedule(routine)}</span>
              </div>

              {routine.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {routine.description}
                </p>
              )}
            </div>
          </div>

          {/* Toggle enabled */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {routine.enabled ? "Active" : "Désactivée"}
            </span>
            <Switch
              checked={routine.enabled}
              onCheckedChange={handleEnabledChange}
              aria-label={routine.enabled ? "Désactiver la routine" : "Activer la routine"}
            />
          </div>
        </div>
      </Card>

      <RoutineWizard 
        routine={routine} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />
    </>
  );
}
