import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { Download, Check, AlertTriangle, Clock, Battery } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isBatteryTooLow, isSleeping } from "@/lib/entityUtils";
import { toast } from "sonner";
import { useState } from "react";

interface UpdateTileProps {
  entity: HAEntity;
  onUpdate: () => Promise<void>;
}

export function UpdateTile({ entity, onUpdate }: UpdateTileProps) {
  const name = entity.attributes.friendly_name || entity.entity_id;
  const installedVersion = entity.attributes.installed_version;
  const latestVersion = entity.attributes.latest_version;
  const inProgress = entity.attributes.in_progress;
  const progress = entity.attributes.progress || 0;
  
  const [isUpdating, setIsUpdating] = useState(false);
  
  const isUpToDate = entity.state === "on" ? false : true;
  const batteryLow = isBatteryTooLow(entity);
  const sleeping = isSleeping(entity);
  
  const handleUpdate = async () => {
    if (batteryLow) {
      toast.error("Batterie insuffisante. Veuillez remplacer les piles pour effectuer la mise à jour.");
      return;
    }
    
    if (sleeping) {
      toast.warning("Appareil endormi. Réveillez l'appareil puis réessayez.");
      return;
    }
    
    setIsUpdating(true);
    try {
      await onUpdate();
      toast.success("Mise à jour lancée");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <Card className="glass-card elevated-subtle border-border/50 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${
            isUpToDate 
              ? 'bg-success/20 text-success' 
              : inProgress
              ? 'bg-primary/20 text-primary animate-pulse'
              : 'bg-warning/20 text-warning'
          }`}>
            {isUpToDate ? (
              <Check className="h-6 w-6" />
            ) : inProgress ? (
              <Clock className="h-6 w-6" />
            ) : (
              <Download className="h-6 w-6" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate mb-0.5">{name}</h3>
            <p className="text-xs text-muted-foreground">
              Version {installedVersion}
              {!isUpToDate && latestVersion && ` → ${latestVersion}`}
            </p>
          </div>
        </div>
        
        {inProgress && (
          <div className="mb-3 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Installation en cours... {Math.round(progress)}%
            </p>
          </div>
        )}
        
        {!isUpToDate && !inProgress && (
          <div className="space-y-2">
            {batteryLow && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                <Battery className="h-3 w-3" />
                <span>Batterie insuffisante ({entity.attributes.battery_level}%)</span>
              </div>
            )}
            
            {sleeping && (
              <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 p-2 rounded">
                <Clock className="h-3 w-3" />
                <span>Appareil endormi - Réveillez-le pour continuer</span>
              </div>
            )}
            
            <Button
              onClick={handleUpdate}
              disabled={isUpdating || batteryLow || sleeping}
              className="w-full"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              {isUpdating ? "Installation..." : "Mettre à jour"}
            </Button>
          </div>
        )}
        
        {isUpToDate && (
          <div className="flex items-center gap-2 text-xs text-success bg-success/10 p-2 rounded">
            <Check className="h-3 w-3" />
            <span>Firmware à jour</span>
          </div>
        )}
      </div>
    </Card>
  );
}
