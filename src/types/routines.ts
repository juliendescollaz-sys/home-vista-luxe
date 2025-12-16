export type RoutineScope = "local" | "shared";

export type RoutineFrequency = "once" | "daily" | "weekly" | "monthly" | "yearly";

export interface RoutineSchedule {
  frequency: RoutineFrequency;
  // For "once": specific date/time
  date?: string; // ISO date string (YYYY-MM-DD)
  // For "daily": selected days of week (0=Sunday, 1=Monday, etc.)
  daysOfWeek?: number[];
  // For "weekly": which day of the week (0-6)
  dayOfWeek?: number;
  // For "monthly": which day of the month (1-31)
  dayOfMonth?: number;
  // For "yearly": month (1-12) and day (1-31)
  month?: number;
  dayOfMonthYearly?: number;
  // Time for all frequencies
  time: string; // HH:MM format
}

export interface RoutineAction {
  type: "device" | "scene" | "group";
  id: string;
  // For devices: target state
  targetState?: {
    state?: "on" | "off" | "open" | "closed" | "playing" | "paused" | "idle";
    brightness?: number;
    color_temp?: number;
    rgb_color?: [number, number, number];
    position?: number;
    temperature?: number;
    hvac_mode?: string;
    volume_level?: number;
    source?: string;
    fan_mode?: string;
    speed?: string;
  };
  // For scenes: just execute (no state needed)
  // For groups: on/off
  groupState?: "on" | "off";
}

