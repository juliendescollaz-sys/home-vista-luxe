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
    icons: ["Sun", "Moon", "Sunset", "Sunrise", "Stars", "Sparkles", "Heart", "Flame", "Zap", "CloudMoon"]
  },
  rooms: {
    label: "Pièces",
    icons: ["Home", "Sofa", "Bed", "Bath", "UtensilsCrossed", "Car", "Trees", "Building", "DoorOpen", "Armchair"]
  },
  activities: {
    label: "Activités",
    icons: ["Tv", "Clapperboard", "Music", "Gamepad2", "BookOpen", "Briefcase", "Dumbbell", "Coffee", "Wine", "PartyPopper"]
  },
  climate: {
    label: "Climat",
    icons: ["Thermometer", "Fan", "Snowflake", "CloudRain", "Wind", "Droplets", "CloudSun", "Cloudy", "Rainbow", "Umbrella"]
  },
  misc: {
    label: "Divers",
    icons: ["Star", "Bell", "Clock", "Calendar", "MapPin", "Plane", "LogOut", "LogIn", "Shield", "Lightbulb"]
  }
} as const;

export const ALL_SCENE_ICONS = Object.values(SCENE_ICON_CATEGORIES).flatMap(cat => cat.icons);
