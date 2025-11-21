import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHomeProjectStore } from "@/store/useHomeProjectStore";

interface WelcomeScreenProps {
  onStart?: () => void;
}

export const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
  const { setProject, setWizardStep } = useHomeProjectStore();

  const handleStart = () => {
    // Créer un projet minimal pour démarrer le wizard
    const newProject = {
      id: crypto.randomUUID(),
      name: "",
      levels: [],
      rooms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProject(newProject);
    setWizardStep(0);
    
    if (onStart) {
      onStart();
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Home className="w-16 h-16 text-primary" strokeWidth={1.5} />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">Bienvenue !</h1>
          <p className="text-muted-foreground text-lg">
            Construisons ensemble le plan de votre maison.
          </p>
        </div>
        
        <Button 
          onClick={handleStart}
          size="lg"
          className="w-full max-w-xs mx-auto h-12 text-base"
        >
          Commencer
        </Button>
      </div>
    </div>
  );
};
