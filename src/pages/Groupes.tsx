import { TopBar } from "@/components/TopBar";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useGroupStore } from "@/store/useGroupStore";
import { GroupWizard } from "@/components/groups/GroupWizard";
import { GroupTile } from "@/components/groups/GroupTile";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, X, AlertTriangle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getGridClasses } from "@/lib/gridLayout";
const Groupes = () => {
  const {
    displayMode
  } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-[24px]";
  const [wizardOpen, setWizardOpen] = useState(false);
  const {
    groups,
    syncSharedGroupsFromHA,
    runtime,
    setGroupError
  } = useGroupStore();

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
  const rootClassName = displayMode === "mobile" ? `min-h-screen bg-background pb-24 ${ptClass}` : "min-h-screen bg-background";
  return <div className={rootClassName}>
      <TopBar title="Groupes" />
      
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
            Créez des groupes pour contrôler plusieurs appareils simultanément
          </p>
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Créer un groupe
          </Button>
        </div>

        {groups.length === 0 ? <div className="text-center py-12">
            
            
          </div> : <div className={getGridClasses("cards", displayMode)}>
            {groups.map(group => <GroupTile key={group.id} group={group} />)}
          </div>}
      </div>

      <GroupWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>;
};
export default Groupes;