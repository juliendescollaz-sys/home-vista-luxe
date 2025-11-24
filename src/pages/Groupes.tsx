import { TopBar } from "@/components/TopBar";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useGroupStore } from "@/store/useGroupStore";
import { GroupWizard } from "@/components/groups/GroupWizard";
import { GroupTile } from "@/components/groups/GroupTile";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getGridClasses } from "@/lib/gridLayout";

const Groupes = () => {
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-[26px]";
  
  const [wizardOpen, setWizardOpen] = useState(false);
  const { groups, syncSharedGroupsFromHA } = useGroupStore();

  // Synchroniser les groupes partagés au montage
  useEffect(() => {
    syncSharedGroupsFromHA().catch(console.error);
  }, [syncSharedGroupsFromHA]);


  const rootClassName = displayMode === "mobile" 
    ? `min-h-screen bg-background pb-24 ${ptClass}`
    : "w-full h-full flex items-center justify-center";

  return (
    <div className={rootClassName}>
      <TopBar title="Groupes" />
      
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Créez des groupes pour contrôler plusieurs appareils simultanément
          </p>
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Créer un groupe
          </Button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Aucun groupe créé pour le moment</p>
            <Button onClick={() => setWizardOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Créer votre premier groupe
            </Button>
          </div>
        ) : (
          <div className={getGridClasses("cards", displayMode)}>
            {groups.map((group) => (
              <GroupTile
                key={group.id}
                group={group}
              />
            ))}
          </div>
        )}
      </div>

      <GroupWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
};

export default Groupes;
