import { Card } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind, Droplets, CloudFog, CloudSnow, CloudDrizzle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHAStore } from "@/store/useHAStore";
import { useMemo } from "react";

interface WeatherCardProps {
  onConfigure?: () => void;
}

const getWeatherIcon = (condition: string) => {
  const lower = condition.toLowerCase();
  if (lower.includes("rain") || lower.includes("rainy")) return CloudRain;
  if (lower.includes("snow")) return CloudSnow;
  if (lower.includes("fog") || lower.includes("mist")) return CloudFog;
  if (lower.includes("drizzle")) return CloudDrizzle;
  if (lower.includes("clear") || lower.includes("sunny")) return Sun;
  return Cloud;
};

export const WeatherCard = ({ onConfigure }: WeatherCardProps) => {
  const entities = useHAStore((state) => state.entities);
  const weatherEntityId = useHAStore((state) => state.weatherEntity);
  
  const weatherEntity = useMemo(
    () => weatherEntityId ? entities.find((e) => e.entity_id === weatherEntityId) : null,
    [entities, weatherEntityId]
  );

  // Si pas d'entité configurée, afficher la carte de configuration
  if (!weatherEntity) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-background/50 to-purple-500/10 backdrop-blur-lg border-border/30">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        
        <div className="relative p-8 text-center space-y-4">
          <Cloud className="h-16 w-16 mx-auto text-blue-400/30" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Météo non configurée</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Configurez une entité météo pour afficher les informations
            </p>
          </div>
          <Button onClick={onConfigure} className="gap-2">
            <Settings className="h-4 w-4" />
            Configurer la météo
          </Button>
        </div>
      </Card>
    );
  }

  const { attributes } = weatherEntity;
  const temperature = attributes.temperature || 0;
  const condition = attributes.friendly_name || weatherEntity.state;
  const humidity = attributes.humidity || 0;
  const windSpeed = attributes.wind_speed || 0;
  const forecast = attributes.forecast || [];

  const WeatherIcon = getWeatherIcon(weatherEntity.state);

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-background/50 to-purple-500/10 backdrop-blur-lg border-border/30">
      <div className="absolute inset-0 bg-gradient-primary opacity-5" />
      
      <div className="relative p-8 space-y-6">
        {/* Localisation */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-muted-foreground">
            {attributes.friendly_name || "Météo"}
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onConfigure}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurer
          </Button>
        </div>

        {/* Température principale */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-6xl font-bold">{Math.round(temperature)}°</div>
            <p className="text-xl text-muted-foreground mt-2 capitalize">{condition}</p>
          </div>
          <WeatherIcon className="h-24 w-24 text-blue-400/50" />
        </div>

        {/* Détails météo */}
        {(humidity > 0 || windSpeed > 0) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
            {humidity > 0 && (
              <div className="flex items-center gap-3">
                <Droplets className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Humidité</p>
                  <p className="font-semibold">{humidity}%</p>
                </div>
              </div>
            )}
            {windSpeed > 0 && (
              <div className="flex items-center gap-3">
                <Wind className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Vent</p>
                  <p className="font-semibold">{Math.round(windSpeed)} km/h</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prévisions (si disponibles) */}
        {forecast.length > 0 && (
          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-border/30">
            {forecast.slice(0, 4).map((day: any, i: number) => {
              const DayIcon = getWeatherIcon(day.condition);
              const dayName = new Date(day.datetime).toLocaleDateString("fr-FR", { weekday: "short" });
              return (
                <div key={i} className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground capitalize">{dayName}</p>
                  <DayIcon className="h-6 w-6 mx-auto text-blue-400" />
                  <p className="font-semibold">{Math.round(day.temperature)}°</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
