import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Sparkles, Layers } from "lucide-react";

interface GroupEmptyStateProps {
  onCreateGroup: () => void;
}

export function GroupEmptyState({ onCreateGroup }: GroupEmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              Aucun groupe n'a encore été créé
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Un groupe vous permet de contrôler plusieurs appareils en même temps d'un seul geste :
              allumer toutes les lumières du salon, fermer tous les volets du rez-de-chaussée, 
              éteindre tous les appareils de la maison…
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Quelle est la différence entre un groupe et une scène ?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Groupe</p>
                  <p className="text-xs text-muted-foreground">
                    Contrôle identique sur tous les appareils (allumer/éteindre ensemble)
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
                    État personnalisé par appareil (intensité, couleur, position…)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Vous pouvez créer des groupes mono-type (que des lumières) ou mixtes (lumières + prises). 
            La création est guidée étape par étape.
          </p>

          <Button size="lg" onClick={onCreateGroup} className="w-full sm:w-auto">
            <Package className="w-4 h-4 mr-2" />
            Créez votre premier groupe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
