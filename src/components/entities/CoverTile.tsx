import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { ChevronUp, ChevronDown, Square, Blinds } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { supportsFeature, COVER_FEATURES } from "@/lib/entityUtils";
import { toast } from "sonner";

interface CoverTileProps {
  entity: HAEntity;
  onControl: (service: string, data?: any) => Promise<void>;
}

export function CoverTile({ entity, onControl }: CoverTileProps) {
  const state = entity.state;
  const name = entity.attributes.friendly_name || entity.entity_id;
  const currentPosition = entity.attributes.current_position || 0;
  const currentTilt = entity.attributes.current_tilt_position || 0;
  
  const supportsPosition = supportsFeature(entity, COVER_FEATURES.SUPPORT_SET_POSITION);
  const supportsStop = supportsFeature(entity, COVER_FEATURES.SUPPORT_STOP);
  const supportsTilt = supportsFeature(entity, COVER_FEATURES.SUPPORT_SET_TILT_POSITION);
  
  const [position, setPosition] = useState(currentPosition);
  const [tilt, setTilt] = useState(currentTilt);
  
  useEffect(() => {
    setPosition(currentPosition);
    setTilt(currentTilt);
  }, [currentPosition, currentTilt]);
  
  const handleOpen = async () => {
    try {
      await onControl("open_cover");
      toast.success("Ouverture");
    } catch (error) {
      toast.error("Erreur");
    }
  };
  
  const handleClose = async () => {
    try {
      await onControl("close_cover");
      toast.success("Fermeture");
    } catch (error) {
      toast.error("Erreur");
    }
  };
  
  const handleStop = async () => {
    try {
      await onControl("stop_cover");
      toast.success("Arrêt");
    } catch (error) {
      toast.error("Erreur");
    }
  };
  
  const handlePositionCommit = async (value: number[]) => {
    try {
      await onControl("set_cover_position", { position: value[0] });
    } catch (error) {
      toast.error("Erreur");
    }
  };
  
  const handleTiltCommit = async (value: number[]) => {
    try {
      await onControl("set_cover_tilt_position", { tilt_position: value[0] });
    } catch (error) {
      toast.error("Erreur");
    }
  };
  
  return (
    <Card className="glass-card elevated-subtle elevated-active border-border/50 overflow-hidden">
      <div className="p-4 pt-12">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${
            state === "open" ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Blinds className="h-8 w-8" />
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{name}</h3>
            <p className="text-sm text-muted-foreground capitalize">
              {state === "open" ? "Ouvert" : state === "closed" ? "Fermé" : state}
              {supportsPosition && ` • ${currentPosition}%`}
            </p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpen}
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Ouvrir
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
          >
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Fermer
          </Button>
        </div>
      </div>
    </Card>
  );
}
