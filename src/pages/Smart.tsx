import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useSmartStore } from "@/store/useSmartStore";
import { SmartEmptyState } from "@/components/smart/SmartEmptyState";
import { SmartTile } from "@/components/smart/SmartTile";
import { SmartWizard } from "@/components/smart/SmartWizard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Smart = () => {
  const { displayMode } = useDisplayMode();
  const { automations } = useSmartStore();
  const [showWizard, setShowWizard] = useState(false);

  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-[24px]";
  const rootClassName = displayMode === "mobile" 
    ? `min-h-screen bg-background pb-24 ${ptClass}`
    : "min-h-screen bg-background";

  const hasAutomations = automations.length > 0;

  return (
    <div className={rootClassName}>
      <TopBar title="Smarthome" />
      
      {!hasAutomations ? (
        <SmartEmptyState onCreateAutomation={() => setShowWizard(true)} />
      ) : (
        <div className="max-w-screen-xl mx-auto px-4 pt-[24px] pb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Mes automatisations</h2>
            <Button onClick={() => setShowWizard(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {automations.map((automation) => (
              <SmartTile key={automation.id} automationId={automation.id} />
            ))}
          </div>
        </div>
      )}

      <SmartWizard 
        open={showWizard} 
        onOpenChange={setShowWizard}
      />
    </div>
  );
};

export default Smart;
