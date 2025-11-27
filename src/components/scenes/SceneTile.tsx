import { useState } from "react";
import { NeoliaScene } from "@/types/scenes";
import { useSceneStore } from "@/store/useSceneStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Star, Play, Loader2, User, Users } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface SceneTileProps {
  scene: NeoliaScene;
}

export function SceneTile({ scene }: SceneTileProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  
  const executeScene = useSceneStore((s) => s.executeScene);
  const toggleSceneFavorite = useSceneStore((s) => s.toggleSceneFavorite);

  const IconComponent = (LucideIcons as any)[scene.icon] || LucideIcons.Sparkles;

  const handleExecute = async () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    try {
      await executeScene(scene.id);
      toast({
        title: "Scène activée",
        description: `"${scene.name}" a été activée avec succès.`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'activer la scène.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      className={cn(
        "relative p-4 rounded-2xl border bg-card transition-all",
        "hover:shadow-md hover:border-primary/20"
      )}
    >
      {/* Scope badge */}
      <div className="absolute top-3 left-3">
        {scene.scope === "shared" ? (
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <User className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Favorite button */}
      <button
        onClick={() => toggleSceneFavorite(scene.id)}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-accent/50 transition-colors"
      >
        <Star
          className={cn(
            "w-4 h-4",
            scene.isFavorite
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground"
          )}
        />
      </button>

      <div className="flex flex-col items-center text-center pt-4 space-y-3">
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center",
            "bg-primary/10"
          )}
        >
          <IconComponent className="w-7 h-7 text-primary" />
        </div>

        <div className="space-y-1">
          <h3 className="font-medium line-clamp-1">{scene.name}</h3>
          {scene.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {scene.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {scene.entities.length} appareil{scene.entities.length > 1 ? "s" : ""}
          </p>
        </div>

        <Button
          onClick={handleExecute}
          disabled={isExecuting}
          className="w-full"
          variant="secondary"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Activation...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Activer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
