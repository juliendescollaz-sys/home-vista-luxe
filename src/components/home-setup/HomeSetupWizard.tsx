import { useState } from "react";
import { useHomeProjectStore } from "@/store/useHomeProjectStore";
import { FloorsCountStep } from "./steps/FloorsCountStep";
import { FloorsNamingStep } from "./steps/FloorsNamingStep";
import { PlanPreparationStep } from "./steps/PlanPreparationStep";
import { useNavigate } from "react-router-dom";

export const HomeSetupWizard = () => {
  const { project, addLevel, currentWizardStep, setWizardStep, resetProject } =
    useHomeProjectStore();
  const navigate = useNavigate();

  const [floorCount, setFloorCount] = useState(1);

  const handleFloorsCountNext = (count: number) => {
    setFloorCount(count);
    if (count === 1) {
      // Skip naming step for single floor, create default floor
      if (project) {
        addLevel({ name: "Rez-de-chaussée", type: "interior", order: 0 });
        setWizardStep(2); // Go to plan preparation
      }
    } else {
      setWizardStep(1); // Go to naming step
    }
  };

  const handleBackToWelcome = () => {
    resetProject();
  };

  const handleFloorsNamingNext = (floors: Array<{ name: string; type: "interior" | "exterior" }>) => {
    if (project) {
      floors.forEach((floor, index) => {
        addLevel({ ...floor, order: index });
      });
      setWizardStep(2); // Go to plan preparation
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="glass-card elevated-subtle border-border/50 rounded-2xl p-6 md:p-8">
          {currentWizardStep === 0 && (
            <FloorsCountStep onNext={handleFloorsCountNext} onBack={handleBackToWelcome} />
          )}

          {currentWizardStep === 1 && (
            <FloorsNamingStep
              floorCount={floorCount}
              onNext={handleFloorsNamingNext}
              onBack={() => setWizardStep(0)}
            />
          )}

          {currentWizardStep === 2 && (
            <PlanPreparationStep
              onBack={() => setWizardStep(floorCount === 1 ? 0 : 1)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
