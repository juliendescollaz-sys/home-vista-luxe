import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { 
  AlertTriangle, Bell, Flame, Droplet, 
  DoorOpen, Activity, Shield, ShieldAlert 
} from "lucide-react";
import { getAlertSeverity, translateDeviceClass } from "@/lib/entityUtils";

interface AlertTileProps {
  entity: HAEntity;
}

const getIconForAlert = (deviceClass?: string) => {
  const icons: Record<string, any> = {
    motion: Activity,
    door: DoorOpen,
    window: DoorOpen,
    opening: DoorOpen,
    smoke: Flame,
    gas: Flame,
    moisture: Droplet,
    problem: AlertTriangle,
    safety: Shield,
    tamper: ShieldAlert,
    vibration: Activity,
  };
  return icons[deviceClass || ""] || Bell;
};

export function AlertTile({ entity }: AlertTileProps) {
  const name = entity.attributes.friendly_name || entity.entity_id;
  const deviceClass = entity.attributes.device_class;
  const isActive = entity.state === "on";
  const severity = getAlertSeverity(entity);
  
  const Icon = getIconForAlert(deviceClass);
  const label = translateDeviceClass(deviceClass);
  
  const severityColors = {
    critical: {
      bg: "bg-destructive/20",
      text: "text-destructive",
      border: "border-destructive/30",
      glow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]",
    },
    warning: {
      bg: "bg-warning/20",
      text: "text-warning",
      border: "border-warning/30",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    },
    info: {
      bg: "bg-muted/50",
      text: "text-muted-foreground",
      border: "border-border/50",
      glow: "",
    },
  };
  
  const colors = isActive ? severityColors[severity] : severityColors.info;
  
  return (
    <Card className={`glass-card elevated-subtle border overflow-hidden ${colors.border} ${isActive ? colors.glow : ''}`}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${colors.bg} ${colors.text}`}>
            <Icon className="h-6 w-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate mb-0.5">{name}</h3>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isActive 
              ? `${colors.bg} ${colors.text}` 
              : 'bg-muted/50 text-muted-foreground'
          }`}>
            {isActive ? "Actif" : "Inactif"}
          </div>
        </div>
        
        {isActive && severity !== "info" && (
          <div className={`mt-3 pt-3 border-t ${colors.border}`}>
            <div className={`flex items-center gap-2 text-xs ${colors.text}`}>
              <AlertTriangle className="h-3 w-3" />
              <span>
                {severity === "critical" 
                  ? "Alerte critique - Vérifiez immédiatement" 
                  : "Attention requise"}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
