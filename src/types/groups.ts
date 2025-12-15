/**
 * Types pour la gestion des groupes d'appareils
 */

// Domaines binaires supportés pour les groupes mixtes
export type HaGroupDomain = "light" | "cover" | "switch" | "fan" | "media_player" | "valve" | "climate" | "lock";

export type GroupScope = "local" | "shared";

// Mode du groupe : domaine unique ou mixte binaire
export type GroupMode = "singleDomain" | "mixedBinary";

export interface NeoliaGroup {
  id: string;
  name: string;
  icon?: string; // Icône Lucide (ex: "Lightbulb", "Blinds")
  domain: HaGroupDomain; // Domaine principal (pour compat legacy)
  domains?: string[]; // Liste des domaines si groupe mixte
  mode?: GroupMode; // "singleDomain" ou "mixedBinary" (default: singleDomain pour compat)
  entityIds: string[];
  haEntityId?: string; // ex: group.neolia_salon (seulement pour les groupes partagés)
  scope: GroupScope; // "local" = utilisé uniquement dans l'app locale
                     // "shared" = groupe partagé pour tous les utilisateurs
  
  // Compat legacy: si isShared existe, on le convertit en scope
  isShared?: boolean;
}

export interface GroupWizardState {
  step: number;
  domains: string[]; // Support multi-domaines
  name: string;
  selectedEntityIds: string[];
  isMixedMode: boolean; // Mode groupe mixte binaire
}

/**
 * Helper pour obtenir le scope depuis un groupe (gère la migration isShared → scope)
 */
export function getGroupScope(group: NeoliaGroup): GroupScope {
  if (group.scope) return group.scope;
  // Migration legacy
  return group.isShared ? "shared" : "local";
}

/**
 * Helper pour obtenir les domaines d'un groupe (gère la migration domain → domains)
 */
export function getGroupDomains(group: NeoliaGroup): string[] {
  if (group.domains && group.domains.length > 0) return group.domains;
  return [group.domain];
}

/**
 * Helper pour obtenir le mode d'un groupe (gère la migration vers mode)
 */
export function getGroupMode(group: NeoliaGroup): GroupMode {
  if (group.mode) return group.mode;
  // Legacy: si domains > 1, c'est mixedBinary, sinon singleDomain
  if (group.domains && group.domains.length > 1) return "mixedBinary";
  return "singleDomain";
}

// Catégories d'icônes pour les groupes
export const GROUP_ICON_CATEGORIES = {
  eclairage: {
    label: "Éclairage",
    icons: ["Lightbulb", "Lamp", "LampDesk", "LampCeiling", "Sun", "Moon", "Sparkles", "Zap", "Flashlight", "SunDim", "CircleDot", "Flame"]
  },
  volets: {
    label: "Volets & Stores",
    icons: ["Blinds", "PanelTop", "PanelBottom", "ArrowUpFromLine", "ArrowDownToLine", "Maximize2", "Minimize2", "Square", "RectangleHorizontal", "RectangleVertical", "LayoutPanelTop", "Rows3"]
  },
  climat: {
    label: "Climat",
    icons: ["Thermometer", "ThermometerSun", "ThermometerSnowflake", "Fan", "Snowflake", "Wind", "Droplets", "CloudRain", "Heater", "Waves", "AirVent", "Gauge"]
  },
  securite: {
    label: "Sécurité",
    icons: ["Lock", "Unlock", "Shield", "ShieldCheck", "ShieldAlert", "Key", "KeyRound", "DoorClosed", "DoorOpen", "Eye", "EyeOff", "Bell"]
  },
  multimedia: {
    label: "Multimédia",
    icons: ["Tv", "Speaker", "Music", "Radio", "Headphones", "Volume2", "Play", "Pause", "SkipForward", "SkipBack", "Mic", "Camera"]
  },
  maison: {
    label: "Maison",
    icons: ["Home", "Building", "Warehouse", "Sofa", "Bed", "Bath", "UtensilsCrossed", "Armchair", "Trees", "Fence", "Car", "Plug"]
  },
  divers: {
    label: "Divers",
    icons: ["Package", "Layers", "Grid3X3", "LayoutGrid", "Boxes", "Component", "Puzzle", "Cog", "Settings", "Power", "ToggleLeft", "ToggleRight"]
  }
} as const;

export const ALL_GROUP_ICONS = Object.values(GROUP_ICON_CATEGORIES).flatMap(cat => cat.icons);

