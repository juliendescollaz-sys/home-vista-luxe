import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SceneWizardDraft } from "@/types/scenes";

interface SceneDescriptionStepProps {
  draft: SceneWizardDraft;
  onUpdate: (updates: Partial<SceneWizardDraft>) => void;
}

export function SceneDescriptionStep({ draft, onUpdate }: SceneDescriptionStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="scene-description">Description (optionnel)</Label>
        <Textarea
          id="scene-description"
          placeholder="Décrivez brièvement ce que fait cette scène..."
          value={draft.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={4}
          className="focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {draft.description.length}/200 caractères
        </p>
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Pourquoi une description ?</span> Une courte description vous aide à 
          vous souvenir de ce que fait exactement cette scène. Par exemple : "Éteint toutes les lumières 
          sauf la veilleuse du couloir".
        </p>
      </div>
    </div>
  );
}
