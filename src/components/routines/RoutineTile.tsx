import { useState, useMemo } from "react";
import { NeoliaRoutine, DAYS_OF_WEEK, MONTHS } from "@/types/routines";
import { useRoutineStore } from "@/store/useRoutineStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Star, Users, Pencil, Clock, Trash2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { RoutineWizard } from "./RoutineWizard";
import { RoutineBadge } from "./RoutineBadge";
import { format, parseISO, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const sharedRoutines = useRoutineStore((s) => s.sharedRoutines);
  const toggleRoutineFavorite = useRoutineStore((s) => s.toggleRoutineFavorite);
  const toggleRoutineEnabled = useRoutineStore((s) => s.toggleRoutineEnabled);
  const deleteRoutine = useRoutineStore((s) => s.deleteRoutine);

  const routine = useMemo(
    () => sharedRoutines.find((r) => r.id === routineId),
    [sharedRoutines, routineId]
  );

  if (!routine) return null;

  const IconComponent = (LucideIcons as any)[routine.icon] || LucideIcons.Clock;
  const isFavorite = routine.isFavorite ?? false;

  // Check if routine is expired (for "once" frequency)
  const isExpired = useMemo(() => {
    if (routine.schedule.frequency !== "once" || !routine.schedule.date) {
      return false;
    }
    const scheduledDateTime = parseISO(`${routine.schedule.date}T${routine.schedule.time}:00`);
    return isBefore(scheduledDateTime, new Date());
  }, [routine.schedule]);

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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    await deleteRoutine(routineId);
    setDeleteDialogOpen(false);
    toast({
      title: "Routine supprimée",
      description: `"${routine.name}" a été supprimée.`,
    });
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
        if (schedule.date) {
          try {
            const dateObj = parseISO(schedule.date);
            const formattedDate = format(dateObj, "d MMMM yyyy", { locale: fr });
            return `Le ${formattedDate} à ${time}`;
          } catch {
            return `${schedule.date} à ${time}`;
          }
        }
        return `Date unique à ${time}`;
      case "daily":
        if (schedule.daysOfWeek && schedule.daysOfWeek.length < 7) {
          const selectedDays = schedule.daysOfWeek
            .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label || "")
            .join(", ");
          return `${selectedDays} à ${time}`;
        }
        return `Tous les jours à ${time}`;
      case "weekly":
        const weekDay = DAYS_OF_WEEK.find(d => d.value === schedule.dayOfWeek)?.fullLabel || "Lundi";
        return `Chaque ${weekDay} à ${time}`;
      case "monthly":
        return `Le ${schedule.dayOfMonth || 1} de chaque mois à ${time}`;
      case "yearly":
        const monthLabel = MONTHS.find(m => m.value === schedule.month)?.label || "janvier";
        return `Le ${schedule.dayOfMonthYearly || 1} ${monthLabel} à ${time}`;
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
          (!routine.enabled || isExpired) && "opacity-60"
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
                  <Users 
                    className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" 
                    aria-label="Automation Home Assistant"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {!hideEditButton && !isExpired && (
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

          {/* Footer: Toggle enabled OR Delete button for expired */}
          <div className="flex items-center justify-between">
            {isExpired ? (
              <>
                <span className="text-sm text-muted-foreground">Expirée</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8"
                  onClick={handleDeleteClick}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Supprimer
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">
                  {routine.enabled ? "Active" : "Désactivée"}
                </span>
                <Switch
                  checked={routine.enabled}
                  onCheckedChange={handleEnabledChange}
                  aria-label={routine.enabled ? "Désactiver la routine" : "Activer la routine"}
                />
              </>
            )}
          </div>
        </div>
      </Card>

      <RoutineWizard 
        routine={routine} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la routine expirée</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer « {routine.name} » ? 
              Cette routine a déjà été exécutée et sera supprimée de Home Assistant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
