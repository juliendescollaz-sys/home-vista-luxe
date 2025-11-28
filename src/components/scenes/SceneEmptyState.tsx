import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Package } from "lucide-react";

interface SceneEmptyStateProps {
  onCreateScene: () => void;
}

export function SceneEmptyState({ onCreateScene }: SceneEmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              Aucune scène n'a encore été créée
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Une scène vous permet de lancer plusieurs actions en un seul geste : 
              allumer des lumières, fermer les volets, ajuster le volume, régler la température…
              Créez des ambiances comme « Soirée cinéma », « Nuit », « Départ de la maison » ou « Réveil en douceur ».
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Quelle est la différence entre une scène et un groupe ?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Groupe</p>
                  <p className="text-xs text-muted-foreground">
                    Contrôle plusieurs appareils identiques en même temps (ON/OFF)
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Scène</p>
                  <p className="text-xs text-muted-foreground">
                    Définit un état précis pour chaque appareil (intensité, couleur, position…)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Tous types d'appareils sont supportés. La création est guidée étape par étape, en quelques clics.
          </p>

          <Button size="lg" onClick={onCreateScene} className="w-full sm:w-auto">
            <Sparkles className="w-4 h-4 mr-2" />
            Créez votre première scène
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
