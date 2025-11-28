import { useState, useEffect, useMemo, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useSceneStore } from "@/store/useSceneStore";
import { useHAStore } from "@/store/useHAStore";
import { SceneEmptyState } from "@/components/scenes/SceneEmptyState";
import { SceneWizard } from "@/components/scenes/SceneWizard";
import { SceneTile } from "@/components/scenes/SceneTile";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Scenes = () => {
  const { displayMode } = useDisplayMode();
  const [wizardOpen, setWizardOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  const entitiesLength = useHAStore((s) => s.entities.length);
  const localScenes = useSceneStore((s) => s.localScenes);
  const sharedScenes = useSceneStore((s) => s.sharedScenes);
  const loadSharedScenes = useSceneStore((s) => s.loadSharedScenes);

  // Memoize combined scenes to avoid new array on each render
  const scenes = useMemo(
    () => [...localScenes, ...sharedScenes],
    [localScenes, sharedScenes]
  );

  // Load shared scenes once when HA entities are available
  useEffect(() => {
    if (entitiesLength > 0 && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadSharedScenes();
    }
  }, [entitiesLength, loadSharedScenes]);

  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-[26px]";
  const rootClassName =
    displayMode === "mobile"
      ? `min-h-screen bg-background pb-24 ${ptClass}`
      : "w-full h-full overflow-y-auto";

  const hasScenes = scenes.length > 0;

  return (
    <div className={rootClassName}>
      <TopBar title="Scènes" />

      {!hasScenes ? (
        <SceneEmptyState onCreateScene={() => setWizardOpen(true)} />
      ) : (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold">Mes scènes</h1>
              <p className="text-sm text-muted-foreground">
                {scenes.length} scène{scenes.length > 1 ? "s" : ""} configurée{scenes.length > 1 ? "s" : ""}
              </p>
            </div>
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle scène
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {scenes.map((scene) => (
              <SceneTile key={scene.id} sceneId={scene.id} />
            ))}
          </div>
        </div>
      )}

      <SceneWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <BottomNav />
    </div>
  );
};

export default Scenes;
