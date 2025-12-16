/**
 * Types for Smarthome Automations
 * IFTTT-style with advanced nested conditions (AND/OR)
 */

export type SmartScope = "shared"; // Always HA automations

// ========================
// TRIGGERS (WHEN)
// ========================

export type TriggerType = "state" | "time" | "sun" | "numeric" | "zone";

export interface StateTrigger {
  type: "state";
  entityId: string;
  from?: string;
  to?: string;
  for?: { hours?: number; minutes?: number; seconds?: number };
}

export interface TimeTrigger {
  type: "time";
  at: string; // HH:MM or "sunrise"/"sunset"
  offset?: number; // minutes offset for sun events
}

export interface SunTrigger {
  type: "sun";
  event: "sunrise" | "sunset";
  offset?: number; // minutes before (-) or after (+)
}

export interface NumericTrigger {
  type: "numeric";
  entityId: string;
  above?: number;
  below?: number;
  attribute?: string; // e.g., "brightness", "temperature"
}

export interface ZoneTrigger {
  type: "zone";
  entityId: string; // person.xxx or device_tracker.xxx
  zone: string; // zone.home, zone.work, etc.
  event: "enter" | "leave";
}

export type SmartTrigger = StateTrigger | TimeTrigger | SunTrigger | NumericTrigger | ZoneTrigger;

// ========================
// CONDITIONS (IF)
// ========================

export type ConditionType = "state" | "time" | "sun" | "numeric" | "zone" | "template";

export interface StateCondition {
  type: "state";
  entityId: string;
  state: string;
}

export interface TimeCondition {
  type: "time";
  after?: string; // HH:MM
  before?: string; // HH:MM
  weekday?: number[]; // 0=Sun, 1=Mon, etc.
}

export interface SunCondition {
  type: "sun";
  after?: "sunrise" | "sunset";
  afterOffset?: number;
  before?: "sunrise" | "sunset";
  beforeOffset?: number;
}

export interface NumericCondition {
  type: "numeric";
  entityId: string;
  above?: number;
  below?: number;
  attribute?: string;
}

export interface ZoneCondition {
  type: "zone";
  entityId: string;
  zone: string;
}

export interface TemplateCondition {
  type: "template";
  template: string;
}

export type SmartCondition = StateCondition | TimeCondition | SunCondition | NumericCondition | ZoneCondition | TemplateCondition;

// ========================
// CONDITION GROUPS (AND/OR logic)
// ========================

export interface ConditionGroup {
  id: string;
  operator: "and" | "or";
  conditions: SmartCondition[];
}

// Top-level conditions can be combined with AND/OR between groups
export interface ConditionBlock {
  rootOperator: "and" | "or"; // How groups are combined
  groups: ConditionGroup[];
}

// ========================
// ACTIONS (THEN)
// ========================

export interface SmartAction {
  type: "device" | "scene" | "service" | "delay" | "notify";
  entityId?: string;
  service?: string; // e.g., "light.turn_on", "script.my_script"
  data?: Record<string, any>;
  delaySeconds?: number;
  notifyMessage?: string;
  notifyTitle?: string;
}

// ========================
// AUTOMATION
// ========================

export interface SmartAutomation {
  id: string;
  name: string;
  icon: string;
  description?: string;
  triggers: SmartTrigger[];
  conditions: ConditionBlock;
  actions: SmartAction[];
  enabled: boolean;
  order?: number;
  isFavorite?: boolean;
  mode?: "single" | "restart" | "queued" | "parallel";
  createdAt: string;
  updatedAt: string;
}

// ========================
// WIZARD DRAFT
// ========================

export interface SmartWizardDraft {
  name: string;
  icon: string;
  description: string;
  triggers: SmartTrigger[];
  conditions: ConditionBlock;
  actions: SmartAction[];
  mode: "single" | "restart" | "queued" | "parallel";
}

// ========================
// ICON CATEGORIES (same as routines for consistency)
// ========================

