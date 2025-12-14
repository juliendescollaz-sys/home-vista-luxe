import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NeoliaScene, SceneEntityState } from "@/types/scenes";
import { useHAStore } from "./useHAStore";

interface SceneStore {
  // Local scenes (persisted in localStorage, not sent to HA)
  localScenes: NeoliaScene[];
  // Shared scenes (from Home Assistant scene.* entities)
  sharedScenes: NeoliaScene[];
  // Local favorites for HA scenes (HA doesn't store favorites)
  sharedSceneFavorites: string[];
  
  // Loading state
  isLoadingShared: boolean;
  
  // Actions
  addScene: (scene: Omit<NeoliaScene, "id" | "createdAt" | "updatedAt">) => Promise<NeoliaScene>;
  updateScene: (id: string, updates: Partial<NeoliaScene>) => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
  toggleSceneFavorite: (id: string) => void;
  reorderScenes: (orderedIds: string[]) => void;
  
  // Sync shared scenes from HA
  loadSharedScenes: () => void;
  
  // Execute scene
  executeScene: (sceneId: string) => Promise<void>;
}

// Convert HA scene entity to NeoliaScene
function haSceneToNeoliaScene(entity: any, favorites: string[]): NeoliaScene {
  const entityId = entity.entity_id;
  const friendlyName = entity.attributes?.friendly_name || entityId.replace("scene.", "");
  // Handle double mdi: prefix that can occur from HA API
  const rawIcon = entity.attributes?.icon || "";
  const cleanIcon = rawIcon.replace(/^(mdi:)+/, "") || "Sparkles";
  
  return {
    id: entityId,
    name: friendlyName,
    icon: mapMdiToLucide(cleanIcon),
    description: entity.attributes?.description,
    scope: "shared",
    entities: [], // HA scenes don't expose their entity list via states API
    order: undefined,
    isFavorite: favorites.includes(entityId),
    createdAt: entity.last_changed || new Date().toISOString(),
    updatedAt: entity.last_updated || new Date().toISOString(),
  };
}

