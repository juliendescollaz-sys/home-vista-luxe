import { Card } from "@/components/ui/card";
import { HAEntity } from "@/types/homeassistant";
import { 
  Thermometer, Droplets, Gauge, Wind, Activity, 
  Zap, Battery, Sun, Cloud, AlertTriangle 
} from "lucide-react";
import { formatSensorValue, translateDeviceClass } from "@/lib/entityUtils";

interface SensorTileProps {
  entity: HAEntity;
}

const getIconForSensor = (deviceClass?: string) => {
  const icons: Record<string, any> = {
    temperature: Thermometer,
    humidity: Droplets,
    pressure: Gauge,
    battery: Battery,
    power: Zap,
    energy: Activity,
    illuminance: Sun,
    aqi: Cloud,
    voltage: Zap,
    current: Zap,
    wind_speed: Wind,
  };
  return icons[deviceClass || ""] || Gauge;
};

export function SensorTile({ entity }: SensorTileProps) {
  const name = entity.attributes.friendly_name || entity.entity_id;
  const deviceClass = entity.attributes.device_class;
  const unit = entity.attributes.unit_of_measurement;
  const value = formatSensorValue(entity.state, unit);
  
  const Icon = getIconForSensor(deviceClass);
  const label = translateDeviceClass(deviceClass);
  
  // Déterminer la couleur selon la valeur
  const isLowBattery = deviceClass === "battery" && parseFloat(entity.state) < 20;
  const isUnavailable = entity.state === "unavailable" || entity.state === "unknown";
  
  return (
    <Card className="glass-card elevated-subtle border-border/50 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex-shrink-0 transition-all flex items-center justify-center ${
            isLowBattery 
              ? 'bg-destructive/20 text-destructive' 
              : isUnavailable
              ? 'bg-muted/30 text-muted-foreground'
              : 'bg-primary/10 text-primary'
          }`}>
            <Icon className="h-6 w-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate mb-0.5">{name}</h3>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
          
          <div className="text-right">
            <p className={`text-lg font-semibold ${isLowBattery ? 'text-destructive' : ''}`}>
              {value}
            </p>
          </div>
        </div>
        
        {isLowBattery && (
          <div className="mt-2 pt-2 border-t border-destructive/20">
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>Batterie faible</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
