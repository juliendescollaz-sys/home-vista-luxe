import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CityPicker } from "@/components/CityPicker";

interface WeatherConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCitySaved?: () => void;
}

export const WeatherConfigDialog = ({ open, onOpenChange, onCitySaved }: WeatherConfigDialogProps) => {
  const handleCitySaved = () => {
    // Fermer immédiatement et proprement
    if (onCitySaved) {
      onCitySaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md top-[10%] translate-y-0">
        <DialogHeader>
          <DialogTitle>Configuration Météo</DialogTitle>
          <DialogDescription>
            Sélectionnez une ville pour afficher la météo
          </DialogDescription>
        </DialogHeader>
        <CityPicker onCitySaved={handleCitySaved} />
      </DialogContent>
    </Dialog>
  );
};
