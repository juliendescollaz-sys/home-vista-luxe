import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, CloudRain, Sun, Wind, Droplets, CloudFog, CloudSnow, CloudDrizzle, WifiOff, Settings } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { useState, useEffect } from "react";
import type { HAEntity } from "@/types/homeassistant";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherConfigDialog } from "@/components/WeatherConfigDialog";

// Entités Home Assistant pour la météo
const HA_ENTITIES = {
  temp: "sensor.city_weather_temperature",
  hum: "sensor.city_weather_humidity",
  wind: "sensor.city_weather_wind_speed",
  cond: "sensor.city_weather_condition",
  fcj: "sensor.city_weather_forecast_json",
};

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

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  forecast: any[];
}

export const WeatherCard = () => {
  const client = useHAStore((state) => state.client);
  const isConnected = useHAStore((state) => state.isConnected);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [missingEntities, setMissingEntities] = useState<string[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCitySaved = () => {
    // Fermer le dialog et déclencher un refresh après la sélection de ville
    setIsConfigOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  // Récupération initiale et abonnement temps réel
  useEffect(() => {
    if (!client || !isConnected) {
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let restFallbackInterval: NodeJS.Timeout | null = null;

    const fetchWeatherData = async (states?: HAEntity[]): Promise<void> => {
      try {
        const allStates = states || await client.getStates();
        
        const tempEntity = allStates.find((e) => e.entity_id === HA_ENTITIES.temp);
        const humEntity = allStates.find((e) => e.entity_id === HA_ENTITIES.hum);
        const windEntity = allStates.find((e) => e.entity_id === HA_ENTITIES.wind);
        const condEntity = allStates.find((e) => e.entity_id === HA_ENTITIES.cond);
        const fcjEntity = allStates.find((e) => e.entity_id === HA_ENTITIES.fcj);

        // Vérifier les entités manquantes
        const missing: string[] = [];
        if (!tempEntity) missing.push(HA_ENTITIES.temp);
        if (!humEntity) missing.push(HA_ENTITIES.hum);
        if (!windEntity) missing.push(HA_ENTITIES.wind);
        if (!condEntity) missing.push(HA_ENTITIES.cond);
        if (!fcjEntity) missing.push(HA_ENTITIES.fcj);

        if (missing.length > 0) {
          setMissingEntities(missing);
          return;
        }

        setMissingEntities([]);
        setWeatherData({
          temperature: parseFloat(tempEntity?.state || "0"),
          humidity: parseFloat(humEntity?.state || "0"),
          windSpeed: parseFloat(windEntity?.state || "0"),
          condition: condEntity?.state || "unknown",
          forecast: fcjEntity?.attributes?.forecast || [],
        });
        setIsOffline(false);
      } catch (error) {
        console.error("Erreur récupération météo:", error);
        setIsOffline(true);
      }
    };

    const initWeather = async () => {
      try {
        setIsLoading(true);
        
        // Récupération initiale
        const states = await client.getStates();
        await fetchWeatherData(states);

        // Abonnement aux changements d'état via WebSocket
        unsubscribe = client.subscribeStateChanges((data: any) => {
          const entityIds = Object.values(HA_ENTITIES);
          if (entityIds.includes(data.entity_id)) {
            // Re-fetch toutes les données quand une entité change
            fetchWeatherData();
          }
        });

        // Fallback REST toutes les 5 minutes si WS disponible mais en backup
        restFallbackInterval = setInterval(() => {
          if (!client.isConnected()) {
            setIsOffline(true);
            fetchWeatherData();
          }
        }, 5 * 60 * 1000);
      } catch (error) {
        console.error("Erreur initialisation météo:", error);
        setIsOffline(true);
      } finally {
        setIsLoading(false);
      }
    };

    initWeather();

    return () => {
      if (unsubscribe) unsubscribe();
      if (restFallbackInterval) clearInterval(restFallbackInterval);
    };
  }, [client, isConnected, refreshTrigger]);

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

  if (missingEntities.length > 0) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-background/50 to-purple-500/10 backdrop-blur-lg border-border/30">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        
        <div className="relative p-8 text-center space-y-4">
          <Cloud className="h-16 w-16 mx-auto text-blue-400/30" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Entités météo introuvables</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Configurez ces entités dans Home Assistant :
            </p>
            <div className="space-y-1 text-xs">
              {missingEntities.map((entity) => (
                <code key={entity} className="block bg-muted px-2 py-1 rounded">{entity}</code>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!weatherData) {
    return null;
  }

  const { temperature, humidity, windSpeed, condition, forecast } = weatherData;
  const WeatherIcon = getWeatherIcon(condition);

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-background/50 to-purple-500/10 backdrop-blur-lg border-border/30">
      <div className="absolute inset-0 bg-gradient-primary opacity-5" />
      
      <div className="relative p-8 space-y-6">
        {/* En-tête avec bouton configurer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-muted-foreground">Météo</h3>
            {isOffline && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                <WifiOff className="h-3 w-3" />
                Hors-ligne (REST)
              </div>
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
                  <p className="font-semibold">{windSpeed.toFixed(1)} m/s</p>
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

        {/* Footer */}
        <div className="pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            Données via Home Assistant (MET Norway)
          </p>
        </div>
      </div>
    </Card>
  );
};
