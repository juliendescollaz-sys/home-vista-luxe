import { useState } from "react";
import { Settings } from "lucide-react";
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
  const { weatherData, isLoading, error } = useWeatherData();
  const { entities, selectedCity } = useHAStore();

  if (isLoading) {
    return (
      <div className="relative rounded-3xl p-6 min-h-[200px] bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse">
        <div className="space-y-3">
          <div className="h-6 w-32 bg-white/30 rounded" />
          <div className="h-8 w-24 bg-white/30 rounded" />
          <div className="h-4 w-48 bg-white/30 rounded" />
        </div>
      </div>
    );
  }

  if (error || !weatherData || weatherData.source === "none") {
    return (
      <div className="relative rounded-3xl p-6 min-h-[200px] bg-gradient-to-br from-gray-400 to-gray-500 text-white">
        <div className="space-y-4">
          <p className="text-sm opacity-90">
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
        className={`relative rounded-3xl p-6 cursor-pointer overflow-hidden weather-transition ${
          isExpanded ? "min-h-[500px]" : "min-h-[200px]"
        }`}
        onClick={handleToggleExpand}
        style={{ 
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
          border: "2px solid rgba(255, 255, 255, 0.25)",
          background: "rgba(0, 0, 0, 0.15)"
        }}
      >
        {/* Tendance du jour en fond */}
        <TrendBackdrop
          dominantCondition={dominant}
          opacity={trendOpacity}
          isNight={isNight}
        />

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
                <h3 className="text-lg font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
                  {location.split(',')[0].trim()}
                </h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white" style={{ textShadow: "0 3px 12px rgba(0,0,0,0.9)" }}>
                  {temperature !== undefined && temperature !== null ? Math.round(temperature) : "—"}°
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/30 bg-black/20"
              onClick={(e) => {
                e.stopPropagation();
                setShowConfig(true);
              }}
            >
              <Settings size={20} />
            </Button>
          </div>

          {/* Stats */}
          <div className="text-white">
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
              className="mt-6 weather-expand text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <ForecastPanel
                hourlyForecast={weatherData.forecast}
                dailyForecast={weatherData.forecast}
                tempUnit={weatherData.units?.temperature || "°C"}
              />
            </div>
          )}

          {/* Indicateur d'expansion */}
          <div className="flex justify-center pt-2">
            <div className={`w-12 h-1 rounded-full bg-white/40 weather-transition ${
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
