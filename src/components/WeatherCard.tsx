import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, CloudRain, Sun, Wind, Droplets, CloudFog, CloudSnow, CloudDrizzle, AlertCircle, RefreshCw, Settings } from "lucide-react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherConfigDialog } from "@/components/WeatherConfigDialog";
import { useHAStore } from "@/store/useHAStore";
import { useState, useEffect } from "react";

const getWeatherIcon = (condition: string) => {
  const lower = condition.toLowerCase();
  if (lower.includes("rain") || lower.includes("rainy") || lower.includes("pouring")) return CloudRain;
  if (lower.includes("snow")) return CloudSnow;
  if (lower.includes("fog") || lower.includes("mist")) return CloudFog;
  if (lower.includes("drizzle")) return CloudDrizzle;
  if (lower.includes("clear") || lower.includes("sunny")) return Sun;
  if (lower.includes("wind")) return Wind;
  return Cloud;
};

export const WeatherCard = () => {
  const { weatherData, isLoading, error, refresh } = useWeatherData();
  const entities = useHAStore((state) => state.entities);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [cityName, setCityName] = useState<string | null>(null);

  // Récupérer le nom de la ville depuis input_text.ville_meteo
  useEffect(() => {
    const cityEntity = entities.find(e => e.entity_id === 'input_text.ville_meteo');
    if (cityEntity && cityEntity.state && cityEntity.state !== 'unknown' && cityEntity.state !== 'unavailable') {
      setCityName(cityEntity.state);
    } else if (weatherData?.entity_id) {
      // Fallback sur le friendly_name de l'entité météo
      const weatherEntity = entities.find(e => e.entity_id === weatherData.entity_id);
      setCityName(weatherEntity?.attributes?.friendly_name || null);
    } else {
      setCityName(null);
    }
  }, [entities, weatherData]);

  const handleCitySaved = () => {
    setIsConfigOpen(false);
    setTimeout(() => refresh(), 1000);
  };

  if (isLoading) {
    return (
      <Card className="p-8 space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-24 w-32" />
          <Skeleton className="h-24 w-24 rounded-full" />
        </div>
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  if (error || !weatherData || weatherData.source === 'none') {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-background/50 to-purple-500/10 backdrop-blur-lg border-border/30">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        
        <div className="relative p-8 text-center space-y-4">
          <AlertCircle className="h-16 w-16 mx-auto text-blue-400/30" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Aucune source météo détectée</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Activez une intégration météo dans Home Assistant (Met.no, OpenWeatherMap, etc.)
            </p>
            {error && (
              <p className="text-xs text-destructive mb-3">{error}</p>
            )}
          </div>
          <Button onClick={refresh} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </Card>
    );
  }

  const { condition, temperature, humidity, wind_speed, forecast, units } = weatherData;
  const WeatherIcon = getWeatherIcon(condition || 'cloudy');
  
  const tempDisplay = temperature !== null ? `${Math.round(temperature)}${units.temperature}` : '—';
  const humDisplay = humidity !== null ? `${Math.round(humidity)}%` : '—';
  const windDisplay = wind_speed !== null ? `${wind_speed.toFixed(1)} ${units.wind_speed}` : '—';
  const conditionDisplay = condition || 'Inconnu';

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-background/50 to-purple-500/10 backdrop-blur-lg border-border/30">
      <div className="absolute inset-0 bg-gradient-primary opacity-5" />
      
      <div className="relative p-8 space-y-6">
        {/* En-tête avec ville et bouton configuration */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-muted-foreground">Météo</h3>
            {cityName && (
              <p className="text-sm text-muted-foreground/70 mt-0.5">{cityName}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfigOpen(true)}
            className="h-8 w-8 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <WeatherConfigDialog 
          open={isConfigOpen} 
          onOpenChange={setIsConfigOpen}
          onCitySaved={handleCitySaved}
        />

        {/* Température principale */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-6xl font-bold">{tempDisplay}</div>
            <p className="text-xl text-muted-foreground mt-2 capitalize">{conditionDisplay}</p>
          </div>
          <WeatherIcon className="h-24 w-24 text-blue-400/50" />
        </div>

        {/* Détails météo */}
        {(humidity !== null || wind_speed !== null) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
            {humidity !== null && (
              <div className="flex items-center gap-3">
                <Droplets className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Humidité</p>
                  <p className="font-semibold">{humDisplay}</p>
                </div>
              </div>
            )}
            {wind_speed !== null && (
              <div className="flex items-center gap-3">
                <Wind className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Vent</p>
                  <p className="font-semibold">{windDisplay}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prévisions (si disponibles) */}
        {forecast && forecast.length > 0 && (
          <div className="pt-4 border-t border-border/30">
            <div className="flex overflow-x-auto gap-3 pb-2 -mx-2 px-2 scrollbar-hide">
              {forecast.map((day, i: number) => {
                const DayIcon = getWeatherIcon(day.condition || 'cloudy');
                const date = new Date(day.datetime);
                const dayName = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
                const temp = day.temperature !== null ? Math.round(day.temperature) : '—';
                const tempLow = day.templow !== null ? Math.round(day.templow) : null;
                
                return (
                  <div key={i} className="flex-shrink-0 text-center space-y-2 min-w-[80px] p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground capitalize whitespace-nowrap">{dayName}</p>
                    <DayIcon className="h-8 w-8 mx-auto text-blue-400" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-lg">{temp}{units.temperature}</p>
                      {tempLow !== null && (
                        <p className="text-xs text-muted-foreground">{tempLow}{units.temperature}</p>
                      )}
                    </div>
                    {day.precipitation !== null && day.precipitation > 0 && (
                      <p className="text-xs text-blue-400">{day.precipitation} mm</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            Données via Home Assistant
            {weatherData.entity_id && ` • ${weatherData.entity_id}`}
          </p>
        </div>
      </div>
    </Card>
  );
};
