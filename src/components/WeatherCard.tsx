import { Card } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface WeatherCardProps {
  onConfigure?: () => void;
}

export const WeatherCard = ({ onConfigure }: WeatherCardProps) => {
  const [location] = useState("Lausanne, Suisse");
  
  // Données de démonstration - à remplacer par une vraie API météo
  const weatherData = {
    temperature: 18,
    condition: "Partiellement nuageux",
    humidity: 65,
    wind: 12,
    forecast: [
      { day: "Lun", temp: 19, icon: Sun },
      { day: "Mar", temp: 17, icon: CloudRain },
      { day: "Mer", temp: 20, icon: Sun },
      { day: "Jeu", temp: 18, icon: Cloud },
    ]
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-background/50 to-purple-500/10 backdrop-blur-lg border-border/30">
      <div className="absolute inset-0 bg-gradient-primary opacity-5" />
      
      <div className="relative p-8 space-y-6">
        {/* Localisation */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-muted-foreground">{location}</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onConfigure}
            className="text-muted-foreground hover:text-foreground"
          >
            Configurer
          </Button>
        </div>

        {/* Température principale */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-6xl font-bold">{weatherData.temperature}°</div>
            <p className="text-xl text-muted-foreground mt-2">{weatherData.condition}</p>
          </div>
          <Cloud className="h-24 w-24 text-blue-400/50" />
        </div>

        {/* Détails météo */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
          <div className="flex items-center gap-3">
            <Droplets className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-sm text-muted-foreground">Humidité</p>
              <p className="font-semibold">{weatherData.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Wind className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-sm text-muted-foreground">Vent</p>
              <p className="font-semibold">{weatherData.wind} km/h</p>
            </div>
          </div>
        </div>

        {/* Prévisions */}
        <div className="grid grid-cols-4 gap-3 pt-4 border-t border-border/30">
          {weatherData.forecast.map((day, i) => {
            const Icon = day.icon;
            return (
              <div key={i} className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">{day.day}</p>
                <Icon className="h-6 w-6 mx-auto text-blue-400" />
                <p className="font-semibold">{day.temp}°</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
