/**
 * Page Smart pour le mode PANEL
 * Copie complète de la version Tablet (src/pages/Smart.tsx)
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 */

import { useState } from "react";
import { useSmartStore } from "@/store/useSmartStore";
import { SmartEmptyState } from "@/components/smart/SmartEmptyState";
import { SmartTile } from "@/components/smart/SmartTile";
import { SmartWizard } from "@/components/smart/SmartWizard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function PanelSmart() {
  const { automations } = useSmartStore();
  const [showWizard, setShowWizard] = useState(false);

  const hasAutomations = automations.length > 0;

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {hasAutomations ? (
          <>
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
