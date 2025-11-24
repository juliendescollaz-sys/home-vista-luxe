import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { Droplets, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface ValveTileProps {
  entity: HAEntity;
  onControl: (service: string, data?: any) => Promise<void>;
}

export function ValveTile({ entity, onControl }: ValveTileProps) {
  const isOpen = entity.state === "on" || entity.state === "open";
  const name = entity.attributes.friendly_name || entity.entity_id;
  
  const [isPending, setIsPending] = useState(false);
  
  const handleToggle = async () => {
    setIsPending(true);
    try {
      await onControl(isOpen ? "turn_off" : "turn_on");
      toast.success(isOpen ? "Fermée" : "Ouverte");
    } catch (error) {
      toast.error("Erreur");
    } finally {
      setTimeout(() => setIsPending(false), 1000);
    }
  };
  
  return (
    <Card className="glass-card elevated-subtle elevated-active border-border/50 overflow-hidden">
      <div className="p-4">
        <div className="mt-1 flex items-start gap-3 mb-4">
          <div className={`w-14 h-14 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${
            isOpen ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
          }`}>
            <Droplets className="h-8 w-8" />
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-base truncate mb-0.5">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {isOpen ? "Ouverte" : "Fermée"}
            </p>
          </div>
        </div>
        
        <div className="space-y-3 pt-2 border-t border-border/30">
          <Button
            onClick={handleToggle}
            disabled={isPending}
            className="w-full"
            variant={isOpen ? "destructive" : "default"}
          >
            {isPending ? "En cours..." : isOpen ? "Fermer la vanne" : "Ouvrir la vanne"}
          </Button>
          
          {isOpen && (
            <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 p-2 rounded">
              <AlertTriangle className="h-3 w-3" />
              <span>Vanne ouverte - Surveiller l'usage</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