export const SMART_ICON_CATEGORIES = {
  declencheurs: {
    label: "Déclencheurs",
    icons: ["Sunrise", "Sunset", "Sun", "Moon", "Clock", "Timer", "Calendar", "Zap", "Activity", "Waypoints", "Radio", "Waves"]
  },
  presence: {
    label: "Présence",
    icons: ["Home", "LogIn", "LogOut", "User", "Users", "UserCheck", "MapPin", "Navigation", "Locate", "Target", "Scan", "Eye"]
  },
  capteurs: {
    label: "Capteurs",
    icons: ["Thermometer", "Droplets", "Wind", "CloudRain", "Gauge", "Activity", "BarChart3", "TrendingUp", "TrendingDown", "Ruler"]
  },
  appareils: {
    label: "Appareils",
    icons: ["Lightbulb", "Lamp", "Fan", "Heater", "Snowflake", "Tv", "Speaker", "Lock", "DoorOpen", "Camera", "Blinds", "Power"]
  },
  securite: {
    label: "Sécurité",
    icons: ["Shield", "ShieldCheck", "ShieldAlert", "AlertTriangle", "Bell", "BellRing", "Siren", "Lock", "Unlock", "Eye", "EyeOff", "Key"]
  },
  autre: {
    label: "Autre",
    icons: ["Sparkles", "Bot", "Cpu", "Settings", "Cog", "Workflow", "GitBranch", "Share2", "Layers", "Box", "Package", "Star"]
  }
} as const;

export const ALL_SMART_ICONS = Object.values(SMART_ICON_CATEGORIES).flatMap(cat => cat.icons);

// French labels for icon search
export const SMART_ICON_FRENCH_LABELS: Record<string, string[]> = {
  Sunrise: ["lever de soleil", "aube", "matin"],
  Sunset: ["coucher de soleil", "crépuscule", "soir"],
  Sun: ["soleil", "jour", "luminosité"],
  Moon: ["lune", "nuit", "nocturne"],
  Clock: ["horloge", "heure", "temps"],
  Timer: ["minuteur", "chrono", "délai"],
  Calendar: ["calendrier", "date", "planning"],
  Zap: ["éclair", "déclencheur", "instant"],
  Activity: ["activité", "mouvement", "détection"],
  Waypoints: ["trajet", "parcours", "chemin"],
  Radio: ["radio", "signal", "fréquence"],
  Waves: ["ondes", "signal", "vibration"],
  Home: ["maison", "domicile", "arrivée"],
  LogIn: ["entrée", "arrivée", "connexion"],
  LogOut: ["sortie", "départ", "quitter"],
  User: ["utilisateur", "personne", "profil"],
  Users: ["utilisateurs", "famille", "groupe"],
  UserCheck: ["présent", "vérifié", "confirmé"],
  MapPin: ["position", "lieu", "localisation"],
  Navigation: ["navigation", "direction", "gps"],
  Locate: ["localiser", "position", "repérer"],
  Target: ["cible", "objectif", "zone"],
  Scan: ["scanner", "détecter", "analyser"],
  Eye: ["œil", "voir", "surveiller"],
  Thermometer: ["température", "thermomètre", "chaleur"],
  Droplets: ["humidité", "eau", "gouttes"],
  Wind: ["vent", "air", "ventilation"],
  CloudRain: ["pluie", "météo", "nuage"],
  Gauge: ["jauge", "niveau", "mesure"],
  BarChart3: ["graphique", "statistiques", "données"],
  TrendingUp: ["hausse", "augmentation", "monte"],
  TrendingDown: ["baisse", "diminution", "descend"],
  Ruler: ["règle", "mesure", "dimension"],
  Lightbulb: ["ampoule", "lumière", "éclairage"],
  Lamp: ["lampe", "éclairage", "luminaire"],
  Fan: ["ventilateur", "ventilation", "air"],
  Heater: ["chauffage", "radiateur", "chaleur"],
  Snowflake: ["climatisation", "froid", "fraîcheur"],
  Tv: ["télévision", "écran", "média"],
  Speaker: ["enceinte", "son", "audio"],
  Lock: ["verrouillé", "sécurité", "fermer"],
  DoorOpen: ["porte", "ouvrir", "entrée"],
  Camera: ["caméra", "vidéo", "surveillance"],
  Blinds: ["volets", "stores", "occultation"],
  Power: ["alimentation", "marche", "arrêt"],
  Shield: ["sécurité", "protection", "alarme"],
  ShieldCheck: ["sécurisé", "vérifié", "protégé"],
  ShieldAlert: ["alerte", "danger", "attention"],
  AlertTriangle: ["avertissement", "attention", "danger"],
  Bell: ["cloche", "notification", "alerte"],
  BellRing: ["sonnerie", "notification", "alarme"],
  Siren: ["sirène", "alarme", "urgence"],
  Unlock: ["déverrouillé", "ouvert", "accès"],
  EyeOff: ["invisible", "caché", "discret"],
  Key: ["clé", "accès", "autorisation"],
  Sparkles: ["magie", "automatique", "intelligent"],
  Bot: ["robot", "automatisation", "ia"],
  Cpu: ["processeur", "intelligence", "calcul"],
  Settings: ["paramètres", "configuration", "réglages"],
  Cog: ["engrenage", "mécanique", "système"],
  Workflow: ["flux", "processus", "automatisation"],
  GitBranch: ["condition", "branche", "choix"],
  Share2: ["partage", "connexion", "lien"],
  Layers: ["couches", "niveaux", "strates"],
  Box: ["boîte", "conteneur", "module"],
  Package: ["paquet", "ensemble", "groupe"],
  Star: ["favori", "important", "préféré"],
};

