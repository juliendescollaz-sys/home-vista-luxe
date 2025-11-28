import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NeoliaScene, SceneEntityState } from "@/types/scenes";
import { useHAStore } from "./useHAStore";
import { supabase } from "@/integrations/supabase/client";

interface SceneStore {
  // Local scenes (persisted in localStorage)
  localScenes: NeoliaScene[];
  // Shared scenes (from Supabase)
  sharedScenes: NeoliaScene[];
  
  // Loading state
  isLoadingShared: boolean;
  
  // Actions
  addScene: (scene: Omit<NeoliaScene, "id" | "createdAt" | "updatedAt">) => Promise<NeoliaScene>;
  updateScene: (id: string, updates: Partial<NeoliaScene>) => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
  toggleSceneFavorite: (id: string) => Promise<void>;
  reorderScenes: (orderedIds: string[]) => void;
  
  // Sync shared scenes from DB
  loadSharedScenes: () => Promise<void>;
  
  // Execute scene
  executeScene: (sceneId: string) => Promise<void>;
}

// Helper to convert DB row to NeoliaScene
function dbRowToScene(row: any): NeoliaScene {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    description: row.description,
    scope: "shared",
    entities: row.entities || [],
    order: row.sort_order,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const useSceneStore = create<SceneStore>()(
  persist(
    (set, get) => ({
      localScenes: [],
      sharedScenes: [],
      isLoadingShared: false,

      loadSharedScenes: async () => {
        set({ isLoadingShared: true });
        try {
          const { data, error } = await supabase
            .from("scenes")
            .select("*")
            .order("sort_order", { ascending: true });
          
          if (error) {
            console.error("[SceneStore] Error loading shared scenes:", error);
            return;
          }
          
          const sharedScenes = (data || []).map(dbRowToScene);
          set({ sharedScenes, isLoadingShared: false });
          console.log("[SceneStore] Loaded", sharedScenes.length, "shared scenes");
        } catch (err) {
          console.error("[SceneStore] Error loading shared scenes:", err);
          set({ isLoadingShared: false });
        }
      },

      addScene: async (sceneData) => {
        const isShared = sceneData.scope === "shared";
        
        if (isShared) {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error("Vous devez être connecté pour créer une scène partagée");
          }
          
          const { data, error } = await supabase
            .from("scenes")
            .insert({
              user_id: user.id,
              name: sceneData.name,
              icon: sceneData.icon,
              color: sceneData.color,
              description: sceneData.description,
              entities: sceneData.entities as any,
              sort_order: sceneData.order,
              is_favorite: sceneData.isFavorite || false,
            })
            .select()
            .single();
          
          if (error) {
            console.error("[SceneStore] Error creating shared scene:", error);
            throw new Error("Erreur lors de la création de la scène partagée");
          }
          
          const newScene = dbRowToScene(data);
          set((state) => ({
            sharedScenes: [...state.sharedScenes, newScene],
          }));
          
          return newScene;
        } else {
          // Local scene
          const newScene: NeoliaScene = {
            ...sceneData,
            id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        const state = get();
        const isShared = state.sharedScenes.some((s) => s.id === id);
        
        if (isShared) {
          const { error } = await supabase
            .from("scenes")
            .update({
              name: updates.name,
              icon: updates.icon,
              color: updates.color,
              description: updates.description,
              entities: updates.entities as any,
              sort_order: updates.order,
              is_favorite: updates.isFavorite,
            })
            .eq("id", id);
          
          if (error) {
            console.error("[SceneStore] Error updating shared scene:", error);
            throw new Error("Erreur lors de la mise à jour de la scène");
          }
          
          set((state) => ({
            sharedScenes: state.sharedScenes.map((scene) =>
              scene.id === id
                ? { ...scene, ...updates, updatedAt: new Date().toISOString() }
                : scene
            ),
          }));
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
        const state = get();
        const isShared = state.sharedScenes.some((s) => s.id === id);
        
        if (isShared) {
          const { error } = await supabase
            .from("scenes")
            .delete()
            .eq("id", id);
          
          if (error) {
            console.error("[SceneStore] Error deleting shared scene:", error);
            throw new Error("Erreur lors de la suppression de la scène");
          }
          
          set((state) => ({
            sharedScenes: state.sharedScenes.filter((scene) => scene.id !== id),
          }));
        } else {
          set((state) => ({
            localScenes: state.localScenes.filter((scene) => scene.id !== id),
          }));
        }
      },

      toggleSceneFavorite: async (id) => {
        const state = get();
        const scene = [...state.localScenes, ...state.sharedScenes].find((s) => s.id === id);
        if (!scene) return;
        
        const newFavorite = !scene.isFavorite;
        const isShared = state.sharedScenes.some((s) => s.id === id);
        
        if (isShared) {
          const { error } = await supabase
            .from("scenes")
            .update({ is_favorite: newFavorite })
            .eq("id", id);
          
          if (error) {
            console.error("[SceneStore] Error toggling favorite:", error);
            return;
          }
          
          set((state) => ({
            sharedScenes: state.sharedScenes.map((s) =>
              s.id === id ? { ...s, isFavorite: newFavorite, updatedAt: new Date().toISOString() } : s
            ),
          }));
        } else {
          set((state) => ({
            localScenes: state.localScenes.map((s) =>
              s.id === id ? { ...s, isFavorite: newFavorite, updatedAt: new Date().toISOString() } : s
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
        const scene = [...state.localScenes, ...state.sharedScenes].find((s) => s.id === sceneId);
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
      version: 2,
      partialize: (state) => ({
        // Only persist local scenes
        localScenes: state.localScenes,
      }),
    }
  )
);
