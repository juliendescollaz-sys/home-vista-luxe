import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ForecastItem {
  datetime: string;
  temperature?: number;
  templow?: number;
  condition?: string;
}

interface ForecastPanelProps {
  hourlyForecast?: ForecastItem[];
  dailyForecast?: ForecastItem[];
  tempUnit?: string;
}

export function ForecastPanel({
  hourlyForecast = [],
  dailyForecast = [],
  tempUnit = "°C"
}: ForecastPanelProps) {
  const [activeTab, setActiveTab] = useState<"hourly" | "daily">("daily");

  const formatHour = (datetime: string) => {
    try {
      const date = new Date(datetime);
      const hours = date.getHours();
      return `${hours}h`;
    } catch {
      return "—";
    }
  };

  // Filtrer les heures futures uniquement
  const getFutureHourlyForecast = () => {
    const now = new Date();
    return hourlyForecast.filter(item => {
      try {
        const itemDate = new Date(item.datetime);
        return itemDate > now;
      } catch {
        return false;
      }
    }).slice(0, 24); // Limiter à 24h
  };

  const futureHourly = getFutureHourlyForecast();

  const formatDay = (datetime: string) => {
    try {
      const date = new Date(datetime);
      const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      return days[date.getDay()];
    } catch {
      return "—";
    }
  };

  const getConditionEmoji = (condition?: string) => {
    if (!condition) return "☁️";
    if (condition.includes("sunny") || condition.includes("clear")) return "☀️";
    if (condition.includes("rain") || condition.includes("pouring")) return "🌧️";
    if (condition.includes("snow")) return "❄️";
    if (condition.includes("thunderstorm")) return "⛈️";
    if (condition.includes("cloudy")) return "☁️";
    if (condition.includes("fog")) return "🌫️";
    return "☁️";
  };

  if (futureHourly.length === 0 && dailyForecast.length === 0) {
    return (
      <div className="text-center py-4 text-sm opacity-70">
        Prévisions non disponibles
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "hourly" | "daily")} className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-background/20 border border-border/20">
        <TabsTrigger 
          value="hourly" 
          disabled={futureHourly.length === 0}
          className="data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground"
        >
          Heure par heure
        </TabsTrigger>
        <TabsTrigger 
          value="daily"
          className="data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground"
        >
          Plusieurs jours
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hourly" className="mt-4">
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {futureHourly.map((item, index) => (
            <div 
              key={index}
              className="flex flex-col items-center gap-2 min-w-[70px] px-4 py-3 rounded-xl bg-background/20 border border-border/20 snap-start backdrop-blur-sm"
            >
              <span className="text-sm font-medium opacity-90">{formatHour(item.datetime)}</span>
              <span className="text-2xl">{getConditionEmoji(item.condition)}</span>
              <span className="text-sm font-semibold">
                {item.temperature !== undefined ? `${Math.round(item.temperature)}${tempUnit}` : "—"}
              </span>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="daily" className="mt-4">
        <div className="space-y-2">
          {dailyForecast.slice(0, 7).map((item, index) => (
            <div 
              key={index}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-background/20 border border-border/20 hover:bg-background/30 transition-colors backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium w-12">{formatDay(item.datetime)}</span>
                <span className="text-2xl">{getConditionEmoji(item.condition)}</span>
                <span className="text-xs opacity-70 flex-1 capitalize">
                  {item.condition || ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-70">
                  {item.templow !== undefined ? `${Math.round(item.templow)}°` : "—"}
                </span>
                <ChevronRight size={12} className="opacity-50" />
                <span className="text-sm font-semibold">
                  {item.temperature !== undefined ? `${Math.round(item.temperature)}°` : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
