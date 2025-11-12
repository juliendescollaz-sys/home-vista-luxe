import { Wind, Droplets, Gauge } from "lucide-react";

interface WeatherStatsRowProps {
  windSpeed?: number;
  humidity?: number;
  pressure?: number;
  precipitation?: number;
  windUnit?: string;
  precipUnit?: string;
}

export function WeatherStatsRow({
  windSpeed,
  humidity,
  pressure,
  precipitation,
  windUnit = "km/h",
  precipUnit = "mm"
}: WeatherStatsRowProps) {
  const stats = [
    {
      icon: Wind,
      label: "Vent",
      value: windSpeed !== undefined ? `${Math.round(windSpeed)} ${windUnit}` : null
    },
    {
      icon: Droplets,
      label: "Humidité",
      value: humidity !== undefined ? `${Math.round(humidity)}%` : null
    },
    {
      icon: Gauge,
      label: "Pression",
      value: pressure !== undefined ? `${Math.round(pressure)} hPa` : null
    }
  ];

  // Filtrer les stats disponibles
  const availableStats = stats.filter(stat => stat.value !== null);

  if (availableStats.length === 0) return null;

  return (
    <div className="flex gap-4 flex-wrap">
      {availableStats.map((stat, index) => (
        <div 
          key={index}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm"
        >
          <stat.icon size={16} className="opacity-70" />
          <span className="text-sm font-medium">{stat.value}</span>
        </div>
      ))}
      {precipitation !== undefined && precipitation > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
          <Droplets size={16} className="opacity-70" />
          <span className="text-sm font-medium">{precipitation.toFixed(1)} {precipUnit}</span>
        </div>
      )}
    </div>
  );
}
