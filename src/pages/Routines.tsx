import { useState, useEffect, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useRoutineStore } from "@/store/useRoutineStore";
import { useHAStore } from "@/store/useHAStore";
import { RoutineEmptyState } from "@/components/routines/RoutineEmptyState";
import { RoutineWizard } from "@/components/routines/RoutineWizard";
import { RoutineTile } from "@/components/routines/RoutineTile";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getGridClasses } from "@/lib/gridLayout";

const Routines = () => {
  const { displayMode } = useDisplayMode();
  const [wizardOpen, setWizardOpen] = useState(false);

  const entitiesLength = useHAStore((s) => s.entities.length);
  const hasClient = useHAStore((s) => !!s.client);

  const sharedRoutines = useRoutineStore((s) => s.sharedRoutines);
  const loadSharedRoutines = useRoutineStore((s) => s.loadSharedRoutines);

  const hasLoadedFromEntitiesRef = useRef(false);
  const hasLoadedWithClientRef = useRef(false);

  // 1) Load once when entities are available (fast list)
  useEffect(() => {
    if (entitiesLength > 0 && !hasLoadedFromEntitiesRef.current) {
      hasLoadedFromEntitiesRef.current = true;
      loadSharedRoutines();
    }
  }, [entitiesLength, loadSharedRoutines]);

  // 2) Reload once when client becomes available (rebuild schedule/actions/meta icon)
  useEffect(() => {
    if (hasClient && !hasLoadedWithClientRef.current) {
      hasLoadedWithClientRef.current = true;
      loadSharedRoutines();
    }
  }, [hasClient, loadSharedRoutines]);

  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-[24px]";
  const rootClassName =
    displayMode === "mobile"
      ? `min-h-screen bg-background pb-24 ${ptClass}`
      : "min-h-screen bg-background";

  const routines = sharedRoutines;
  const hasRoutines = routines.length > 0;

  return (
    <div className={rootClassName}>
      <TopBar title="Routines" />

      {!hasRoutines ? (
        <RoutineEmptyState onCreateRoutine={() => setWizardOpen(true)} />
      ) : (
        <div className="max-w-screen-xl mx-auto px-4 pt-[24px] pb-4">
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

          <div className={`${getGridClasses("cards", displayMode)} stagger-fade-in`}>
            {routines.map((routine) => (
              <RoutineTile key={routine.id} routineId={routine.id} />
            ))}
          </div>
        </div>
      )}

      <RoutineWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <BottomNav />
    </div>
  );
};

export default Routines;
