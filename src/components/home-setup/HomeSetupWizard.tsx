import { useState } from "react";
import { useHomeProjectStore } from "@/store/useHomeProjectStore";
import { FloorsCountStep } from "./steps/FloorsCountStep";
import { FloorsNamingStep } from "./steps/FloorsNamingStep";
import { RoomsStep } from "./steps/RoomsStep";
import { PlanTutorialStep } from "./steps/PlanTutorialStep";
import { Progress } from "@/components/ui/progress";

export const HomeSetupWizard = () => {
  const { project, addLevel, addRoom, currentWizardStep, setWizardStep } =
    useHomeProjectStore();

  const [floorCount, setFloorCount] = useState(1);

  const handleFloorsCountNext = (count: number) => {
    setFloorCount(count);
    if (count === 1) {
      // Skip naming step for single floor, create default floor
      if (project) {
        addLevel({ name: "Rez-de-chaussée", type: "interior", order: 0 });
        setWizardStep(2);
      }
    } else {
      setWizardStep(1);
    }
  };

  const handleFloorsNamingNext = (floors: Array<{ name: string; type: "interior" | "exterior" }>) => {
    if (project) {
      floors.forEach((floor, index) => {
        addLevel({ ...floor, order: index });
      });
      setWizardStep(2);
    }
  };

  const handleRoomsNext = (rooms: Array<{ name: string; type?: string; levelId: string }>) => {
    if (project) {
      rooms.forEach((room) => {
        addRoom(room);
      });
      setWizardStep(3);
    }
  };

  const totalSteps = 4;
  const progress = ((currentWizardStep + 1) / totalSteps) * 100;

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
            <FloorsCountStep onNext={handleFloorsCountNext} />
          )}

          {currentWizardStep === 1 && (
            <FloorsNamingStep
              floorCount={floorCount}
              onNext={handleFloorsNamingNext}
              onBack={() => setWizardStep(0)}
            />
          )}

          {currentWizardStep === 2 && project && (
            <RoomsStep
              levels={project.levels}
              rooms={project.rooms}
              onNext={handleRoomsNext}
              onBack={() => setWizardStep(floorCount === 1 ? 0 : 1)}
            />
          )}

          {currentWizardStep === 3 && (
            <PlanTutorialStep
              onBack={() => setWizardStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
