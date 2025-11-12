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
  const { weatherData, isLoading, error, refresh, forecastMode, setForecastMode } = useWeatherData();
  const selectedCity = useHAStore((state) => state.selectedCity);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleCitySaved = () => {
    // Fermer immédiatement le dialog sans attendre le refresh
    setIsConfigOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsConfigOpen(open);
  };

  // Gestionnaires pour iOS - forcer le blur immédiat
  const handleRefreshClick = () => {
    refresh();
    // Forcer le blur sur iOS
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleConfigClick = () => {
    setIsConfigOpen(true);
    // Forcer le blur sur iOS
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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

  // Obtenir les prévisions du jour (matin/après-midi)
  const todayForecast = Array.isArray(w.forecast) && w.forecast.length > 0 ? w.forecast[0] : null;
  const morningTemp = todayForecast?.templow ?? todayForecast?.temperature;
  const afternoonTemp = todayForecast?.temperature;

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-2">
          {/* Ville + Actions */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium">{selectedCity?.label ?? "—"}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefreshClick}
                className="transition-transform active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleConfigClick}
                className="transition-transform active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Prévisions Matin / Après-midi en grand */}
          <div className="grid grid-cols-2 gap-2">
            {/* Matin */}
            <div className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-muted/30">
              <div className="text-xs opacity-70 uppercase tracking-wider">Matin</div>
              <WeatherIcon className="w-10 h-10 text-primary" />
              {morningTemp != null && (
                <div className="text-2xl font-bold">{Math.round(morningTemp)}{w.units.temperature}</div>
              )}
            </div>

            {/* Après-midi */}
            <div className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-muted/30">
              <div className="text-xs opacity-70 uppercase tracking-wider">Après-midi</div>
              <WeatherIcon className="w-10 h-10 text-primary" />
              {afternoonTemp != null && (
                <div className="text-2xl font-bold">{Math.round(afternoonTemp)}{w.units.temperature}</div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-3">
          {/* Infos essentielles */}
          <div className="grid grid-cols-3 gap-2">
            {w.humidity != null && (
              <div className="flex flex-col items-center gap-0.5 p-2 rounded-lg border">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Humidité</span>
                <span className="text-sm font-semibold">{w.humidity}%</span>
              </div>
            )}
            {w.wind_speed != null && (
              <div className="flex flex-col items-center gap-0.5 p-2 rounded-lg border">
                <Wind className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground">Vent</span>
                <span className="text-sm font-semibold">{Math.round(w.wind_speed)} {w.units.wind_speed}</span>
              </div>
            )}
            {w.pressure != null && (
              <div className="flex flex-col items-center gap-0.5 p-2 rounded-lg border">
                <Gauge className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Pression</span>
                <span className="text-sm font-semibold whitespace-nowrap">{Math.round(w.pressure)} {w.units.pressure}</span>
              </div>
            )}
          </div>

          {/* Prévisions quotidiennes */}
          {Array.isArray(w.forecast) && w.forecast.length > 1 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Prévisions</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {w.forecast.slice(1, 8).map((f, i) => {
                  const d = new Date(f.datetime);
                  const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
                  const ForecastIcon = getWeatherIcon(f.condition);
                  
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-lg border">
                      <div className="text-xs opacity-70">{label}</div>
                      <ForecastIcon className="w-5 h-5 text-primary" />
                      <div className="text-xs font-semibold">
                        {f.templow != null ? Math.round(f.templow) : "—"}{w.units.temperature}
                        {" / "}
                        {f.temperature != null ? Math.round(f.temperature) : "—"}{w.units.temperature}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <WeatherConfigDialog 
        open={isConfigOpen} 
        onOpenChange={handleOpenChange} 
        onCitySaved={handleCitySaved}
      />
    </>
  );
}
