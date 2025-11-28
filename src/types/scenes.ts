export type SceneScope = "local" | "shared";

export interface SceneEntityState {
  entity_id: string;
  domain: string;
  targetState: {
    state?: "on" | "off" | "open" | "closed" | "playing" | "paused" | "idle";
    brightness?: number; // 0-255
    color_temp?: number;
    rgb_color?: [number, number, number];
    position?: number; // 0-100 for covers
    temperature?: number; // for climate
    hvac_mode?: string; // heat, cool, auto, off
    volume_level?: number; // 0-1 for media_player
    source?: string;
    fan_mode?: string;
    speed?: string;
  };
}

export interface NeoliaScene {
  id: string;
  name: string;
  icon: string;
  color?: string;
  description?: string;
  scope: SceneScope;
  entities: SceneEntityState[];
  order?: number;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SceneWizardDraft {
  name: string;
  icon: string;
  description: string;
  scope: SceneScope;
  selectedEntityIds: string[];
  entityStates: Record<string, SceneEntityState["targetState"]>;
}

export const SCENE_ICON_CATEGORIES = {
  ambiances: {
    label: "Ambiances",
    icons: ["Sun", "Moon", "Sunset", "Sunrise", "Stars", "Sparkles", "Heart", "Flame", "Zap", "CloudMoon", "Lamp", "Glasses", "Eye", "Palette", "Gem", "Crown"]
  },
  rooms: {
    label: "Pièces",
    icons: ["Home", "Sofa", "Bed", "Bath", "UtensilsCrossed", "Car", "Trees", "Building", "DoorOpen", "Armchair", "Warehouse", "Store", "ParkingSquare", "Fence", "LayoutGrid", "FlameKindling"]
  },
  activities: {
    label: "Activités",
    icons: ["Tv", "Clapperboard", "Music", "Gamepad2", "BookOpen", "Briefcase", "Dumbbell", "Coffee", "Wine", "PartyPopper", "Headphones", "Camera", "Mic", "Bike", "Utensils", "ShoppingBag"]
  },
  climate: {
    label: "Climat",
    icons: ["Thermometer", "Fan", "Snowflake", "CloudRain", "Wind", "Droplets", "CloudSun", "Cloudy", "Rainbow", "Umbrella", "ThermometerSun", "ThermometerSnowflake", "Waves", "Sun", "CloudFog", "Heater"]
  },
  misc: {
    label: "Divers",
    icons: ["Star", "Bell", "Clock", "Calendar", "MapPin", "Plane", "LogOut", "LogIn", "Shield", "Lightbulb", "Settings", "Power", "Timer", "Wifi", "Lock", "Unlock"]
  }
} as const;

export const ALL_SCENE_ICONS = Object.values(SCENE_ICON_CATEGORIES).flatMap(cat => cat.icons);

// French translations for icon search
export const ICON_FRENCH_LABELS: Record<string, string[]> = {
  // Ambiances
  Sun: ["soleil", "jour", "journée", "lumineux"],
  Moon: ["lune", "nuit", "nocturne"],
  Sunset: ["coucher de soleil", "crépuscule", "soir"],
  Sunrise: ["lever de soleil", "aube", "matin"],
  Stars: ["étoiles", "nuit", "ciel"],
  Sparkles: ["étincelles", "brillant", "magie"],
  Heart: ["coeur", "amour", "romantique"],
  Flame: ["flamme", "feu", "chaleur"],
  Zap: ["éclair", "énergie", "rapide"],
  CloudMoon: ["nuage lune", "nuit nuageuse"],
  Lamp: ["lampe", "lumière", "éclairage", "ambiance"],
  Glasses: ["lunettes", "vue", "lecture"],
  Eye: ["oeil", "vue", "regarder", "vision"],
  Palette: ["palette", "couleurs", "art", "peinture"],
  Gem: ["gemme", "bijou", "précieux", "diamant"],
  Crown: ["couronne", "roi", "royal", "luxe"],
  // Pièces
  Home: ["maison", "domicile", "accueil"],
  Sofa: ["canapé", "salon", "séjour"],
  Bed: ["lit", "chambre", "dormir", "nuit"],
  Bath: ["bain", "salle de bain", "douche"],
  UtensilsCrossed: ["cuisine", "repas", "manger", "couverts"],
  Car: ["voiture", "garage", "auto"],
  Trees: ["arbres", "jardin", "extérieur", "nature"],
  Building: ["bâtiment", "immeuble", "bureau"],
  DoorOpen: ["porte", "entrée", "sortie"],
  Armchair: ["fauteuil", "salon", "détente"],
  Warehouse: ["entrepôt", "stockage", "cave", "grenier"],
  Store: ["magasin", "boutique", "commerce"],
  ParkingSquare: ["parking", "stationnement", "garage"],
  Fence: ["clôture", "barrière", "jardin", "extérieur"],
  LayoutGrid: ["grille", "plan", "disposition", "pièces"],
  FlameKindling: ["cheminée", "feu", "foyer", "chauffage"],
  // Activités
  Tv: ["télé", "télévision", "film", "regarder"],
  Clapperboard: ["cinéma", "film", "vidéo"],
  Music: ["musique", "son", "audio", "écouter"],
  Gamepad2: ["jeu", "gaming", "manette", "jouer"],
  BookOpen: ["livre", "lecture", "lire", "étude"],
  Briefcase: ["travail", "bureau", "affaires"],
  Dumbbell: ["sport", "musculation", "exercice", "gym"],
  Coffee: ["café", "pause", "matin"],
  Wine: ["vin", "apéro", "soirée", "détente"],
  PartyPopper: ["fête", "party", "célébration", "anniversaire"],
  Headphones: ["casque", "écouteurs", "audio", "musique"],
  Camera: ["appareil photo", "photo", "caméra"],
  Mic: ["micro", "microphone", "voix", "podcast"],
  Bike: ["vélo", "cyclisme", "sport", "balade"],
  Utensils: ["couverts", "repas", "dîner", "manger"],
  ShoppingBag: ["shopping", "courses", "achats", "sac"],
  // Climat
  Thermometer: ["température", "thermomètre", "chaud", "froid"],
  Fan: ["ventilateur", "ventilation", "air", "fraîcheur"],
  Snowflake: ["neige", "froid", "hiver", "climatisation"],
  CloudRain: ["pluie", "nuage", "météo"],
  Wind: ["vent", "air", "ventilation"],
  Droplets: ["gouttes", "eau", "humidité"],
  CloudSun: ["nuage soleil", "météo", "variable"],
  Cloudy: ["nuageux", "couvert", "gris"],
  Rainbow: ["arc-en-ciel", "couleurs"],
  Umbrella: ["parapluie", "pluie"],
  ThermometerSun: ["chaleur", "canicule", "été", "chaud"],
  ThermometerSnowflake: ["gel", "froid", "hiver", "glacial"],
  Waves: ["vagues", "eau", "piscine", "mer"],
  CloudFog: ["brouillard", "brume", "nuage"],
  Heater: ["chauffage", "radiateur", "chaud"],
  // Divers
  Star: ["étoile", "favori", "important"],
  Bell: ["cloche", "notification", "alarme", "sonnerie"],
  Clock: ["horloge", "heure", "temps", "minuterie"],
  Calendar: ["calendrier", "date", "planning"],
  MapPin: ["lieu", "position", "localisation", "adresse"],
  Plane: ["avion", "voyage", "vacances"],
  LogOut: ["sortie", "départ", "quitter"],
  LogIn: ["entrée", "arrivée", "connexion"],
  Shield: ["sécurité", "protection", "alarme"],
  Lightbulb: ["ampoule", "lumière", "idée", "éclairage"],
  Settings: ["paramètres", "réglages", "configuration"],
  Power: ["alimentation", "marche", "arrêt", "éteindre"],
  Timer: ["minuteur", "chrono", "compte à rebours"],
  Wifi: ["wifi", "réseau", "internet", "connexion"],
  Lock: ["verrouiller", "cadenas", "fermé", "sécurité"],
  Unlock: ["déverrouiller", "ouvert", "accès"]
};
