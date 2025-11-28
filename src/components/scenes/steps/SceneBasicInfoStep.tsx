import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SceneIconPicker } from "../SceneIconPicker";
import { SceneWizardDraft, SceneScope } from "@/types/scenes";
import { User, Users } from "lucide-react";

interface SceneBasicInfoStepProps {
  draft: SceneWizardDraft;
  onUpdate: (updates: Partial<SceneWizardDraft>) => void;
}

export function SceneBasicInfoStep({ draft, onUpdate }: SceneBasicInfoStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="scene-name">Nom de la scène *</Label>
        <Input
          id="scene-name"
          placeholder="Ex: Soirée cinéma, Réveil, Départ de la maison..."
          value={draft.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Choisissez un nom évocateur pour reconnaître rapidement votre scène.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Icône de la scène *</Label>
        <SceneIconPicker
          selectedIcon={draft.icon}
          onSelectIcon={(icon) => onUpdate({ icon })}
        />
      </div>

      <div className="space-y-3">
        <Label>Portée de la scène</Label>
        <RadioGroup
          value={draft.scope}
          onValueChange={(value: SceneScope) => onUpdate({ scope: value })}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <label
            htmlFor="scope-local"
            className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="local" id="scope-local" className="mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <User className="w-4 h-4" />
                Local uniquement
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Visible seulement dans cette application Neolia.
              </p>
            </div>
          </label>

          <label
            htmlFor="scope-shared"
            className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="shared" id="scope-shared" className="mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Users className="w-4 h-4" />
                Partagée
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Accessible à tous les utilisateurs de la maison.
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scene-description">Description (optionnel)</Label>
        <Textarea
          id="scene-description"
          placeholder="Décrivez brièvement ce que fait cette scène..."
          value={draft.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <p>
          <span className="font-semibold">Pourquoi ces informations ?</span> Le nom et l'icône vous permettent 
          de reconnaître rapidement la scène. La portée détermine si elle est personnelle 
          ou partagée avec toute la maison.
        </p>
      </div>
    </div>
  );
}
