import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NeoliaScene, SceneWizardDraft, SceneEntityState } from "@/types/scenes";
import { useHAStore } from "./useHAStore";

interface SceneStore {
  scenes: NeoliaScene[];
  
  // Actions
  addScene: (scene: Omit<NeoliaScene, "id" | "createdAt" | "updatedAt">) => NeoliaScene;
  updateScene: (id: string, updates: Partial<NeoliaScene>) => void;
  deleteScene: (id: string) => void;
  toggleSceneFavorite: (id: string) => void;
  reorderScenes: (orderedIds: string[]) => void;
  
  // Execute scene
  executeScene: (sceneId: string) => Promise<void>;
}

export const useSceneStore = create<SceneStore>()(
  persist(
    (set, get) => ({
      scenes: [],

      addScene: (sceneData) => {
        const newScene: NeoliaScene = {
          ...sceneData,
          id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set((state) => ({
          scenes: [...state.scenes, newScene],
        }));
        
        return newScene;
      },

      updateScene: (id, updates) => {
        set((state) => ({
          scenes: state.scenes.map((scene) =>
            scene.id === id
              ? { ...scene, ...updates, updatedAt: new Date().toISOString() }
              : scene
          ),
        }));
      },

      deleteScene: (id) => {
        set((state) => ({
          scenes: state.scenes.filter((scene) => scene.id !== id),
        }));
      },

      toggleSceneFavorite: (id) => {
        set((state) => ({
          scenes: state.scenes.map((scene) =>
            scene.id === id
              ? { ...scene, isFavorite: !scene.isFavorite }
              : scene
          ),
        }));
      },

      reorderScenes: (orderedIds) => {
        set((state) => ({
          scenes: orderedIds
            .map((id, index) => {
              const scene = state.scenes.find((s) => s.id === id);
              return scene ? { ...scene, order: index } : null;
            })
            .filter(Boolean) as NeoliaScene[],
        }));
      },

      executeScene: async (sceneId) => {
        const scene = get().scenes.find((s) => s.id === sceneId);
        if (!scene) {
          throw new Error("Scène introuvable");
        }

        const client = useHAStore.getState().client;
        if (!client) {
          throw new Error("Non connecté à Home Assistant");
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
                // Generic on/off for other domains
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
      },
    }),
    {
      name: "neolia-scenes",
      version: 1,
    }
  )
);
