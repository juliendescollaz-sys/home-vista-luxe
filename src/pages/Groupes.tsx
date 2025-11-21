import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useGroupStore } from "@/store/useGroupStore";
import { GroupWizard } from "@/components/groups/GroupWizard";
import { GroupTile } from "@/components/groups/GroupTile";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const Groupes = () => {
  const { displayMode } = useDisplayMode();
  
  const [wizardOpen, setWizardOpen] = useState(false);
  const { groups, syncSharedGroupsFromHA } = useGroupStore();

  // Synchroniser les groupes partagés au montage
  useEffect(() => {
    syncSharedGroupsFromHA().catch(console.error);
  }, [syncSharedGroupsFromHA]);


  return (
    <div className="w-full h-full bg-background">
      {displayMode === "mobile" && <TopBar title="Groupes" />}
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <GroupTile
                key={group.id}
                group={group}
              />
            ))}
          </div>
        )}
      </div>

      {displayMode === "mobile" && <BottomNav />}
      <GroupWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
};

export default Groupes;
