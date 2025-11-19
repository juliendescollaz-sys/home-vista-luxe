import { useState } from "react";
import { Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeatherAnimationLayer } from "./WeatherAnimationLayer";
import { WeatherStatsRow } from "./WeatherStatsRow";
import { ForecastPanel } from "./ForecastPanel";
import { TrendBackdrop } from "./TrendBackdrop";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useSunState } from "@/hooks/useSunState";
import { WeatherConfigDialog } from "../WeatherConfigDialog";
import { useHAStore } from "@/store/useHAStore";

function pickDominantCondition(weatherData: any): string {
  const current = (weatherData?.condition || "").toLowerCase();

  if (Array.isArray(weatherData?.forecastDaily) && weatherData.forecastDaily.length > 0) {
    const today = weatherData.forecastDaily[0];
    if (today?.condition) return String(today.condition).toLowerCase();
  }

  if (Array.isArray(weatherData?.forecast) && weatherData.forecast.length > 0) {
    const now = Date.now();
    const next24h = weatherData.forecast.filter((f: any) => {
      const t = new Date(f.datetime).getTime();
      return t >= now && t <= now + 24 * 3600 * 1000;
    });
    const counts = new Map<string, number>();
    for (const f of (next24h.length ? next24h : weatherData.forecast)) {
      const c = String(f?.condition || "").toLowerCase();
      if (!c) continue;
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    if (counts.size) {
      return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    }
  }

  return current || "partlycloudy";
}

export function AnimatedWeatherTile() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const isNight = useSunState();
  const { weatherData, isLoading, error, refresh } = useWeatherData();
  const { entities, selectedCity } = useHAStore();

  if (isLoading && !weatherData) {
    return (
      <div 
        className="relative rounded-3xl p-6 min-h-[200px] animate-pulse glass-card elevated-subtle border-border/50"
      >
        <div className="space-y-3">
          <div className="h-6 w-32 bg-muted/50 rounded" />
          <div className="h-8 w-24 bg-muted/50 rounded" />
          <div className="h-4 w-48 bg-muted/50 rounded" />
        </div>
      </div>
    );
  }

  if (error || !weatherData || weatherData.source === "none") {
    return (
      <div className="relative rounded-3xl p-6 min-h-[200px] glass-card elevated-subtle border-border/50">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error || "Configuration météo requise"}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowConfig(true)}
          >
            <Settings size={16} />
            Configurer
          </Button>
        </div>
        <WeatherConfigDialog 
          open={showConfig} 
          onOpenChange={setShowConfig}
        />
      </div>
    );
  }

  const condition = weatherData.condition || "cloudy";
  const temperature = weatherData.temperature;
  const dominant = pickDominantCondition(weatherData);
  const trendOpacity = 0.22;
  
  // Récupérer le nom depuis l'entité HA si dispo
  const weatherEntityData = weatherData.entity_id 
    ? entities?.find(e => e.entity_id === weatherData.entity_id)
    : null;
  const location = selectedCity?.label || weatherEntityData?.attributes?.friendly_name || "Météo";

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div 
        className={`relative rounded-3xl p-6 cursor-pointer overflow-hidden weather-transition glass-card elevated-subtle elevated-active ${
          isExpanded ? "min-h-[500px]" : "min-h-[200px]"
        } border-border/50`}
        onClick={handleToggleExpand}
      >
        {/* Tendance du jour en fond - hauteur fixe pour éviter le déplacement */}
        <div className="absolute inset-x-0 top-0 h-[200px] overflow-hidden rounded-3xl pointer-events-none">
          <TrendBackdrop
            dominantCondition={dominant}
            opacity={trendOpacity}
            isNight={isNight}
          />
        </div>

        {/* Couche d'animation de fond */}
        <div className="absolute inset-0 -z-10 opacity-85">
          <WeatherAnimationLayer
            condition={condition}
            isNight={isNight}
            windSpeed={weatherData.wind_speed}
            animationsEnabled={true}
          />
        </div>

        {/* Contenu */}
        <div className="relative z-10 space-y-4">
          {/* En-tête compact */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-700 dark:text-white drop-shadow-lg">
                  {location.split(',')[0].trim()}
                </h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-slate-800 dark:text-white drop-shadow-xl">
                  {temperature !== undefined && temperature !== null ? Math.round(temperature) : "—"}°
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-700 hover:bg-transparent bg-white/20 dark:text-white dark:hover:bg-transparent dark:bg-black/20"
                onClick={(e) => {
                  e.stopPropagation();
                  refresh();
                }}
                disabled={isLoading}
              >
                <RefreshCw size={24} className={isLoading ? "animate-spin" : ""} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-700 hover:bg-transparent bg-white/20 dark:text-white dark:hover:bg-transparent dark:bg-black/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfig(true);
                }}
              >
                <Settings size={24} />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="text-slate-700 dark:text-white">
            <WeatherStatsRow
              windSpeed={weatherData.wind_speed}
              humidity={weatherData.humidity}
              pressure={weatherData.pressure}
              precipitation={weatherData.precipitation}
              windUnit={weatherData.units?.wind_speed || "km/h"}
              precipUnit={weatherData.units?.precipitation || "mm"}
            />
          </div>

          {/* Panneau étendu (prévisions) */}
          {isExpanded && (
            <div 
              className="mt-6 weather-expand text-slate-700 dark:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <ForecastPanel
                hourlyForecast={weatherData.hourlyForecast || []}
                dailyForecast={weatherData.forecast}
                tempUnit={weatherData.units?.temperature || "°C"}
              />
            </div>
          )}

          {/* Indicateur d'expansion */}
          <div className="flex justify-center pt-2">
            <div className={`w-12 h-1 rounded-full bg-slate-700/40 dark:bg-white/40 weather-transition ${
              isExpanded ? "rotate-180" : ""
            }`} />
          </div>
        </div>
      </div>

      <WeatherConfigDialog 
        open={showConfig} 
        onOpenChange={setShowConfig}
      />
    </>
  );
}
