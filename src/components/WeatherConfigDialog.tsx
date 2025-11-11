import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useHAStore } from "@/store/useHAStore";
import { Cloud } from "lucide-react";
import { toast } from "sonner";

interface WeatherConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WeatherConfigDialog = ({ open, onOpenChange }: WeatherConfigDialogProps) => {
  const entities = useHAStore((state) => state.entities);
  const weatherEntity = useHAStore((state) => state.weatherEntity);
  const setWeatherEntity = useHAStore((state) => state.setWeatherEntity);
  
  const [selectedEntity, setSelectedEntity] = useState<string | null>(weatherEntity);

  // Filtrer les entités météo
  const weatherEntities = entities.filter((e) => 
    e.entity_id.startsWith("weather.")
  );

  const handleSave = () => {
    setWeatherEntity(selectedEntity);
    toast.success(selectedEntity ? "Météo configurée" : "Configuration effacée");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurer la météo</DialogTitle>
          <DialogDescription>
            Sélectionnez l'entité météo à afficher sur la page d'accueil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {weatherEntities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cloud className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucune entité météo trouvée</p>
              <p className="text-sm mt-2">
                Configurez une intégration météo dans Home Assistant
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {weatherEntities.map((entity) => (
                <button
                  key={entity.entity_id}
                  onClick={() => setSelectedEntity(entity.entity_id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedEntity === entity.entity_id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {entity.attributes.friendly_name || entity.entity_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {entity.state} - {entity.attributes.temperature}°
                      </p>
                    </div>
                    <Cloud className={`h-6 w-6 ${
                      selectedEntity === entity.entity_id 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedEntity && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedEntity(null)}
            >
              Effacer la sélection
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