// Map MDI icons to Lucide icons (basic mapping)
// Complete bidirectional mapping for all icons in SCENE_ICON_CATEGORIES
const ICON_MAPPING: Record<string, string> = {
  // Ambiances
  "sun": "Sun",
  "moon": "Moon",
  "weather-night": "Moon",
  "sunset": "Sunset",
  "weather-sunset": "Sunset",
  "sunrise": "Sunrise",
  "weather-sunrise": "Sunrise",
  "stars": "Stars",
  "star-shooting": "Stars",
  "sparkles": "Sparkles",
  "star-four-points": "Sparkles",
  "auto-fix": "Sparkles",
  "heart": "Heart",
  "flame": "Flame",
  "fire": "Flame",
  "zap": "Zap",
  "flash": "Zap",
  "lightning-bolt": "Zap",
  "cloud-moon": "CloudMoon",
  "weather-night-partly-cloudy": "CloudMoon",
  "lamp": "Lamp",
  "glasses": "Glasses",
  "eye": "Eye",
  "palette": "Palette",
  "gem": "Gem",
  "diamond-stone": "Gem",
  "crown": "Crown",
  
  // Pièces (rooms)
  "home": "Home",
  "sofa": "Sofa",
  "bed": "Bed",
  "bath": "Bath",
  "bathtub": "Bath",
  "shower": "Bath",
  "utensils-crossed": "UtensilsCrossed",
  "silverware": "UtensilsCrossed",
  "food-fork-drink": "UtensilsCrossed",
  "car": "Car",
  "trees": "Trees",
  "forest": "Trees",
  "pine-tree": "Trees",
  "building": "Building",
  "office-building": "Building",
  "door-open": "DoorOpen",
  "door": "DoorOpen",
  "armchair": "Armchair",
  "seat": "Armchair",
  "warehouse": "Warehouse",
  "store": "Store",
  "storefront": "Store",
  "parking-square": "ParkingSquare",
  "parking": "ParkingSquare",
  "fence": "Fence",
  "layout-grid": "LayoutGrid",
  "view-grid": "LayoutGrid",
  "flame-kindling": "FlameKindling",
  "fireplace": "FlameKindling",
  
  // Activités
  "tv": "Tv",
  "television": "Tv",
  "clapperboard": "Clapperboard",
  "movie": "Clapperboard",
  "filmstrip": "Clapperboard",
  "music": "Music",
  "music-note": "Music",
  "gamepad-2": "Gamepad2",
  "gamepad": "Gamepad2",
  "gamepad-variant": "Gamepad2",
  "controller": "Gamepad2",
  "book-open": "BookOpen",
  "book-open-variant": "BookOpen",
  "book": "BookOpen",
  "briefcase": "Briefcase",
  "dumbbell": "Dumbbell",
  "weight-lifter": "Dumbbell",
  "coffee": "Coffee",
  "wine": "Wine",
  "glass-wine": "Wine",
  "party-popper": "PartyPopper",
  "confetti": "PartyPopper",
  "headphones": "Headphones",
  "headset": "Headphones",
  "camera": "Camera",
  "mic": "Mic",
  "microphone": "Mic",
  "bike": "Bike",
  "bicycle": "Bike",
  "utensils": "Utensils",
  "silverware-fork-knife": "Utensils",
  "shopping-bag": "ShoppingBag",
  "shopping": "ShoppingBag",
  "bag-personal": "ShoppingBag",
  
  // Climat
  "thermometer": "Thermometer",
  "fan": "Fan",
  "snowflake": "Snowflake",
  "cloud-rain": "CloudRain",
  "weather-rainy": "CloudRain",
  "weather-pouring": "CloudRain",
  "wind": "Wind",
  "weather-windy": "Wind",
  "droplets": "Droplets",
  "water": "Droplets",
  "cloud-sun": "CloudSun",
  "weather-partly-cloudy": "CloudSun",
  "cloudy": "Cloudy",
  "cloud": "Cloudy",
  "weather-cloudy": "Cloudy",
  "rainbow": "Rainbow",
  "umbrella": "Umbrella",
  "thermometer-sun": "ThermometerSun",
  "thermometer-high": "ThermometerSun",
  "thermometer-snowflake": "ThermometerSnowflake",
  "thermometer-low": "ThermometerSnowflake",
  "waves": "Waves",
  "cloud-fog": "CloudFog",
  "weather-fog": "CloudFog",
  "heater": "Heater",
  "radiator": "Heater",
  "heating-coil": "Heater",
  
  // Divers (misc)
  "star": "Star",
  "bell": "Bell",
  "bell-ring": "Bell",
  "clock": "Clock",
  "clock-outline": "Clock",
  "calendar": "Calendar",
  "calendar-month": "Calendar",
  "map-pin": "MapPin",
  "map-marker": "MapPin",
  "pin": "MapPin",
  "plane": "Plane",
  "airplane": "Plane",
  "log-out": "LogOut",
  "logout": "LogOut",
  "exit-run": "LogOut",
  "log-in": "LogIn",
  "login": "LogIn",
  "shield": "Shield",
  "shield-check": "Shield",
  "security": "Shield",
  "lightbulb": "Lightbulb",
  "light-bulb": "Lightbulb",
  "settings": "Settings",
  "cog": "Settings",
  "power": "Power",
  "power-plug": "Power",
  "timer": "Timer",
  "timer-sand": "Timer",
  "wifi": "Wifi",
  "lock": "Lock",
  "lock-closed": "Lock",
  "unlock": "Unlock",
  "lock-open": "Unlock",
  "lock-open-variant": "Unlock",
  
  // Legacy mappings
  "weather-sunny": "Sun",
  "door-closed": "DoorClosed",
  "baby-face": "Baby",
  "leaf": "Leaf",
  "tree-pine": "TreePine",
  "school": "GraduationCap",
};

