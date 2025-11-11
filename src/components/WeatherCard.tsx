import { Card } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind, Droplets, CloudFog, CloudSnow, CloudDrizzle, WifiOff } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { useState, useEffect } from "react";
import type { HAEntity } from "@/types/homeassistant";
import { Skeleton } from "@/components/ui/skeleton";

const HA_WEATHER_ENTITY = "weather.city_forecast";

const getWeatherIcon = (condition: string) => {
  const lower = condition.toLowerCase();
  if (lower.includes("rain") || lower.includes("rainy")) return CloudRain;
  if (lower.includes("snow")) return CloudSnow;
  if (lower.includes("fog") || lower.includes("mist")) return CloudFog;
  if (lower.includes("drizzle")) return CloudDrizzle;
  if (lower.includes("clear") || lower.includes("sunny")) return Sun;
  return Cloud;
};

export const WeatherCard = () => {
  const client = useHAStore((state) => state.client);
  const isConnected = useHAStore((state) => state.isConnected);
  const [weatherEntity, setWeatherEntity] = useState<HAEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Récupération initiale et abonnement temps réel
  useEffect(() => {
    if (!client || !isConnected) {
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const initWeather = async () => {
      try {
        setIsLoading(true);
        
        // Récupération initiale
        const states = await client.getStates();
        const entity = states.find((e) => e.entity_id === HA_WEATHER_ENTITY);
        
        if (entity) {
          setWeatherEntity(entity);
          setIsOffline(false);
        }

        // Abonnement aux changements
        unsubscribe = client.subscribeStateChanges((data: any) => {
          if (data.entity_id === HA_WEATHER_ENTITY) {
            setWeatherEntity(data.new_state);
            setIsOffline(false);
          }
        });
      } catch (error) {
        console.error("Erreur récupération météo:", error);
        setIsOffline(true);
      } finally {
        setIsLoading(false);
      }
    };

    initWeather();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [client, isConnected]);

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

  if (!weatherEntity) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-background/50 to-purple-500/10 backdrop-blur-lg border-border/30">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        
        <div className="relative p-8 text-center space-y-4">
          <Cloud className="h-16 w-16 mx-auto text-blue-400/30" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Entité météo introuvable</h3>
            <p className="text-sm text-muted-foreground">
              Configurez l'entité <code className="bg-muted px-2 py-1 rounded">{HA_WEATHER_ENTITY}</code> dans Home Assistant
            </p>
          </div>
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
          {isOffline && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <WifiOff className="h-4 w-4" />
              Hors-ligne (REST)
            </div>
          )}
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
