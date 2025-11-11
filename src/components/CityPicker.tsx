import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

// Liste statique de villes CH/FR populaires
const CITIES = [
  // Suisse
  { name: "Genève", country: "CH" },
  { name: "Lausanne", country: "CH" },
  { name: "Zurich", country: "CH" },
  { name: "Berne", country: "CH" },
  { name: "Bâle", country: "CH" },
  { name: "Lucerne", country: "CH" },
  { name: "Neuchâtel", country: "CH" },
  { name: "Fribourg", country: "CH" },
  { name: "Montreux", country: "CH" },
  { name: "Sion", country: "CH" },
  { name: "Lugano", country: "CH" },
  { name: "St-Gall", country: "CH" },
  // France
  { name: "Paris", country: "FR" },
  { name: "Lyon", country: "FR" },
  { name: "Marseille", country: "FR" },
  { name: "Toulouse", country: "FR" },
  { name: "Nice", country: "FR" },
  { name: "Nantes", country: "FR" },
  { name: "Strasbourg", country: "FR" },
  { name: "Montpellier", country: "FR" },
  { name: "Bordeaux", country: "FR" },
  { name: "Lille", country: "FR" },
  { name: "Rennes", country: "FR" },
  { name: "Annecy", country: "FR" },
  { name: "Grenoble", country: "FR" },
  { name: "Dijon", country: "FR" },
];

const HA_INPUT_TEXT = "input_text.ville_meteo";

export const CityPicker = () => {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const client = useHAStore((state) => state.client);
  const isConnected = useHAStore((state) => state.isConnected);

  const filteredCities = useMemo(() => {
    if (!search) return CITIES;
    const lower = search.toLowerCase();
    return CITIES.filter((city) =>
      city.name.toLowerCase().includes(lower)
    );
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
      await client.callService("input_text", "set_value", {
        value: selectedCity,
      }, {
        entity_id: HA_INPUT_TEXT,
      });

      toast.success("Ville mise à jour dans Home Assistant");
      setSearch("");
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour de la ville:", error);
      
      if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
        toast.error("Configurez l'input_text dans Home Assistant");
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
          <span className="font-medium">{selectedCity}</span>
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
            {filteredCities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune ville trouvée
              </p>
            ) : (
              filteredCities.map((city) => (
                <button
                  key={`${city.name}-${city.country}`}
                  onClick={() => {
                    setSelectedCity(city.name);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{city.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({city.country})
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};