// Labels français pour la recherche d'icônes
export const GROUP_ICON_FRENCH_LABELS: Record<string, string[]> = {
  // Éclairage
  Lightbulb: ["ampoule", "lumière", "éclairage", "lampe"],
  Lamp: ["lampe", "lumière", "éclairage", "ambiance"],
  LampDesk: ["lampe bureau", "bureau", "lecture"],
  LampCeiling: ["plafonnier", "plafond", "lustre"],
  Sun: ["soleil", "jour", "lumineux"],
  Moon: ["lune", "nuit", "nocturne"],
  Sparkles: ["étincelles", "brillant", "magie"],
  Zap: ["éclair", "énergie", "flash"],
  Flashlight: ["lampe torche", "torche", "portable"],
  SunDim: ["lumière tamisée", "dim", "faible"],
  CircleDot: ["spot", "point", "led"],
  Flame: ["flamme", "feu", "bougie"],
  // Volets & Stores
  Blinds: ["stores", "volets", "rideaux"],
  PanelTop: ["panneau haut", "volet", "store"],
  PanelBottom: ["panneau bas", "volet", "store"],
  ArrowUpFromLine: ["monter", "ouvrir", "lever"],
  ArrowDownToLine: ["descendre", "fermer", "baisser"],
  Maximize2: ["ouvrir", "agrandir", "maximiser"],
  Minimize2: ["fermer", "réduire", "minimiser"],
  Square: ["carré", "fenêtre", "cadre"],
  RectangleHorizontal: ["rectangle", "horizontal", "large"],
  RectangleVertical: ["rectangle", "vertical", "haut"],
  LayoutPanelTop: ["panneau", "haut", "volet"],
  Rows3: ["lignes", "bandes", "stores"],
  // Climat
  Thermometer: ["température", "thermomètre", "chaud", "froid"],
  ThermometerSun: ["chaleur", "canicule", "été"],
  ThermometerSnowflake: ["gel", "froid", "hiver"],
  Fan: ["ventilateur", "ventilation", "air"],
  Snowflake: ["neige", "froid", "climatisation", "clim"],
  Wind: ["vent", "air", "ventilation"],
  Droplets: ["gouttes", "eau", "humidité"],
  CloudRain: ["pluie", "nuage", "météo"],
  Heater: ["chauffage", "radiateur", "chaud"],
  Waves: ["vagues", "eau", "piscine"],
  AirVent: ["ventilation", "aération", "air"],
  Gauge: ["jauge", "mesure", "indicateur"],
  // Sécurité
  Lock: ["verrouiller", "cadenas", "sécurité", "fermé"],
  Unlock: ["déverrouiller", "ouvert", "accès"],
  Shield: ["bouclier", "sécurité", "protection"],
  ShieldCheck: ["sécurisé", "protection", "validé"],
  ShieldAlert: ["alerte", "alarme", "danger"],
  Key: ["clé", "accès", "serrure"],
  KeyRound: ["clé ronde", "accès", "serrure"],
  DoorClosed: ["porte fermée", "fermer", "entrée"],
  DoorOpen: ["porte ouverte", "ouvrir", "sortie"],
  Eye: ["oeil", "voir", "surveillance"],
  EyeOff: ["invisible", "masqué", "caché"],
  Bell: ["cloche", "sonnette", "alarme"],
  // Multimédia
  Tv: ["télé", "télévision", "écran"],
  Speaker: ["enceinte", "haut-parleur", "son"],
  Music: ["musique", "audio", "son"],
  Radio: ["radio", "fm", "audio"],
  Headphones: ["casque", "écouteurs", "audio"],
  Volume2: ["volume", "son", "audio"],
  Play: ["lecture", "jouer", "lancer"],
  Pause: ["pause", "stop", "arrêt"],
  SkipForward: ["suivant", "avancer", "piste"],
  SkipBack: ["précédent", "reculer", "piste"],
  Mic: ["micro", "voix", "enregistrer"],
  Camera: ["caméra", "vidéo", "surveillance"],
  // Maison
  Home: ["maison", "domicile", "accueil"],
  Building: ["bâtiment", "immeuble", "bureau"],
  Warehouse: ["entrepôt", "garage", "stockage"],
  Sofa: ["canapé", "salon", "séjour"],
  Bed: ["lit", "chambre", "dormir"],
  Bath: ["bain", "salle de bain", "douche"],
  UtensilsCrossed: ["cuisine", "repas", "couverts"],
  Armchair: ["fauteuil", "salon", "détente"],
  Trees: ["arbres", "jardin", "extérieur"],
  Fence: ["clôture", "barrière", "jardin"],
  Car: ["voiture", "garage", "auto"],
  Plug: ["prise", "électricité", "branchement"],
  // Divers
  Package: ["paquet", "groupe", "ensemble"],
  Layers: ["couches", "niveaux", "groupes"],
  Grid3X3: ["grille", "matrice", "ensemble"],
  LayoutGrid: ["disposition", "grille", "arrangement"],
  Boxes: ["boîtes", "paquets", "groupes"],
  Component: ["composant", "élément", "module"],
  Puzzle: ["puzzle", "pièce", "ensemble"],
  Cog: ["engrenage", "réglage", "paramètre"],
  Settings: ["paramètres", "réglages", "config"],
  Power: ["alimentation", "marche", "arrêt"],
  ToggleLeft: ["interrupteur", "gauche", "off"],
  ToggleRight: ["interrupteur", "droite", "on"]
};
