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

// Polling pour attendre que les données deviennent valides
const waitForValidData = async (entityId: string, timeoutMs: number): Promise<boolean> => {
  const start = Date.now();
  const connection = useHAStore.getState().connection;
  
  if (!connection) return false;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${connection.url}/api/states/${entityId}`, {
        headers: { 
          Authorization: `Bearer ${connection.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const value = parseFloat(data.state);
        if (Number.isFinite(value) && value !== 0) {
          return true;
        }
      }
    } catch (error) {
      console.warn("Polling error:", error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  return false;
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

      // Forcer la mise à jour immédiate du capteur REST
      try {
        await client.callService("homeassistant", "update_entity", {}, {
          entity_id: "sensor.metno_brut",
        });
      } catch (updateError) {
        console.warn("Impossible de forcer update_entity:", updateError);
      }

      // Attendre que les données météo deviennent valides (polling 8s max)
      toast.loading("Mise à jour de la météo...");
      const tempValid = await waitForValidData("sensor.city_weather_temperature", 8000);
      
      if (tempValid) {
        toast.success("Ville mise à jour dans Home Assistant");
      } else {
        toast.success("Ville enregistrée (données en cours de chargement)");
      }

      setSearch("");
      setSelectedCity(null);
      setCities([]);
      
      // Notifier le parent pour rafraîchir les données météo
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