// Reverse mapping: Lucide -> MDI (primary MDI name)
const LUCIDE_TO_MDI: Record<string, string> = {
  // Ambiances
  "Sun": "weather-sunny",
  "Moon": "weather-night",
  "Sunset": "weather-sunset",
  "Sunrise": "weather-sunrise",
  "Stars": "star-shooting",
  "Sparkles": "star-four-points",
  "Heart": "heart",
  "Flame": "fire",
  "Zap": "flash",
  "CloudMoon": "weather-night-partly-cloudy",
  "Lamp": "lamp",
  "Glasses": "glasses",
  "Eye": "eye",
  "Palette": "palette",
  "Gem": "diamond-stone",
  "Crown": "crown",
  
  // Pièces
  "Home": "home",
  "Sofa": "sofa",
  "Bed": "bed",
  "Bath": "bathtub",
  "UtensilsCrossed": "silverware",
  "Car": "car",
  "Trees": "pine-tree",
  "Building": "office-building",
  "DoorOpen": "door-open",
  "DoorClosed": "door-closed",
  "Armchair": "seat",
  "Warehouse": "warehouse",
  "Store": "storefront",
  "ParkingSquare": "parking",
  "Fence": "fence",
  "LayoutGrid": "view-grid",
  "FlameKindling": "fireplace",
  
  // Activités
  "Tv": "television",
  "Clapperboard": "movie",
  "Music": "music",
  "Gamepad2": "gamepad-variant",
  "BookOpen": "book-open-variant",
  "Briefcase": "briefcase",
  "Dumbbell": "dumbbell",
  "Coffee": "coffee",
  "Wine": "glass-wine",
  "PartyPopper": "party-popper",
  "Headphones": "headphones",
  "Camera": "camera",
  "Mic": "microphone",
  "Bike": "bike",
  "Utensils": "silverware-fork-knife",
  "ShoppingBag": "shopping",
  
  // Climat
  "Thermometer": "thermometer",
  "Fan": "fan",
  "Snowflake": "snowflake",
  "CloudRain": "weather-rainy",
  "Wind": "weather-windy",
  "Droplets": "water",
  "CloudSun": "weather-partly-cloudy",
  "Cloudy": "weather-cloudy",
  "Rainbow": "rainbow",
  "Umbrella": "umbrella",
  "ThermometerSun": "thermometer-high",
  "ThermometerSnowflake": "thermometer-low",
  "Waves": "waves",
  "CloudFog": "weather-fog",
  "Heater": "radiator",
  
  // Divers
  "Star": "star",
  "Bell": "bell",
  "Clock": "clock-outline",
  "Calendar": "calendar",
  "MapPin": "map-marker",
  "Plane": "airplane",
  "LogOut": "logout",
  "LogIn": "login",
  "Shield": "shield",
  "Lightbulb": "lightbulb",
  "Settings": "cog",
  "Power": "power",
  "Timer": "timer-sand",
  "Wifi": "wifi",
  "Lock": "lock",
  "Unlock": "lock-open-variant",
  
  // Legacy
  "Book": "book-open-variant",
  "Baby": "baby-face",
  "Leaf": "leaf",
  "TreePine": "pine-tree",
  "GraduationCap": "school",
};

function mapMdiToLucide(mdiIcon: string): string {
  // Normalize: remove mdi: prefix, lowercase, handle variations
  const normalized = mdiIcon.toLowerCase().replace(/^mdi:/, "");
  return ICON_MAPPING[normalized] || "Sparkles";
}

