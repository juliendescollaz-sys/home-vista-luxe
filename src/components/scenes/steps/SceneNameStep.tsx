import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SceneWizardDraft } from "@/types/scenes";
import { cn } from "@/lib/utils";

interface SceneNameStepProps {
  draft: SceneWizardDraft;
  onUpdate: (updates: Partial<SceneWizardDraft>) => void;
}

export function SceneNameStep({ draft, onUpdate }: SceneNameStepProps) {
  const isNameValid = draft.name.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="scene-name">Nom de la scène</Label>
        <Input
          id="scene-name"
          placeholder="Ex: Soirée cinéma, Réveil, Départ de la maison..."
          value={draft.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className={cn(
            "focus-visible:ring-0 focus-visible:ring-offset-0 text-lg",
            !isNameValid && draft.name !== "" && "border-destructive"
          )}
          autoFocus
        />
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Pourquoi un nom ?</span> Un nom évocateur vous permet de reconnaître 
          instantanément votre scène dans la liste. Choisissez quelque chose de parlant comme 
          "Soirée cinéma" ou "Réveil en douceur".
        </p>
      </div>
    </div>
  );
}
