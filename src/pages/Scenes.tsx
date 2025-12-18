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
import { getGridClasses } from "@/lib/gridLayout";

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

  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-[24px]";
  const rootClassName =
    displayMode === "mobile"
      ? `min-h-screen bg-background pb-24 ${ptClass}`
      : "min-h-screen bg-background";

  const hasScenes = scenes.length > 0;

  return (
    <div className={rootClassName}>
      <TopBar title="Scènes" />

      {!hasScenes ? (
        <SceneEmptyState onCreateScene={() => setWizardOpen(true)} />
      ) : (
        <div className="max-w-screen-xl mx-auto px-4 pt-[24px] pb-4">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              {scenes.length} scène{scenes.length > 1 ? "s" : ""} configurée{scenes.length > 1 ? "s" : ""}
            </p>
            <Button onClick={() => setWizardOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer une scène
            </Button>
          </div>

          <div className={`${getGridClasses("cards", displayMode)} stagger-fade-in`}>
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
