import { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useSmartStore } from "@/store/useSmartStore";
import { useHAStore } from "@/store/useHAStore";
import { SmartEmptyState } from "@/components/smart/SmartEmptyState";
import { SmartTile } from "@/components/smart/SmartTile";
import { SmartWizard } from "@/components/smart/SmartWizard";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

const Smart = () => {
  const { displayMode } = useDisplayMode();
  const { automations, loadAutomations, isLoading } = useSmartStore();
  const { client, entities } = useHAStore();
  const [showWizard, setShowWizard] = useState(false);

  // Load automations from HA when page mounts or entities change
  useEffect(() => {
    if (client && entities.length > 0) {
      loadAutomations();
    }
  }, [client, entities.length, loadAutomations]);

  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-[24px]";
  const rootClassName = displayMode === "mobile" 
    ? `min-h-screen bg-background pb-24 ${ptClass}`
    : "min-h-screen bg-background";

  const hasAutomations = automations.length > 0;

  return (
    <div className={rootClassName}>
      <TopBar title="Smarthome" />
      
      {isLoading && automations.length === 0 ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !hasAutomations ? (
        <SmartEmptyState onCreateAutomation={() => setShowWizard(true)} />
      ) : (
        <div className="max-w-screen-xl mx-auto px-4 pt-[24px] pb-4">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              {automations.length} automatisation{automations.length > 1 ? "s" : ""} configurée{automations.length > 1 ? "s" : ""}
            </p>
            <Button onClick={() => setShowWizard(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer une automatisation
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade-in">
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
