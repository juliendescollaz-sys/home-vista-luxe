/**
 * Page Groupes pour le mode PANEL
 * Copie complète de la version Tablet (src/pages/Groupes.tsx)
 * SANS TopBar ni BottomNav (gérés par PanelRootLayout)
 */
import { useState, useEffect, useMemo } from "react";
import { useGroupStore } from "@/store/useGroupStore";
import { GroupWizard } from "@/components/groups/GroupWizard";
import { GroupTile } from "@/components/groups/GroupTile";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, X, AlertTriangle } from "lucide-react";
import { getGridClasses } from "@/lib/gridLayout";

export function PanelGroupes() {
  const [wizardOpen, setWizardOpen] = useState(false);

  const groups = useGroupStore((state) => state.groups);
  const syncSharedGroupsFromHA = useGroupStore((state) => state.syncSharedGroupsFromHA);
  const runtime = useGroupStore((state) => state.runtime);
  const setGroupError = useGroupStore((state) => state.setGroupError);

  // Collecter les erreurs de groupes
  const groupErrors = useMemo(() => {
    return Object.entries(runtime)
      .filter(([_, r]) => r.lastError)
      .map(([groupId, r]) => ({ groupId, error: r.lastError! }));
  }, [runtime]);

  // Synchroniser les groupes partagés au montage
  useEffect(() => {
    syncSharedGroupsFromHA().catch(console.error);
  }, [syncSharedGroupsFromHA]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 pt-[24px] pb-4">
        {/* Bannière d'erreur globale pour les groupes */}
        {groupErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur de contrôle de groupe</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{groupErrors[0].error}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2"
                onClick={() => setGroupError(groupErrors[0].groupId, null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            {groups.length} groupe{groups.length > 1 ? "s" : ""} configuré{groups.length > 1 ? "s" : ""}
          </p>
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Créer un groupe
          </Button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12" />
        ) : (
          <div className={getGridClasses("cards", "tablet")}>
            {groups.map(group => (
              <GroupTile key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>

      <GroupWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
