import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoutineWizardDraft } from "@/types/routines";
import { cn } from "@/lib/utils";

interface RoutineNameStepProps {
  draft: RoutineWizardDraft;
  onUpdate: (updates: Partial<RoutineWizardDraft>) => void;
}

export function RoutineNameStep({ draft, onUpdate }: RoutineNameStepProps) {
  const isNameValid = draft.name.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="routine-name">Nom de la routine</Label>
        <Input
          id="routine-name"
          placeholder="Ex: Réveil semaine, Départ boulot, Bonne nuit..."
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
          instantanément votre routine. Choisissez quelque chose de parlant comme 
          "Réveil semaine" ou "Mode nuit".
        </p>
      </div>
    </div>
  );
}