export interface NeoliaRoutine {
  id: string;
  name: string;
  icon: string;
  description?: string;
  scope: RoutineScope;
  actions: RoutineAction[];
  schedule: RoutineSchedule;
  enabled: boolean;
  order?: number;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineWizardDraft {
  name: string;
  icon: string;
  description: string;
  scope: RoutineScope;
  // Selected items (devices, scenes, groups)
  selectedItems: RoutineAction[];
  // Schedule configuration
  schedule: RoutineSchedule;
}

// Reuse scene icons for routines
export const ROUTINE_ICON_CATEGORIES = {
  temps: {
    label: "Temps",
    icons: ["Clock", "Timer", "Calendar", "CalendarDays", "CalendarClock", "Alarm", "Hourglass", "Watch", "Sunrise", "Sunset", "Sun", "Moon", "AlarmClock", "History", "TimerReset", "Clock12"]
  },
  actions: {
    label: "Actions",
    icons: ["Play", "Power", "Zap", "RefreshCw", "RotateCw", "ArrowRight", "Check", "CheckCircle", "Bell", "BellRing", "Megaphone", "Send", "PlayCircle", "Repeat", "Workflow", "CirclePlay"]
  },
  ambiances: {
    label: "Ambiances",
    icons: ["Sparkles", "Stars", "Heart", "Flame", "CloudMoon", "Lamp", "Lightbulb", "Palette", "Gem", "Crown", "PartyPopper", "Music", "Rainbow", "Glasses", "Wine", "Coffee"]
  },
  maison: {
    label: "Maison",
    icons: ["Home", "DoorOpen", "DoorClosed", "Lock", "Unlock", "Shield", "ShieldCheck", "LogIn", "LogOut", "Car", "Plane", "Bed", "Sofa", "Bath", "Building", "Warehouse"]
  },
  climat: {
    label: "Climat",
    icons: ["Thermometer", "ThermometerSun", "ThermometerSnowflake", "Fan", "Snowflake", "Wind", "Droplets", "CloudRain", "Heater", "Waves", "AirVent", "Cloudy", "CloudSun", "Umbrella", "CloudFog", "Gauge"]
  },
  evenements: {
    label: "Évènements",
    icons: ["PartyPopper", "Gift", "Cake", "Heart", "Star", "Sparkles", "TreePine", "Snowflake", "Bell", "Wine", "Glasses", "Music", "Flower2", "Leaf", "Crown", "Gem"]
  }
} as const;

export const ALL_ROUTINE_ICONS = Object.values(ROUTINE_ICON_CATEGORIES).flatMap(cat => cat.icons);

// French translations for icon search
export const ROUTINE_ICON_FRENCH_LABELS: Record<string, string[]> = {
  // Temps
  Clock: ["horloge", "heure", "temps", "montre"],
  Timer: ["minuteur", "chrono", "compte à rebours"],
  Calendar: ["calendrier", "date", "planning"],
  CalendarDays: ["calendrier", "jours", "semaine"],
  CalendarClock: ["calendrier", "heure", "planifier"],
  Alarm: ["alarme", "réveil", "notification"],
  Hourglass: ["sablier", "temps", "attente"],
  Watch: ["montre", "heure", "temps"],
  Sunrise: ["lever de soleil", "aube", "matin"],
  Sunset: ["coucher de soleil", "crépuscule", "soir"],
  Sun: ["soleil", "jour", "journée"],
  Moon: ["lune", "nuit", "nocturne"],
  // Actions
  Play: ["jouer", "lancer", "démarrer", "activer"],
  Power: ["alimentation", "marche", "arrêt", "éteindre"],
  Zap: ["éclair", "énergie", "rapide"],
  RefreshCw: ["rafraîchir", "renouveler", "répéter"],
  RotateCw: ["rotation", "tourner", "cycle"],
  ArrowRight: ["flèche", "suivant", "continuer"],
  Check: ["valider", "confirmer", "ok"],
  CheckCircle: ["validé", "confirmé", "succès"],
  Bell: ["cloche", "notification", "sonnerie"],
  BellRing: ["sonnerie", "alerte", "notification"],
  Megaphone: ["annonce", "alerte", "notification"],
  Send: ["envoyer", "transmettre", "activer"],
  // Ambiances
  Sparkles: ["étincelles", "brillant", "magie"],
  Stars: ["étoiles", "nuit", "ciel"],
  Heart: ["coeur", "amour", "romantique"],
  Flame: ["flamme", "feu", "chaleur"],
  CloudMoon: ["nuage lune", "nuit nuageuse"],
  Lamp: ["lampe", "lumière", "éclairage"],
  Lightbulb: ["ampoule", "lumière", "idée"],
  Palette: ["palette", "couleurs", "art"],
  Gem: ["gemme", "bijou", "précieux"],
  Crown: ["couronne", "roi", "royal"],
  PartyPopper: ["fête", "party", "célébration"],
  Music: ["musique", "son", "audio"],
  // Maison
  Home: ["maison", "domicile", "accueil"],
  DoorOpen: ["porte ouverte", "entrée", "arrivée"],
  DoorClosed: ["porte fermée", "sortie", "départ"],
  Lock: ["verrouiller", "cadenas", "sécurité"],
  Unlock: ["déverrouiller", "ouvert", "accès"],
  Shield: ["sécurité", "protection", "alarme"],
  ShieldCheck: ["sécurisé", "protection", "validé"],
  LogIn: ["entrée", "arrivée", "connexion"],
  LogOut: ["sortie", "départ", "quitter"],
  Car: ["voiture", "garage", "auto"],
  Plane: ["avion", "voyage", "vacances"],
  Bed: ["lit", "chambre", "dormir", "nuit"],
  // Climat
  Thermometer: ["température", "thermomètre", "chaud", "froid"],
  ThermometerSun: ["chaleur", "canicule", "été"],
  ThermometerSnowflake: ["gel", "froid", "hiver"],
  Fan: ["ventilateur", "ventilation", "air"],
  Snowflake: ["neige", "froid", "climatisation"],
  Wind: ["vent", "air", "ventilation"],
  Droplets: ["gouttes", "eau", "humidité"],
  CloudRain: ["pluie", "nuage", "météo"],
  Heater: ["chauffage", "radiateur", "chaud"],
  Waves: ["vagues", "eau", "piscine"],
  AirVent: ["ventilation", "aération", "air"],
  Cloudy: ["nuageux", "couvert", "gris"],
  CloudSun: ["nuage soleil", "météo", "variable"],
  Umbrella: ["parapluie", "pluie"],
  CloudFog: ["brouillard", "brume", "nuage"],
  Gauge: ["jauge", "mesure", "niveau"],
  // Évènements
  Gift: ["cadeau", "présent", "noël", "anniversaire"],
  Cake: ["gâteau", "anniversaire", "fête", "dessert"],
  TreePine: ["sapin", "noël", "hiver", "fête"],
  Flower2: ["fleur", "printemps", "pâques", "nature"],
  Leaf: ["feuille", "automne", "thanksgiving", "nature"],
  // Temps supplémentaires
  AlarmClock: ["réveil", "alarme", "matin"],
  History: ["historique", "passé", "récent"],
  TimerReset: ["réinitialiser", "timer", "chrono"],
  Clock12: ["midi", "minuit", "horloge"],
  // Actions supplémentaires
  PlayCircle: ["lecture", "play", "démarrer"],
  Repeat: ["répéter", "boucle", "cycle"],
  Workflow: ["flux", "processus", "automatisation"],
  CirclePlay: ["jouer", "lecture", "démarrer"],
  // Ambiances supplémentaires
  Rainbow: ["arc-en-ciel", "couleurs", "fête"],
  Glasses: ["lunettes", "fête", "nouvel an"],
  Wine: ["vin", "apéro", "célébration"],
  Coffee: ["café", "pause", "matin"],
  // Maison supplémentaires
  Sofa: ["canapé", "salon", "détente"],
  Bath: ["bain", "salle de bain", "douche"],
  Building: ["bâtiment", "immeuble", "bureau"],
  Warehouse: ["entrepôt", "garage", "stockage"],
};

export const DAYS_OF_WEEK = [
  { value: 0, label: "Dim", fullLabel: "Dimanche" },
  { value: 1, label: "Lun", fullLabel: "Lundi" },
  { value: 2, label: "Mar", fullLabel: "Mardi" },
  { value: 3, label: "Mer", fullLabel: "Mercredi" },
  { value: 4, label: "Jeu", fullLabel: "Jeudi" },
  { value: 5, label: "Ven", fullLabel: "Vendredi" },
  { value: 6, label: "Sam", fullLabel: "Samedi" },
];

export const MONTHS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
];
