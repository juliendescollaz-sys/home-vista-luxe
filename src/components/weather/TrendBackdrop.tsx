import { Cloud, CloudRain, CloudSnow, CloudLightning, Sun, CloudFog } from "lucide-react";
import "./weather-animations.css";

type TrendBackdropProps = {
  dominantCondition: string;
  opacity?: number;
  isNight?: boolean;
};

const iconSize = 96;

export function TrendBackdrop({ dominantCondition, opacity = 0.22, isNight = false }: TrendBackdropProps) {
  const cond = (dominantCondition || "").toLowerCase();

  const filterStyle = isNight ? "brightness(0.9) saturate(0.9)" : "brightness(1) saturate(1)";

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity, filter: filterStyle, zIndex: 0 }}
      aria-hidden
    >
      {/* Nuageux / Partiellement nuageux */}
      {(cond.includes("cloud") || cond.includes("overcast") || cond.includes("partly")) && (
        <>
          <Cloud className="absolute left-6 top-6 trend-cloud drift-slow" size={iconSize} />
          <Cloud className="absolute right-10 top-10 trend-cloud drift" size={iconSize - 10} />
          <Cloud className="absolute left-12 bottom-8 trend-cloud drift-slow" size={iconSize - 6} />
          <Cloud className="absolute right-16 bottom-12 trend-cloud drift" size={iconSize - 4} />
        </>
      )}

      {/* Pluie */}
      {(cond.includes("rain") || cond.includes("pouring")) && (
        <>
          <CloudRain className="absolute left-8 top-8 trend-rain sway" size={iconSize} />
          <CloudRain className="absolute right-12 top-14 trend-rain sway-slow" size={iconSize - 6} />
          <Cloud className="absolute left-1/2 top-1/3 -translate-x-1/2 trend-cloud drift-slow" size={iconSize} />
        </>
      )}

      {/* Neige */}
      {cond.includes("snow") && (
        <>
          <CloudSnow className="absolute left-10 top-10 trend-snow float" size={iconSize} />
          <CloudSnow className="absolute right-14 bottom-10 trend-snow float-slow" size={iconSize - 8} />
        </>
      )}

      {/* Orage */}
      {cond.includes("thunder") && (
        <>
          <CloudLightning className="absolute left-8 top-10 trend-thunder flash" size={iconSize} />
          <Cloud className="absolute right-12 top-8 trend-cloud drift" size={iconSize - 6} />
        </>
      )}

      {/* Brouillard / Brume */}
      {(cond.includes("fog") || cond.includes("mist") || cond.includes("haze")) && (
        <>
          <CloudFog className="absolute left-6 bottom-8 trend-fog fog-slide" size={iconSize} />
          <CloudFog className="absolute right-10 top-8 trend-fog fog-slide-delayed" size={iconSize} />
        </>
      )}

      {/* Ensoleillé / ciel clair */}
      {(cond.includes("sunny") || cond.includes("clear")) && (
        <>
          <Sun className="absolute left-8 top-8 trend-sun glow" size={iconSize + 4} />
          <Sun className="absolute right-12 bottom-10 trend-sun glow-slow" size={iconSize - 6} />
        </>
      )}
    </div>
  );
}
