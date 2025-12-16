import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Sunrise, Thermometer, Users, Lightbulb, Shield } from "lucide-react";

interface SmartEmptyStateProps {
  onCreateAutomation: () => void;
}

export function SmartEmptyState({ onCreateAutomation }: SmartEmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold">
              Bienvenue dans l'automatisation intelligente
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              C'est ici que la magie opère ! Créez des automatisations qui réagissent 
              intelligemment à votre environnement : lumière, température, présence, heure de la journée…
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground text-center">
              Quelques exemples de ce que vous pouvez faire :
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sunrise className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Éclairage extérieur</p>
                  <p className="text-xs text-muted-foreground">
                    À la tombée de la nuit, les lumières du jardin s'allument automatiquement
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Thermometer className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Confort climatique</p>
                  <p className="text-xs text-muted-foreground">
                    Si la température dépasse 26°C, la climatisation s'active
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Gestion de présence</p>
                  <p className="text-xs text-muted-foreground">
                    Quand tout le monde quitte la maison, tout s'éteint et l'alarme s'active
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Éclairage intelligent</p>
                  <p className="text-xs text-muted-foreground">
                    Les lumières s'adaptent à la luminosité ambiante et à votre présence
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm font-medium">Comment ça fonctionne ?</p>
            </div>
            <p className="text-xs text-muted-foreground text-justify">
              Chaque automatisation suit le principe <strong>SI... ALORS...</strong> (IFTTT) :
              définissez un <strong>déclencheur</strong> (quand ça commence), 
              des <strong>conditions</strong> optionnelles (seulement si...), 
              et les <strong>actions</strong> à exécuter. Vous pouvez combiner plusieurs 
              conditions avec ET ou OU pour des scénarios complexes.
            </p>
          </div>

          <Button size="lg" onClick={onCreateAutomation} className="w-full sm:w-auto">
            <Bot className="w-4 h-4 mr-2" />
            Créer votre première automatisation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
