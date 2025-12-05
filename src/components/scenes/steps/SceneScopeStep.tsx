import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SceneWizardDraft, SceneScope } from "@/types/scenes";
import { User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SceneScopeStepProps {
  draft: SceneWizardDraft;
  onUpdate: (updates: Partial<SceneWizardDraft>) => void;
  isEditMode?: boolean;
}

export function SceneScopeStep({ draft, onUpdate, isEditMode = false }: SceneScopeStepProps) {
  const isScopeSelected = draft.scope === "local" || draft.scope === "shared";

  if (isEditMode) {
    // Edit mode: read-only display
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="flex items-center gap-1">
            Portée de la scène
            <span className="text-xs font-normal text-muted-foreground ml-1">(non modifiable)</span>
          </Label>

          <div
            className="grid grid-cols-1 gap-3"
            onClick={() => toast.info("La portée d'une scène ne peut pas être modifiée après sa création.")}
          >
            <div
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-not-allowed",
                draft.scope === "local" ? "border-primary/50 bg-primary/5 opacity-70" : "opacity-40 border-muted"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center",
                  draft.scope === "local" ? "border-primary" : "border-muted-foreground/50"
                )}
              >
                {draft.scope === "local" && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <User className="w-5 h-5" />
                  Local uniquement
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Visible seulement dans cette application Neolia.
                </p>
              </div>
            </div>

            <div
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-not-allowed",
                draft.scope === "shared" ? "border-primary/50 bg-primary/5 opacity-70" : "opacity-40 border-muted"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center",
                  draft.scope === "shared" ? "border-primary" : "border-muted-foreground/50"
                )}
              >
                {draft.scope === "shared" && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <Users className="w-5 h-5" />
                  Partagée
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Créée dans Home Assistant, accessible à tous les utilisateurs.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Pourquoi verrouillé ?</span> La portée d'une scène définit où elle est 
            stockée. Une fois créée, il n'est pas possible de la migrer vers l'autre type.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Portée de la scène</Label>

        <RadioGroup
          value={draft.scope}
          onValueChange={(value: SceneScope) => onUpdate({ scope: value })}
          className="grid grid-cols-1 gap-3"
        >
          <label
            htmlFor="scope-local"
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors",
              "has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5",
              !isScopeSelected && "border-dashed"
            )}
          >
            <RadioGroupItem value="local" id="scope-local" className="mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <User className="w-5 h-5" />
                Local uniquement
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Visible seulement dans cette application Neolia. Idéal pour vos préférences personnelles.
              </p>
            </div>
          </label>

          <label
            htmlFor="scope-shared"
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors",
              "has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5",
              !isScopeSelected && "border-dashed"
            )}
          >
            <RadioGroupItem value="shared" id="scope-shared" className="mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Users className="w-5 h-5" />
                Partagée
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Créée dans Home Assistant, accessible à tous les utilisateurs de la maison.
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Quelle différence ?</span> Les scènes locales sont privées et 
          stockées sur cet appareil. Les scènes partagées sont visibles par tous via Home Assistant.
        </p>
      </div>
    </div>
  );
}
