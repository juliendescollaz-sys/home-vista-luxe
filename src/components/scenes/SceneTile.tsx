import { useState } from "react";
import { NeoliaScene } from "@/types/scenes";
import { useSceneStore } from "@/store/useSceneStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Star, Play, Loader2, User, Users, Pencil } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { SceneWizard } from "./SceneWizard";
import { SceneBadge } from "./SceneBadge";

interface SceneTileProps {
  sceneId: string;
  hideEditButton?: boolean;
  sortableProps?: {
    attributes?: any;
    listeners?: any;
    setNodeRef?: any;
    style?: any;
  };
}

export function SceneTile({ sceneId, hideEditButton = false, sortableProps }: SceneTileProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Souscrire directement au store pour obtenir les données à jour
  const scene = useSceneStore((s) => s.scenes.find((sc) => sc.id === sceneId));
  const executeScene = useSceneStore((s) => s.executeScene);
  const toggleSceneFavorite = useSceneStore((s) => s.toggleSceneFavorite);

  // Si la scène n'existe plus, ne rien afficher
  if (!scene) return null;

  const IconComponent = (LucideIcons as any)[scene.icon] || LucideIcons.Sparkles;
  const isFavorite = scene.isFavorite ?? false;

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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleSceneFavorite(sceneId);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditDialogOpen(true);
  };

  return (
    <>
      <Card
        ref={sortableProps?.setNodeRef}
        style={sortableProps?.style}
        {...sortableProps?.attributes}
        {...sortableProps?.listeners}
        className={cn(
          "group relative overflow-hidden glass-card elevated-subtle elevated-active border-border/50 transition-opacity",
          sortableProps && "cursor-grab active:cursor-grabbing touch-none"
        )}
      >
        {/* Overlay spinner pendant l'exécution */}
        {isExecuting && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-black/30 backdrop-blur-sm pointer-events-auto">
            <div className="w-6 h-6 border-[2px] border-white/25 border-t-white/80 rounded-full animate-spin" />
          </div>
        )}

        <SceneBadge />

        <div className="p-4 pt-10">
          {/* Header aligné sur GroupTile */}
          <div className="mt-1 flex items-start gap-3 mb-4">
            {/* Icône principale */}
            <div className="w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center bg-primary/20 text-primary">
              <IconComponent className="h-8 w-8" />
            </div>

            {/* Infos + actions */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-base truncate mb-0.5">{scene.name}</h3>
                  {scene.scope === "shared" ? (
                    <Users 
                      className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" 
                      aria-label="Scène partagée"
                    />
                  ) : (
                    <User 
                      className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" 
                      aria-label="Scène locale (app uniquement)"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Bouton édition (crayon) */}
                  {!hideEditButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary flex-shrink-0"
                      onClick={handleEditClick}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="Modifier la scène"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Bouton favoris - même style que GroupTile (bleu/primary) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={handleFavoriteClick}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Star className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </Button>
                </div>
              </div>

              {scene.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                  {scene.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {scene.entities.length} appareil{scene.entities.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Bouton d'activation */}
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
      </Card>

      <SceneWizard 
        scene={scene} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />
    </>
  );
}
