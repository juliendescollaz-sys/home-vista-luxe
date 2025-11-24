import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { Lock, Unlock, Battery, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface LockTileProps {
  entity: HAEntity;
  onControl: (service: string, data?: any) => Promise<void>;
}

export function LockTile({ entity, onControl }: LockTileProps) {
  const isLocked = entity.state === "locked";
  const name = entity.attributes.friendly_name || entity.entity_id;
  const battery = entity.attributes.battery_level;
  
  const [isPending, setIsPending] = useState(false);
  
  const handleLock = async () => {
    setIsPending(true);
    try {
      await onControl(isLocked ? "unlock" : "lock");
      toast.success(isLocked ? "Déverrouillé" : "Verrouillé");
    } catch (error) {
      toast.error("Erreur");
    } finally {
      setTimeout(() => setIsPending(false), 1000);
    }
  };
  
  const batteryLow = typeof battery === "number" && battery < 20;
  
  return (
    <Card className="glass-card elevated-subtle elevated-active border-border/50 overflow-hidden">
      <div className="p-4">
        <div className="mt-1 flex items-start gap-3 mb-4">
          <div className={`w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${
            isLocked ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
          }`}>
            {isLocked ? (
              <Lock className="h-8 w-8" />
            ) : (
              <Unlock className="h-8 w-8" />
            )}
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {isLocked ? "Verrouillé" : "Déverrouillé"}
            </p>
          </div>
        </div>
        
        <div className="space-y-3 pt-2 border-t border-border/30">
          {battery !== undefined && (
            <div className={`flex items-center justify-between text-sm p-2 rounded ${
              batteryLow ? 'bg-destructive/10 text-destructive' : 'bg-muted/30'
            }`}>
              <div className="flex items-center gap-2">
                <Battery className="h-4 w-4" />
                <span>Batterie</span>
              </div>
              <span className="font-medium">{battery}%</span>
            </div>
          )}
          
          {batteryLow && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
              <AlertTriangle className="h-3 w-3" />
              <span>Batterie faible - Remplacer bientôt</span>
            </div>
          )}
          
          <Button
            onClick={handleLock}
            disabled={isPending}
            className="w-full"
            variant={isLocked ? "outline" : "default"}
          >
            {isPending ? (
              "En cours..."
            ) : isLocked ? (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Déverrouiller
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Verrouiller
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
