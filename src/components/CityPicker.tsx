import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const HA_ENTITIES = {
  city: "input_text.ville_meteo",
  lat: "input_number.weather_lat",
  lon: "input_number.weather_lon",
};

interface CityResult {
  label: string;
  lat: number;
  lon: number;
}

interface CityPickerProps {
  onCitySaved?: () => void;
}

export const CityPicker = ({ onCitySaved }: CityPickerProps) => {
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState<CityResult[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const client = useHAStore((state) => state.client);
  const isConnected = useHAStore((state) => state.isConnected);
  const entities = useHAStore((state) => state.entities);
  const setWeatherEntity = useHAStore((state) => state.setWeatherEntity);
  const setSelectedCityStore = useHAStore((state) => state.setSelectedCity);

  // Debounced search via Open-Meteo Geocoding API
  useEffect(() => {
    if (!search || search.length < 2) {
      setCities([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          search
        )}&count=10&language=fr&format=json`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const formatted: CityResult[] = data.results.map((r: any) => ({
            label: `${r.name}${r.admin1 ? `, ${r.admin1}` : ""}${r.country ? `, ${r.country}` : ""}`,
            lat: r.latitude,
            lon: r.longitude,
          }));
          setCities(formatted);
        } else {
          setCities([]);
        }
      } catch (error) {
        console.error("Erreur recherche ville:", error);
        toast.error("Erreur lors de la recherche");
        setCities([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSaveCity = async () => {
    if (!selectedCity) {
      toast.error("Veuillez sélectionner une ville");
      return;
    }

    if (!client || !isConnected) {
      toast.error("Non connecté à Home Assistant");
      return;
    }

    setIsLoading(true);
    try {
      // Mise à jour de la ville, lat, lon dans l'ordre
      await client.callService("input_text", "set_value", {
        value: selectedCity.label,
      }, {
        entity_id: HA_ENTITIES.city,
      });

      await client.callService("input_number", "set_value", {
        value: selectedCity.lat,
      }, {
        entity_id: HA_ENTITIES.lat,
      });

      await client.callService("input_number", "set_value", {
        value: selectedCity.lon,
      }, {
        entity_id: HA_ENTITIES.lon,
      });

      // Mise à jour du store local
      setSelectedCityStore({
        label: selectedCity.label,
        lat: selectedCity.lat,
        lon: selectedCity.lon,
      });

      // Sélectionner automatiquement la meilleure entité météo
      if (entities && entities.length) {
        const weathers = entities.filter(e => e.entity_id.startsWith("weather."));
        if (weathers.length) {
          const lc = selectedCity.label.toLowerCase();
          const best =
            weathers.find(w => (w.attributes.friendly_name || "").toLowerCase().includes(lc))
            || weathers[0];
          setWeatherEntity(best.entity_id);
          console.log("✅ Entité météo sélectionnée:", best.entity_id);
        } else {
          setWeatherEntity(null);
          console.log("ℹ️ Aucune entité weather.*, utilisation des capteurs");
        }
      }

      // Nettoyer les champs
      setSearch("");
      setSelectedCity(null);
      setCities([]);
      
      toast.success("Ville enregistrée");
      
      // Fermer le dialog immédiatement via callback
      if (onCitySaved) {
        onCitySaved();
      }
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour de la ville:", error);
      
      if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
        toast.error("Configurez les entités météo dans Home Assistant");
      } else {
        toast.error("Erreur lors de la mise à jour de la ville");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Sélectionner une ville</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher une ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {selectedCity && (
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
          <span className="font-medium text-sm">{selectedCity.label}</span>
          <Button
            onClick={handleSaveCity}
            disabled={isLoading || !isConnected}
            size="sm"
          >
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      )}

      {search && (
        <ScrollArea className="h-48">
          <div className="space-y-1">
            {isSearching ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Recherche...
              </p>
            ) : cities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune ville trouvée
              </p>
            ) : (
              cities.map((city, idx) => (
                <button
                  key={`${city.label}-${idx}`}
                  onClick={() => {
                    setSelectedCity(city);
                    setSearch("");
                    setCities([]);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <span className="font-medium text-sm">{city.label}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};
