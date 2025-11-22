import { useState } from "react";
import { Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeatherStatsRow } from "./WeatherStatsRow";
import { ForecastPanel } from "./ForecastPanel";
import { TrendBackdrop } from "./TrendBackdrop";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useSunState } from "@/hooks/useSunState";
import { WeatherConfigDialog } from "../WeatherConfigDialog";
import { useHAStore } from "@/store/useHAStore";
import { useDisplayMode } from "@/hooks/useDisplayMode";

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
  const { displayMode } = useDisplayMode();

  // Optimisation pour Panel et Tablet - LARGE
  const isCompact = displayMode === "panel" || displayMode === "tablet";
  const padding = isCompact ? "p-8" : "p-6";
  const minHeight = isCompact ? (isExpanded ? "min-h-[600px]" : "min-h-[300px]") : (isExpanded ? "min-h-[500px]" : "min-h-[200px]");
  const backdropHeight = isCompact ? "h-[300px]" : "h-[200px]";
  const titleSize = isCompact ? "text-2xl" : "text-lg";
  const tempSize = isCompact ? "text-7xl" : "text-5xl";
  const iconSize = isCompact ? 28 : 24;
  const widthClass = isCompact ? "w-[500px]" : "w-full";

  // Si aucune ville n'est sélectionnée, afficher l'état "Choisir une ville"
  if (!selectedCity) {
    return (
      <div className={`relative rounded-3xl ${padding} ${minHeight} ${widthClass} glass-card elevated-subtle border-border/50`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${isCompact ? "text-lg" : "text-2xl"} font-bold`}>Choisir une ville</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowConfig(true)}
            className="hover-lift"
          >
            <Settings size={iconSize} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Configurez une ville pour afficher la météo
        </p>
        <WeatherConfigDialog 
          open={showConfig} 
          onOpenChange={setShowConfig}
        />
      </div>
    );
  }

  if (isLoading && !weatherData) {
    return (
      <div 
        className={`relative rounded-3xl ${padding} ${minHeight} ${widthClass} animate-pulse glass-card elevated-subtle border-border/50`}
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
      <div className={`relative rounded-3xl ${padding} ${minHeight} ${widthClass} glass-card elevated-subtle border-border/50`}>
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
  const trendOpacity = 0.35;
  
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
        className={`relative rounded-3xl ${padding} ${widthClass} cursor-pointer overflow-hidden weather-transition glass-card elevated-subtle elevated-active ${minHeight} border-border/50`}
        onClick={handleToggleExpand}
      >
        {/* Tendance du jour en fond - hauteur fixe pour éviter le déplacement */}
        <div className={`absolute inset-x-0 top-0 ${backdropHeight} overflow-hidden rounded-3xl pointer-events-none`}>
          <TrendBackdrop
            dominantCondition={dominant}
            opacity={trendOpacity}
            isNight={isNight}
          />
        </div>

        {/* Contenu */}
        <div className={`relative z-10 ${isCompact ? "space-y-6" : "space-y-4"}`}>
          {/* En-tête compact */}
          <div className="flex items-start justify-between">
            <div className={isCompact ? "space-y-2" : "space-y-1"}>
              <div className="flex items-center gap-2">
                <h3 className={`${titleSize} font-bold text-slate-700 dark:text-white drop-shadow-lg`}>
                  {location.split(',')[0].trim()}
                </h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`${tempSize} font-bold text-slate-800 dark:text-white drop-shadow-xl`}>
                  {temperature !== undefined && temperature !== null ? Math.round(temperature) : "—"}°
                </span>
              </div>
            </div>

            <div className={`flex ${isCompact ? "gap-2" : "gap-2"}`}>
              <Button
                variant="ghost"
                size="icon"
                className={`text-slate-700 hover:bg-transparent bg-white/20 dark:text-white dark:hover:bg-transparent dark:bg-black/20 ${isCompact ? "h-12 w-12" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  refresh();
                }}
                disabled={isLoading}
              >
                <RefreshCw size={iconSize} className={isLoading ? "animate-spin" : ""} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`text-slate-700 hover:bg-transparent bg-white/20 dark:text-white dark:hover:bg-transparent dark:bg-black/20 ${isCompact ? "h-12 w-12" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfig(true);
                }}
              >
                <Settings size={iconSize} />
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
              className={`${isCompact ? "mt-8" : "mt-6"} weather-expand text-slate-700 dark:text-white`}
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