// ========================
// HELPER CONSTANTS
// ========================

export const TRIGGER_TYPE_LABELS: Record<TriggerType, { label: string; description: string; icon: string }> = {
  state: { 
    label: "État d'un appareil", 
    description: "Quand un appareil change d'état (s'allume, s'éteint, s'ouvre...)",
    icon: "Power"
  },
  time: { 
    label: "Heure précise", 
    description: "À une heure fixe de la journée",
    icon: "Clock"
  },
  sun: { 
    label: "Lever/Coucher du soleil", 
    description: "Au lever ou coucher du soleil (avec décalage possible)",
    icon: "Sunrise"
  },
  numeric: { 
    label: "Seuil numérique", 
    description: "Quand une valeur dépasse ou passe sous un seuil (température, luminosité...)",
    icon: "Gauge"
  },
  zone: { 
    label: "Présence dans une zone", 
    description: "Quand quelqu'un entre ou quitte une zone",
    icon: "MapPin"
  },
};

export const CONDITION_TYPE_LABELS: Record<ConditionType, { label: string; description: string; icon: string }> = {
  state: { 
    label: "État d'un appareil", 
    description: "Seulement si un appareil est dans un certain état",
    icon: "Power"
  },
  time: { 
    label: "Plage horaire", 
    description: "Seulement pendant certaines heures ou jours",
    icon: "Clock"
  },
  sun: { 
    label: "Position du soleil", 
    description: "Seulement avant/après le lever ou coucher du soleil",
    icon: "Sun"
  },
  numeric: { 
    label: "Valeur numérique", 
    description: "Seulement si une valeur est au-dessus/en-dessous d'un seuil",
    icon: "Gauge"
  },
  zone: { 
    label: "Présence dans une zone", 
    description: "Seulement si quelqu'un est dans une zone",
    icon: "MapPin"
  },
  template: { 
    label: "Condition avancée", 
    description: "Expression personnalisée (pour utilisateurs avancés)",
    icon: "Code"
  },
};

export const AUTOMATION_MODES: Array<{ value: SmartAutomation["mode"]; label: string; description: string }> = [
  { value: "single", label: "Simple", description: "Attend la fin avant de pouvoir redémarrer" },
  { value: "restart", label: "Redémarrer", description: "Redémarre si déclenché pendant l'exécution" },
  { value: "queued", label: "File d'attente", description: "Met en file les déclenchements" },
  { value: "parallel", label: "Parallèle", description: "Exécute plusieurs instances simultanément" },
];
