import { SmartWizardDraft } from "@/types/smart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          className="focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <p className="text-xs text-muted-foreground">
          Choisissez un nom descriptif qui résume ce que fait cette automatisation.
        </p>
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Comment fonctionne une automatisation ?</span> Une automatisation suit le principe{" "}
          <strong>QUAND... SI... ALORS...</strong> : définissez un <strong>déclencheur</strong> (quand ça commence), 
          des <strong>conditions</strong> optionnelles (seulement si...), et les <strong>actions</strong> à exécuter.
        </p>
      </div>
    </div>
  );
}
