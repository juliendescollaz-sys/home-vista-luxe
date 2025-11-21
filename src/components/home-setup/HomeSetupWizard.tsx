import { useHomeProjectStore } from "@/store/useHomeProjectStore";
import { NameStep } from "./steps/NameStep";
import { LevelsStep } from "./steps/LevelsStep";
import { RoomsStep } from "./steps/RoomsStep";
import { PlanPreparationStep } from "./steps/PlanPreparationStep";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const HomeSetupWizard = () => {
  const {
    project,
    currentWizardStep,
    setProject,
    updateProject,
    setWizardStep,
  } = useHomeProjectStore();

  const totalSteps = 4;
  const progress = ((currentWizardStep + 1) / totalSteps) * 100;

  const handleNameNext = (name: string) => {
    if (!project) {
      const newProject = {
        id: crypto.randomUUID(),
        name,
        levels: [],
        rooms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProject(newProject);
    } else {
      updateProject({ name });
    }
    setWizardStep(1);
  };

  const handleLevelsNext = (levels: typeof project.levels) => {
    updateProject({ levels });
    setWizardStep(2);
  };

  const handleRoomsNext = (rooms: typeof project.rooms) => {
    updateProject({ rooms });
    setWizardStep(3);
  };

  const handlePlanNext = () => {
    toast.success("Configuration enregistrée");
    // TODO: Navigate to 2D editor (étape 2 du projet global)
    console.log("Navigate to 2D editor with project:", project);
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Étape {currentWizardStep + 1} sur {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="glass-card elevated-subtle border-border/50 rounded-2xl p-6 md:p-8">
          {currentWizardStep === 0 && (
            <NameStep
              initialName={project?.name || ""}
              onNext={handleNameNext}
            />
          )}

          {currentWizardStep === 1 && project && (
            <LevelsStep
              levels={project.levels}
              onNext={handleLevelsNext}
              onBack={() => setWizardStep(0)}
            />
          )}

          {currentWizardStep === 2 && project && (
            <RoomsStep
              levels={project.levels}
              rooms={project.rooms}
              onNext={handleRoomsNext}
              onBack={() => setWizardStep(1)}
            />
          )}

          {currentWizardStep === 3 && (
            <PlanPreparationStep
              onNext={handlePlanNext}
              onBack={() => setWizardStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
