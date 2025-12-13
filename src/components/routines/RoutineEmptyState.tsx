import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Sparkles, Zap } from "lucide-react";

interface RoutineEmptyStateProps {
  onCreateRoutine: () => void;
}

export function RoutineEmptyState({ onCreateRoutine }: RoutineEmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              Aucune routine n'a encore été créée
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Une routine automatise vos actions à des moments précis : réveil, départ, coucher…
              Programmez l'allumage des lumières, l'activation d'une scène ou le contrôle de vos appareils.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Quelle est la différence entre une routine et une scène ?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Scène</p>
                  <p className="text-xs text-muted-foreground">
                    S'active manuellement d'un seul geste
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Routine</p>
                  <p className="text-xs text-muted-foreground">
                    S'exécute automatiquement à l'heure programmée
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Combinez appareils, scènes et groupes dans vos routines. La création est guidée étape par étape.
          </p>

          <Button size="lg" onClick={onCreateRoutine} className="w-full sm:w-auto">
            <Clock className="w-4 h-4 mr-2" />
            Créez votre première routine
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
