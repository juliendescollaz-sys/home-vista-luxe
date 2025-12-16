import { SmartWizardDraft } from "@/types/smart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Info } from "lucide-react";

interface SmartNameStepProps {
  draft: SmartWizardDraft;
  onUpdate: (updates: Partial<SmartWizardDraft>) => void;
}

export function SmartNameStep({ draft, onUpdate }: SmartNameStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nom de l'automatisation *</Label>
        <Input
          id="name"
          value={draft.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Ex: Éclairage extérieur au coucher du soleil"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Choisissez un nom descriptif qui résume ce que fait cette automatisation.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optionnelle)</Label>
        <Textarea
          id="description"
          value={draft.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Ex: Allume les lumières du jardin 30 minutes après le coucher du soleil, uniquement si quelqu'un est à la maison."
          rows={3}
        />
      </div>

      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Comment fonctionne une automatisation ?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Une automatisation suit le principe <strong>QUAND... SI... ALORS...</strong> :<br />
              • <strong>QUAND</strong> : le déclencheur (événement qui démarre l'automatisation)<br />
              • <strong>SI</strong> : les conditions optionnelles (vérifient si l'automatisation doit s'exécuter)<br />
              • <strong>ALORS</strong> : les actions à exécuter
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
