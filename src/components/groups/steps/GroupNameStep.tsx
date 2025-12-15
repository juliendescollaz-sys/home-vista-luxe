import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface GroupNameStepProps {
  name: string;
  onNameChange: (name: string) => void;
}

export function GroupNameStep({ name, onNameChange }: GroupNameStepProps) {
  const isNameValid = name.trim().length >= 3;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="group-name">Nom du groupe</Label>
        <Input
          id="group-name"
          placeholder="Ex: Éclairage salon, Volets étage..."
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={cn(
            "focus-visible:ring-0 focus-visible:ring-offset-0 text-lg",
            !isNameValid && name !== "" && "border-destructive"
          )}
          autoFocus
        />
        {name.trim().length > 0 && name.trim().length < 3 && (
          <p className="text-sm text-destructive">Minimum 3 caractères</p>
        )}
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Pourquoi un nom ?</span> Un nom évocateur vous permet de reconnaître 
          instantanément votre groupe dans la liste. Choisissez quelque chose de parlant comme 
          "Éclairage salon" ou "Volets étage".
        </p>
      </div>
    </div>
  );
}
