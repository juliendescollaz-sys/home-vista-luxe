import { useEffect, useState } from "react";
import { Cloud, CloudRain, CloudSnow, CloudLightning, Sun, Moon, CloudFog } from "lucide-react";
import "./weather-animations.css";

interface WeatherAnimationLayerProps {
  condition: string;
  isNight: boolean;
  windSpeed?: number;
  animationsEnabled?: boolean;
}

export function WeatherAnimationLayer({
  condition,
  isNight,
  windSpeed = 0,
  animationsEnabled = true
}: WeatherAnimationLayerProps) {
  const [particles, setParticles] = useState<Array<{ id: number; delay: number; left: number }>>([]);
  const [showLightning, setShowLightning] = useState(false);

  // Génération de particules pour pluie/neige
  useEffect(() => {
    if (!animationsEnabled) return;
    
    const needsParticles = condition.includes("rain") || 
                          condition.includes("snow") || 
                          condition.includes("pouring");
    
    if (needsParticles) {
      const count = condition.includes("pouring") ? 80 : 60;
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: i,
        delay: Math.random() * 2,
        left: Math.random() * 100
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [condition, animationsEnabled]);

  // Éclairs pour orage
  useEffect(() => {
    if (!animationsEnabled || !condition.includes("thunderstorm")) return;

    const triggerLightning = () => {
      setShowLightning(true);
      setTimeout(() => setShowLightning(false), 150);
      
      // Prochain éclair dans 2-4s
      setTimeout(triggerLightning, 2000 + Math.random() * 2000);
    };

    const timeout = setTimeout(triggerLightning, 1000);
    return () => clearTimeout(timeout);
  }, [condition, animationsEnabled]);

  const getBackgroundGradient = () => {
    if (isNight) {
      if (condition.includes("clear")) {
        return "linear-gradient(to bottom, hsl(230, 50%, 20%), hsl(250, 45%, 30%))";
      }
      if (condition.includes("rain") || condition.includes("thunderstorm")) {
        return "linear-gradient(to bottom, hsl(220, 35%, 25%), hsl(230, 40%, 35%))";
      }
      return "linear-gradient(to bottom, hsl(220, 40%, 30%), hsl(230, 35%, 40%))";
    }

    if (condition.includes("sunny") || condition.includes("clear")) {
      return "linear-gradient(to bottom, hsl(200, 85%, 65%), hsl(210, 75%, 75%))";
    }
    if (condition.includes("rain") || condition.includes("pouring")) {
      return "linear-gradient(to bottom, hsl(210, 45%, 55%), hsl(220, 40%, 65%))";
    }
    if (condition.includes("snow")) {
      return "linear-gradient(to bottom, hsl(200, 55%, 80%), hsl(210, 50%, 88%))";
    }
    if (condition.includes("cloudy")) {
      return "linear-gradient(to bottom, hsl(210, 40%, 70%), hsl(220, 35%, 78%))";
    }
    if (condition.includes("fog")) {
      return "linear-gradient(to bottom, hsl(0, 0%, 80%), hsl(0, 0%, 88%))";
    }
    return "linear-gradient(to bottom, hsl(210, 65%, 70%), hsl(220, 60%, 80%))";
  };

  if (!animationsEnabled) {
    return (
      <div 
        className="absolute inset-0 -z-10 rounded-3xl"
        style={{ background: getBackgroundGradient() }}
      />
    );
  }

  const renderMainIcon = () => {
    const iconClass = "absolute top-4 right-4 opacity-50";
    const size = 140;

    if (condition.includes("sunny") || condition.includes("clear")) {
      return isNight ? (
        <Moon className={`${iconClass}`} size={size} />
      ) : (
        <Sun className={`${iconClass}`} size={size} />
      );
    }
    if (condition.includes("thunderstorm")) {
      return <CloudLightning className={iconClass} size={size} />;
    }
    if (condition.includes("rain") || condition.includes("pouring")) {
      return <CloudRain className={iconClass} size={size} />;
    }
    if (condition.includes("snow")) {
      return <CloudSnow className={iconClass} size={size} />;
    }
    if (condition.includes("fog") || condition.includes("mist")) {
      return <CloudFog className={`${iconClass} weather-fog`} size={size} />;
    }
    return <Cloud className={`${iconClass} weather-cloud`} size={size} />;
  };

  return (
    <div 
      className="absolute inset-0 -z-10 rounded-3xl overflow-hidden weather-transition"
      style={{ background: getBackgroundGradient() }}
    >
      {/* Icône principale */}
      {renderMainIcon()}

      {/* Nuages (pour conditions nuageuses/partiellement nuageuses) */}
      {(condition.includes("cloudy") || condition.includes("partlycloudy")) && (
        <>
          <Cloud 
            className="absolute top-8 left-10 opacity-35 weather-cloud" 
            size={90} 
          />
          <Cloud 
            className="absolute top-16 left-32 opacity-30 weather-cloud-slow" 
            size={70} 
          />
          <Cloud 
            className="absolute top-24 right-20 opacity-32 weather-cloud" 
            size={80} 
          />
        </>
      )}

      {/* Particules (pluie/neige) */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={condition.includes("snow") ? "weather-snow-flake" : "weather-rain-drop"}
          style={{
            position: "absolute",
            left: `${particle.left}%`,
            width: condition.includes("snow") ? "8px" : "2px",
            height: condition.includes("snow") ? "8px" : "20px",
            background: condition.includes("snow") 
              ? "radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,255,255,0.5))"
              : "rgba(255, 255, 255, 0.6)",
            borderRadius: condition.includes("snow") ? "50%" : "0",
            animationDelay: `${particle.delay}s`,
            animationDuration: condition.includes("snow") ? "3s" : "1s"
          }}
        />
      ))}

      {/* Éclair pour orage */}
      {showLightning && (
        <div
          className="absolute inset-0 bg-white weather-lightning"
          style={{ 
            mixBlendMode: "screen",
            opacity: 0.6
          }}
        />
      )}

      {/* Brouillard */}
      {(condition.includes("fog") || condition.includes("mist")) && (
        <>
          <div
            className="absolute inset-0 bg-white/30 weather-fog"
          />
          <div
            className="absolute inset-0 bg-white/25 weather-fog"
            style={{ 
              animationDelay: "5s" 
            }}
          />
        </>
      )}
    </div>
  );
}
