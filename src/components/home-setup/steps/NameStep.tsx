import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NameStepProps {
  initialName?: string;
  onNext: (name: string) => void;
}

export const NameStep = ({ initialName = "", onNext }: NameStepProps) => {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onNext(name.trim());
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Nom de votre maison</h2>
        <p className="text-muted-foreground">
          Choisissez un nom pour votre maison. Vous pourrez le changer plus tard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="home-name">Nom</Label>
          <Input
            id="home-name"
            type="text"
            placeholder="Ma Maison"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg h-12"
            autoFocus
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full h-12"
          disabled={!name.trim()}
        >
          Continuer
        </Button>
      </form>
    </div>
  );
};
