import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wand2, Sunrise, Thermometer, Users, Lightbulb, Shield } from "lucide-react";

interface SmartEmptyStateProps {
  onCreateAutomation: () => void;
}

export function SmartEmptyState({ onCreateAutomation }: SmartEmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Wand2 className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Bienvenue dans l&apos;automatisation intelligente</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              C&apos;est ici que la magie opère ! Créez des automatisations qui réagissent intelligemment à votre
              environnement : lumière, température, présence, heure de la journée…
            </p>
          </div>

          {/* SECTION EXEMPLES — STRUCTURE CORRIGÉE */}
          <div className="space-y-4">
            {/* Le titre est maintenant dans un conteneur à hauteur contrôlée */}
            <div className="flex items-center justify-center min-h-[48px]">
              <p className="text-sm font-medium text-foreground">Quelques exemples de ce que vous pouvez faire :</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sunrise className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Éclairage extérieur</p>
                  <p className="text-xs text-muted-foreground">
                    À la tombée de la nuit, les lumières du jardin s&apos;allument automatiquement
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
                    Si la température dépasse 26°C, la climatisation s&apos;active
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
                    Quand tout le monde quitte la maison, tout s&apos;éteint et l&apos;alarme s&apos;active
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
                    Les lumières s&apos;adaptent à la luminosité ambiante et à votre présence
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-left">
            <div className="flex items-center gap-3 mb-1.5">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm font-medium">Comment ça fonctionne ?</p>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              Chaque automatisation suit le principe <strong>SI... ALORS...</strong> (IFTTT) : définissez un{" "}
              <strong>déclencheur</strong> (quand ça commence), des <strong>conditions</strong> optionnelles (seulement
              si...), et les <strong>actions</strong> à exécuter. Vous pouvez combiner plusieurs conditions avec ET ou
              OU pour des scénarios complexes.
            </p>
          </div>

          <Button size="lg" onClick={onCreateAutomation} className="w-full sm:w-auto px-6 h-auto py-3 whitespace-normal text-center">
            <Wand2 className="w-4 h-4 mr-2 shrink-0" />
            <span>Créer votre première automatisation</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
