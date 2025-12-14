/**
 * Page Routines pour le mode PANEL
 * Copie de la version Routines.tsx
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 */

import { useEffect, useRef, useState } from "react";
import { useRoutineStore } from "@/store/useRoutineStore";
import { useHAStore } from "@/store/useHAStore";
import { RoutineEmptyState } from "@/components/routines/RoutineEmptyState";
import { RoutineWizard } from "@/components/routines/RoutineWizard";
import { RoutineTile } from "@/components/routines/RoutineTile";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getGridClasses } from "@/lib/gridLayout";

export function PanelRoutines() {
  const [wizardOpen, setWizardOpen] = useState(false);

  const entitiesLength = useHAStore((s) => s.entities.length);
  const hasClient = useHAStore((s) => !!s.client);

  const sharedRoutines = useRoutineStore((s) => s.sharedRoutines);
  const loadSharedRoutines = useRoutineStore((s) => s.loadSharedRoutines);

  const hasLoadedFromEntitiesRef = useRef(false);
  const hasLoadedWithClientRef = useRef(false);

  useEffect(() => {
    if (entitiesLength > 0 && !hasLoadedFromEntitiesRef.current) {
      hasLoadedFromEntitiesRef.current = true;
      loadSharedRoutines();
    }
  }, [entitiesLength, loadSharedRoutines]);

  useEffect(() => {
    if (hasClient && !hasLoadedWithClientRef.current) {
      hasLoadedWithClientRef.current = true;
      loadSharedRoutines();
    }
  }, [hasClient, loadSharedRoutines]);

  const routines = sharedRoutines;
  const hasRoutines = routines.length > 0;

  return (
    <div className="w-full h-full bg-background">
      {!hasRoutines ? (
        <div className="max-w-screen-xl mx-auto px-6 py-6">
          <RoutineEmptyState onCreateRoutine={() => setWizardOpen(true)} />
        </div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              {routines.length} routine{routines.length > 1 ? "s" : ""} configurée
              {routines.length > 1 ? "s" : ""}
            </p>
            <Button onClick={() => setWizardOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer une routine
            </Button>
          </div>

          <div className={getGridClasses("cards", "panel" as any)}>
            {routines.map((routine) => (
              <RoutineTile key={routine.id} routineId={routine.id} />
            ))}
          </div>
        </div>
      )}

      <RoutineWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
