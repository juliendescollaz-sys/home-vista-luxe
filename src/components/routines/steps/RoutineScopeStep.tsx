import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { RoutineWizardDraft, RoutineScope } from "@/types/routines";
import { User, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RoutineScopeStepProps {
  draft: RoutineWizardDraft;
  onUpdate: (updates: Partial<RoutineWizardDraft>) => void;
  isEditMode?: boolean;
}

export function RoutineScopeStep({ draft, onUpdate, isEditMode = false }: RoutineScopeStepProps) {
  // In edit mode, scope is read-only
  if (isEditMode) {
    const handleClick = () => {
      toast({
        title: "Portée non modifiable",
        description: "La portée d'une routine ne peut pas être modifiée après sa création.",
      });
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Label>Portée de la routine</Label>

          <div
            className="flex items-start gap-4 p-4 rounded-lg border-2 border-primary bg-primary/5 cursor-not-allowed opacity-70"
            onClick={handleClick}
          >
            {draft.scope === "shared" ? (
              <Users className="h-6 w-6 text-primary mt-0.5" />
            ) : (
              <User className="h-6 w-6 text-primary mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {draft.scope === "shared" ? "Routine partagée" : "Routine locale"}
              </p>
              <p className="text-sm text-muted-foreground">
                {draft.scope === "shared"
                  ? "Automation Home Assistant (s'exécute même si l'app est fermée)"
                  : "Stockée uniquement dans l'application"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Note :</span> La portée d'une routine ne peut pas être 
            modifiée après sa création. Pour changer la portée, supprimez cette routine et créez-en une nouvelle.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Portée de la routine</Label>

        <RadioGroup
          value={draft.scope}
          onValueChange={(value: RoutineScope) => onUpdate({ scope: value })}
          className="space-y-3"
        >
          <label
            htmlFor="scope-shared"
            className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              draft.scope === "shared"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="shared" id="scope-shared" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">Routine partagée</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Créée comme automation Home Assistant. S'exécute automatiquement même si l'application est fermée.
                Visible sur tous les appareils connectés à Home Assistant.
              </p>
            </div>
          </label>

          <label
            htmlFor="scope-local"
            className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              draft.scope === "local"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="local" id="scope-local" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Routine locale</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Stockée uniquement sur cet appareil. Ne s'exécute pas automatiquement (nécessite l'app ouverte).
                Parfait pour des tests ou routines personnelles.
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Recommandation :</span> Choisissez "Partagée" pour que votre routine 
          s'exécute automatiquement à l'heure programmée, même sans avoir l'application ouverte.
        </p>
      </div>
    </div>
  );
}
