import { RefreshCw, AlertCircle, Settings, Cloud, Droplets, Wind, Gauge, Eye, MapPin } from "lucide-react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherConfigDialog } from "./WeatherConfigDialog";
import { useState } from "react";
import { useHAStore } from "@/store/useHAStore";

const getWeatherIcon = (condition: string | null) => {
  if (!condition) return Cloud;
  const cond = condition.toLowerCase();
  if (cond.includes("rain") || cond.includes("rainy")) return Droplets;
  if (cond.includes("cloud")) return Cloud;
  if (cond.includes("wind")) return Wind;
  return Cloud;
};

export function WeatherCard() {
  const { weatherData, isLoading, error, refresh } = useWeatherData();
  const selectedCity = useHAStore((state) => state.selectedCity);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleCitySaved = () => {
    // Fermer immédiatement le dialog sans attendre le refresh
    setIsConfigOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsConfigOpen(open);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !weatherData || weatherData.source === "none") {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Aucune source météo trouvée</p>
                <p className="text-sm text-muted-foreground">
                  Activez une intégration météo dans Home Assistant (Met.no, OpenWeatherMap, etc.)
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const w = weatherData;
  const WeatherIcon = getWeatherIcon(w.condition);

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <WeatherIcon className="w-8 h-8 text-primary" />
              <div>
                {selectedCity && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                    <MapPin className="w-3 h-3" />
                    <span>{selectedCity.label}</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Conditions actuelles</p>
                <h3 className="text-2xl font-semibold">
                  {w.condition ?? "—"}
                </h3>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={refresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsConfigOpen(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Temperature */}
          {w.temperature != null && (
            <div className="text-4xl font-bold">
              {Math.round(w.temperature)}{w.units.temperature}
            </div>
          )}

          {/* Additional info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {w.humidity != null && (
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-muted-foreground">Humidité:</span>
                <span className="font-medium">{w.humidity}%</span>
              </div>
            )}
            {w.wind_speed != null && (
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-500" />
                <span className="text-muted-foreground">Vent:</span>
                <span className="font-medium">
                  {Math.round(w.wind_speed)} {w.units.wind_speed}
                  {w.wind_bearing != null && ` ${Math.round(w.wind_bearing)}°`}
                </span>
              </div>
            )}
            {w.pressure != null && (
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-orange-500" />
                <span className="text-muted-foreground">Pression:</span>
                <span className="font-medium">{Math.round(w.pressure)} {w.units.pressure}</span>
              </div>
            )}
            {w.visibility != null && (
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-500" />
                <span className="text-muted-foreground">Visibilité:</span>
                <span className="font-medium">{w.visibility} {w.units.visibility}</span>
              </div>
            )}
          </div>

          {/* Forecast */}
          {Array.isArray(w.forecast) && w.forecast.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Prévisions</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {w.forecast.slice(0, 4).map((f, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-1">
                    <div className="text-xs text-muted-foreground">
                      {new Date(f.datetime).toLocaleDateString('fr-FR', { 
                        weekday: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-sm font-medium">{f.condition ?? "—"}</div>
                    {f.temperature != null && (
                      <div className="text-lg font-semibold">
                        {Math.round(f.temperature)}{w.units.temperature}
                      </div>
                    )}
                    {f.templow != null && (
                      <div className="text-xs text-muted-foreground">
                        Min: {Math.round(f.templow)}{w.units.temperature}
                      </div>
                    )}
                    {f.precipitation != null && f.precipitation > 0 && (
                      <div className="text-xs flex items-center gap-1">
                        <Droplets className="w-3 h-3" />
                        {f.precipitation} {w.units.precipitation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground border-t pt-3">
          Source: {w.entity_id ? `HA • ${w.entity_id}` : "Open-Meteo (lat/lon sélectionnés)"}
        </CardFooter>
      </Card>

      <WeatherConfigDialog 
        open={isConfigOpen} 
        onOpenChange={handleOpenChange} 
        onCitySaved={handleCitySaved}
      />
    </>
  );
}