function lucideToMdi(lucideIcon: string): string {
  const mdiName = LUCIDE_TO_MDI[lucideIcon];
  if (mdiName) {
    return `mdi:${mdiName}`;
  }
  // Fallback: convert PascalCase to kebab-case
  return `mdi:${lucideIcon.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
}

export const useSceneStore = create<SceneStore>()(
  persist(
    (set, get) => ({
      localScenes: [],
      sharedScenes: [],
      sharedSceneFavorites: [],
      isLoadingShared: false,

      loadSharedScenes: () => {
        const entities = useHAStore.getState().entities;
        const favorites = get().sharedSceneFavorites;
        
        // Filter scene.* entities
        const haScenes = entities
          .filter((e) => e.entity_id.startsWith("scene."))
          .map((e) => haSceneToNeoliaScene(e, favorites));
        
        set({ sharedScenes: haScenes });
        console.log("[SceneStore] Loaded", haScenes.length, "HA scenes");
      },

      addScene: async (sceneData) => {
        const isShared = sceneData.scope === "shared";
        
        if (isShared) {
          const client = useHAStore.getState().client;
          if (!client) {
            throw new Error("Non connecté à Home Assistant");
          }
          
          // Generate a unique scene ID from the name
          const sceneId = sceneData.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "");
          
          // Create scene via HA WebSocket
          await client.createScene({
            id: sceneId,
            name: sceneData.name,
            description: sceneData.description,
            entities: buildHASceneEntities(sceneData.entities),
            icon: lucideToMdi(sceneData.icon),
          });
          
          // Reload shared scenes from HA entities
          // The new scene should appear after a short delay
          setTimeout(() => get().loadSharedScenes(), 500);
          
          const newScene: NeoliaScene = {
            ...sceneData,
            id: `scene.${sceneId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          return newScene;
        } else {
          // Local scene - only stored in app
          const newScene: NeoliaScene = {
            ...sceneData,
            id: `local_scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set((state) => ({
            localScenes: [...state.localScenes, newScene],
          }));
          
          return newScene;
        }
      },

      updateScene: async (id, updates) => {
        const isShared = id.startsWith("scene.");
        
        if (isShared) {
          const client = useHAStore.getState().client;
          if (!client) {
            throw new Error("Non connecté à Home Assistant");
          }
          
          // Extract the scene ID without "scene." prefix
          const sceneId = id.replace("scene.", "");
          
          // Update scene via HA WebSocket
          await client.updateHAScene({
            id: sceneId,
            name: updates.name,
            description: updates.description,
            entities: updates.entities ? buildHASceneEntities(updates.entities) : undefined,
            icon: updates.icon ? lucideToMdi(updates.icon) : undefined,
          });
          
          // Reload shared scenes
          setTimeout(() => get().loadSharedScenes(), 500);
          
        } else {
          set((state) => ({
            localScenes: state.localScenes.map((scene) =>
              scene.id === id
                ? { ...scene, ...updates, updatedAt: new Date().toISOString() }
                : scene
            ),
          }));
        }
      },

      deleteScene: async (id) => {
        const isShared = id.startsWith("scene.");
        
        if (isShared) {
          const client = useHAStore.getState().client;
          if (!client) {
            throw new Error("Non connecté à Home Assistant");
          }
          
          // Extract the scene ID without "scene." prefix
          const sceneId = id.replace("scene.", "");
          
          // Delete scene via HA WebSocket
          const result = await client.deleteHAScene(sceneId);
          
          // Handle legacy scenes that cannot be deleted via API
          if (result.cannotDelete) {
            throw new Error("Cette scène a été créée via Home Assistant (YAML ou interface) et ne peut pas être supprimée depuis l'application. Supprimez-la directement dans Home Assistant.");
          }
          
          // Remove from local state immediately
          set((state) => ({
            sharedScenes: state.sharedScenes.filter((s) => s.id !== id),
            sharedSceneFavorites: state.sharedSceneFavorites.filter((f) => f !== id),
          }));
        } else {
          set((state) => ({
            localScenes: state.localScenes.filter((scene) => scene.id !== id),
          }));
        }
      },

      toggleSceneFavorite: (id) => {
        const isShared = id.startsWith("scene.");
        
        if (isShared) {
          // Store favorites locally for HA scenes
          set((state) => {
            const isFav = state.sharedSceneFavorites.includes(id);
            const newFavorites = isFav
              ? state.sharedSceneFavorites.filter((f) => f !== id)
              : [...state.sharedSceneFavorites, id];
            
            // Update the sharedScenes to reflect the change
            const updatedScenes = state.sharedScenes.map((s) =>
              s.id === id ? { ...s, isFavorite: !isFav } : s
            );
            
            return {
              sharedSceneFavorites: newFavorites,
              sharedScenes: updatedScenes,
            };
          });
        } else {
          set((state) => ({
            localScenes: state.localScenes.map((s) =>
              s.id === id
                ? { ...s, isFavorite: !s.isFavorite, updatedAt: new Date().toISOString() }
                : s
            ),
          }));
        }
      },

      reorderScenes: (orderedIds) => {
        set((state) => {
          const allScenes = [...state.localScenes, ...state.sharedScenes];
          const reorderedLocal: NeoliaScene[] = [];
          const reorderedShared: NeoliaScene[] = [];
          
          orderedIds.forEach((id, index) => {
            const scene = allScenes.find((s) => s.id === id);
            if (scene) {
              const updated = { ...scene, order: index };
              if (scene.scope === "shared") {
                reorderedShared.push(updated);
              } else {
                reorderedLocal.push(updated);
              }
            }
          });
          
          return {
            localScenes: reorderedLocal,
            sharedScenes: reorderedShared,
          };
        });
      },

      executeScene: async (sceneId) => {
        const state = get();
        const isShared = sceneId.startsWith("scene.");
        
        const client = useHAStore.getState().client;
        if (!client) {
          throw new Error("Non connecté à Home Assistant");
        }
        
        if (isShared) {
          // Activate HA scene directly
          await client.callService("scene", "turn_on", {}, { entity_id: sceneId });
        } else {
          // Execute local scene by controlling each entity
          const scene = state.localScenes.find((s) => s.id === sceneId);
          if (!scene) {
            throw new Error("Scène introuvable");
          }

          const errors: string[] = [];

          for (const entityState of scene.entities) {
            try {
              const { entity_id, domain, targetState } = entityState;
              
              switch (domain) {
                case "light":
                  if (targetState.state === "off") {
                    await client.callService("light", "turn_off", { entity_id });
                  } else {
                    const serviceData: Record<string, any> = { entity_id };
                    if (targetState.brightness !== undefined) {
                      serviceData.brightness = targetState.brightness;
                    }
                    if (targetState.color_temp !== undefined) {
                      serviceData.color_temp = targetState.color_temp;
                    }
                    if (targetState.rgb_color !== undefined) {
                      serviceData.rgb_color = targetState.rgb_color;
                    }
                    await client.callService("light", "turn_on", serviceData);
                  }
                  break;

                case "switch":
                case "fan":
                case "valve":
                  const switchService = targetState.state === "on" ? "turn_on" : "turn_off";
                  await client.callService(domain, switchService, { entity_id });
                  break;

                case "cover":
                  if (targetState.position !== undefined) {
                    await client.callService("cover", "set_cover_position", {
                      entity_id,
                      position: targetState.position,
                    });
                  } else if (targetState.state === "open") {
                    await client.callService("cover", "open_cover", { entity_id });
                  } else if (targetState.state === "closed") {
                    await client.callService("cover", "close_cover", { entity_id });
                  }
                  break;

                case "climate":
                  if (targetState.hvac_mode) {
                    await client.callService("climate", "set_hvac_mode", {
                      entity_id,
                      hvac_mode: targetState.hvac_mode,
                    });
                  }
                  if (targetState.temperature !== undefined) {
                    await client.callService("climate", "set_temperature", {
                      entity_id,
                      temperature: targetState.temperature,
                    });
                  }
                  break;

                case "media_player":
                  if (targetState.state === "off" || targetState.state === "idle") {
                    await client.callService("media_player", "turn_off", { entity_id });
                  } else if (targetState.state === "playing") {
                    await client.callService("media_player", "media_play", { entity_id });
                  } else if (targetState.state === "paused") {
                    await client.callService("media_player", "media_pause", { entity_id });
                  }
                  if (targetState.volume_level !== undefined) {
                    await client.callService("media_player", "volume_set", {
                      entity_id,
                      volume_level: targetState.volume_level,
                    });
                  }
                  break;

                default:
                  if (targetState.state === "on") {
                    await client.callService("homeassistant", "turn_on", { entity_id });
                  } else if (targetState.state === "off") {
                    await client.callService("homeassistant", "turn_off", { entity_id });
                  }
              }
            } catch (error) {
              console.error(`[Scene] Error controlling ${entityState.entity_id}:`, error);
              errors.push(entityState.entity_id);
            }
          }

          if (errors.length > 0) {
            throw new Error(`Erreur sur ${errors.length} appareil(s)`);
          }
        }
      },
    }),
    {
      name: "neolia-scenes",
      version: 3,
      partialize: (state) => ({
        // Persist local scenes and shared scene favorites
        localScenes: state.localScenes,
        sharedSceneFavorites: state.sharedSceneFavorites,
      }),
    }
  )
);

// Helper to build HA scene entities config from Neolia format
function buildHASceneEntities(entities: SceneEntityState[]): Record<string, any> {
  const haEntities: Record<string, any> = {};
  
  for (const entity of entities) {
    const { entity_id, targetState } = entity;
    const config: Record<string, any> = {};
    
    if (targetState.state) {
      config.state = targetState.state;
    }
    if (targetState.brightness !== undefined) {
      config.brightness = targetState.brightness;
    }
    if (targetState.color_temp !== undefined) {
      config.color_temp = targetState.color_temp;
    }
    if (targetState.rgb_color !== undefined) {
      config.rgb_color = targetState.rgb_color;
    }
    if (targetState.position !== undefined) {
      config.position = targetState.position;
    }
    if (targetState.temperature !== undefined) {
      config.temperature = targetState.temperature;
    }
    if (targetState.hvac_mode !== undefined) {
      config.hvac_mode = targetState.hvac_mode;
    }
    if (targetState.volume_level !== undefined) {
      config.volume_level = targetState.volume_level;
    }
    
    haEntities[entity_id] = config;
  }
  
  return haEntities;
}
