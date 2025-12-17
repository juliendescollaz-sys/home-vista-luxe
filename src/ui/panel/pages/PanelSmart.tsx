/**
 * Page Smart pour le mode PANEL
 * Copie complète de la version Tablet (src/pages/Smart.tsx)
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 */

import { useState, useEffect } from "react";
import { useSmartStore } from "@/store/useSmartStore";
import { useHAStore } from "@/store/useHAStore";
import { SmartEmptyState } from "@/components/smart/SmartEmptyState";
import { SmartTile } from "@/components/smart/SmartTile";
import { SmartWizard } from "@/components/smart/SmartWizard";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

export function PanelSmart() {
  const { automations, loadAutomations, isLoading } = useSmartStore();
  const { client, entities } = useHAStore();
  const [showWizard, setShowWizard] = useState(false);

  // Load automations from HA when page mounts or entities change
  useEffect(() => {
    if (client && entities.length > 0) {
      loadAutomations();
    }
  }, [client, entities.length, loadAutomations]);

  const hasAutomations = automations.length > 0;

  if (isLoading && automations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {hasAutomations ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                {automations.length} automatisation{automations.length > 1 ? "s" : ""} configurée{automations.length > 1 ? "s" : ""}
              </p>
              <Button onClick={() => setShowWizard(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Créer une automatisation
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {automations.map((automation) => (
                <SmartTile key={automation.id} automationId={automation.id} />
              ))}
            </div>
          </>
        ) : (
          <SmartEmptyState onCreateAutomation={() => setShowWizard(true)} />
        )}
      </div>

      <SmartWizard 
        open={showWizard} 
        onOpenChange={setShowWizard}
      />
    </div>
  );
}
