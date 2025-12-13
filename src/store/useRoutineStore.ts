import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NeoliaRoutine, RoutineAction, RoutineSchedule } from "@/types/routines";
import { useHAStore } from "./useHAStore";

interface RoutineStore {
  // Local routines (persisted in localStorage)
  localRoutines: NeoliaRoutine[];
  // Shared routines (from Home Assistant automations)
  sharedRoutines: NeoliaRoutine[];
  // Local favorites for HA routines
  sharedRoutineFavorites: string[];
  
  // Loading state
  isLoadingShared: boolean;
  
  // Actions
  addRoutine: (routine: Omit<NeoliaRoutine, "id" | "createdAt" | "updatedAt">) => Promise<NeoliaRoutine>;
  updateRoutine: (id: string, updates: Partial<NeoliaRoutine>) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  toggleRoutineFavorite: (id: string) => void;
  toggleRoutineEnabled: (id: string) => void;
  reorderRoutines: (orderedIds: string[]) => void;
  
  // Sync shared routines from HA
  loadSharedRoutines: () => void;
}

// Convert HA automation entity to NeoliaRoutine
function haAutomationToNeoliaRoutine(entity: any, favorites: string[]): NeoliaRoutine {
  const entityId = entity.entity_id;
  const friendlyName = entity.attributes?.friendly_name || entityId.replace("automation.", "");
  const rawIcon = entity.attributes?.icon || "";
  const cleanIcon = rawIcon.replace(/^(mdi:)+/, "") || "Clock";
  
  return {
    id: entityId,
    name: friendlyName,
    icon: mapMdiToLucide(cleanIcon),
    description: entity.attributes?.description,
    scope: "shared",
    actions: [], // HA automations don't expose their actions via states API
    schedule: { frequency: "daily", time: "00:00", daysOfWeek: [1, 2, 3, 4, 5, 6, 0] },
    enabled: entity.state === "on",
    order: undefined,
    isFavorite: favorites.includes(entityId),
    createdAt: entity.last_changed || new Date().toISOString(),
    updatedAt: entity.last_updated || new Date().toISOString(),
  };
}

// Map MDI icons to Lucide icons
function mapMdiToLucide(mdiIcon: string): string {
  const mapping: Record<string, string> = {
    "clock": "Clock",
    "clock-outline": "Clock",
    "timer": "Timer",
    "timer-outline": "Timer",
    "calendar": "Calendar",
    "calendar-clock": "CalendarClock",
    "alarm": "Alarm",
    "bell": "Bell",
    "bell-ring": "BellRing",
    "home": "Home",
    "home-automation": "Home",
    "lightbulb": "Lightbulb",
    "power": "Power",
    "play": "Play",
    "flash": "Zap",
    "weather-sunny": "Sun",
    "weather-night": "Moon",
    "weather-sunset": "Sunset",
    "sunrise": "Sunrise",
    "thermometer": "Thermometer",
    "fan": "Fan",
    "snowflake": "Snowflake",
  };
  return mapping[mdiIcon.toLowerCase()] || "Clock";
}

// Map Lucide icons to MDI format for HA API
function lucideToMdi(lucideIcon: string): string {
  const mapping: Record<string, string> = {
    "Clock": "clock",
    "Timer": "timer",
    "Calendar": "calendar",
    "CalendarClock": "calendar-clock",
    "Alarm": "alarm",
    "Bell": "bell",
    "BellRing": "bell-ring",
    "Home": "home",
    "Lightbulb": "lightbulb",
    "Power": "power",
    "Play": "play",
    "Zap": "flash",
    "Sun": "weather-sunny",
    "Moon": "weather-night",
    "Sunset": "weather-sunset",
    "Sunrise": "sunrise",
    "Thermometer": "thermometer",
    "Fan": "fan",
    "Snowflake": "snowflake",
  };
  
  const mdiName = mapping[lucideIcon] || lucideIcon.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  return `mdi:${mdiName}`;
}

// Build HA automation trigger from schedule
function buildHATrigger(schedule: RoutineSchedule): any[] {
  const triggers: any[] = [];
  
  switch (schedule.frequency) {
    case "once":
      triggers.push({
        platform: "time",
        at: `${schedule.date}T${schedule.time}:00`,
      });
      break;
    case "daily":
      if (schedule.daysOfWeek && schedule.daysOfWeek.length < 7) {
        // Specific days
        const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        triggers.push({
          platform: "time",
          at: schedule.time,
        });
        // Add condition for specific days
      } else {
        // Every day
        triggers.push({
          platform: "time",
          at: schedule.time,
        });
      }
      break;
    case "weekly":
      triggers.push({
        platform: "time",
        at: schedule.time,
      });
      break;
    case "monthly":
    case "yearly":
      triggers.push({
        platform: "time",
        at: schedule.time,
      });
      break;
  }
  
  return triggers;
}

// Build HA automation actions from routine actions
function buildHAActions(actions: RoutineAction[]): any[] {
  const haActions: any[] = [];
  
  for (const action of actions) {
    if (action.type === "scene") {
      haActions.push({
        service: "scene.turn_on",
        target: { entity_id: action.id },
      });
    } else if (action.type === "group") {
      haActions.push({
        service: action.groupState === "on" ? "homeassistant.turn_on" : "homeassistant.turn_off",
        target: { entity_id: action.id },
      });
    } else if (action.type === "device") {
      const domain = action.id.split(".")[0];
      const targetState = action.targetState;
      
      if (targetState?.state === "off") {
        haActions.push({
          service: `${domain}.turn_off`,
          target: { entity_id: action.id },
        });
      } else {
        const serviceData: Record<string, any> = {};
        if (targetState?.brightness !== undefined) serviceData.brightness = targetState.brightness;
        if (targetState?.color_temp !== undefined) serviceData.color_temp = targetState.color_temp;
        if (targetState?.rgb_color !== undefined) serviceData.rgb_color = targetState.rgb_color;
        if (targetState?.position !== undefined) serviceData.position = targetState.position;
        if (targetState?.temperature !== undefined) serviceData.temperature = targetState.temperature;
        if (targetState?.hvac_mode !== undefined) serviceData.hvac_mode = targetState.hvac_mode;
        if (targetState?.volume_level !== undefined) serviceData.volume_level = targetState.volume_level;
        
        haActions.push({
          service: domain === "cover" ? "cover.set_cover_position" : `${domain}.turn_on`,
          target: { entity_id: action.id },
          data: Object.keys(serviceData).length > 0 ? serviceData : undefined,
        });
      }
    }
  }
  
  return haActions;
}

export const useRoutineStore = create<RoutineStore>()(
  persist(
    (set, get) => ({
      localRoutines: [],
      sharedRoutines: [],
      sharedRoutineFavorites: [],
      isLoadingShared: false,

      loadSharedRoutines: () => {
        const entities = useHAStore.getState().entities;
        const entityRegistry = useHAStore.getState().entityRegistry;
        const favorites = get().sharedRoutineFavorites;
        
        // Filter automation.* entities, excluding hidden ones
        const haAutomations = entities
          .filter((e) => {
            if (!e.entity_id.startsWith("automation.")) return false;
            
            // Check entity registry for hidden_by flag
            const regEntry = entityRegistry.find((r) => r.entity_id === e.entity_id) as any;
            if (regEntry?.hidden_by) return false;
            
            // Check entity attributes for hidden flag
            if (e.attributes?.hidden === true) return false;
            
            return true;
          })
          .map((e) => haAutomationToNeoliaRoutine(e, favorites));
        
        set({ sharedRoutines: haAutomations });
        console.log("[RoutineStore] Loaded", haAutomations.length, "visible HA automations");
      },

      addRoutine: async (routineData) => {
        const isShared = routineData.scope === "shared";
        
        if (isShared) {
          const client = useHAStore.getState().client;
          if (!client) {
            throw new Error("Non connecté à Home Assistant");
          }
          
          // Generate a unique automation ID from the name
          const automationId = routineData.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "");
          
          // Create automation via HA API
          await client.createAutomation({
            id: automationId,
            alias: routineData.name,
            description: routineData.description,
            trigger: buildHATrigger(routineData.schedule),
            action: buildHAActions(routineData.actions),
            icon: lucideToMdi(routineData.icon),
          });
          
          // Reload shared routines from HA entities
          setTimeout(() => get().loadSharedRoutines(), 500);
          
          const newRoutine: NeoliaRoutine = {
            ...routineData,
            id: `automation.${automationId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          return newRoutine;
        } else {
          // Local routine - only stored in app
          const newRoutine: NeoliaRoutine = {
            ...routineData,
            id: `local_routine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set((state) => ({
            localRoutines: [...state.localRoutines, newRoutine],
          }));
          
          return newRoutine;
        }
      },

      updateRoutine: async (id, updates) => {
        const isShared = id.startsWith("automation.");
        
        if (isShared) {
          const client = useHAStore.getState().client;
          if (!client) {
            throw new Error("Non connecté à Home Assistant");
          }
          
          const automationId = id.replace("automation.", "");
          
          await client.updateAutomation({
            id: automationId,
            alias: updates.name,
            description: updates.description,
            trigger: updates.schedule ? buildHATrigger(updates.schedule) : undefined,
            action: updates.actions ? buildHAActions(updates.actions) : undefined,
            icon: updates.icon ? lucideToMdi(updates.icon) : undefined,
          });
          
          setTimeout(() => get().loadSharedRoutines(), 500);
        } else {
          set((state) => ({
            localRoutines: state.localRoutines.map((routine) =>
              routine.id === id
                ? { ...routine, ...updates, updatedAt: new Date().toISOString() }
                : routine
            ),
          }));
        }
      },

      deleteRoutine: async (id) => {
        const isShared = id.startsWith("automation.");
        
        if (isShared) {
          const client = useHAStore.getState().client;
          if (!client) {
            throw new Error("Non connecté à Home Assistant");
          }
          
          const automationId = id.replace("automation.", "");
          const result = await client.deleteAutomation(automationId);
          
          if (result.cannotDelete) {
            throw new Error("Cette routine a été créée via Home Assistant (YAML ou interface) et ne peut pas être supprimée depuis l'application.");
          }
          
          set((state) => ({
            sharedRoutines: state.sharedRoutines.filter((r) => r.id !== id),
            sharedRoutineFavorites: state.sharedRoutineFavorites.filter((f) => f !== id),
          }));
        } else {
          set((state) => ({
            localRoutines: state.localRoutines.filter((routine) => routine.id !== id),
          }));
        }
      },

      toggleRoutineFavorite: (id) => {
        const isShared = id.startsWith("automation.");
        
        if (isShared) {
          set((state) => {
            const isFav = state.sharedRoutineFavorites.includes(id);
            const newFavorites = isFav
              ? state.sharedRoutineFavorites.filter((f) => f !== id)
              : [...state.sharedRoutineFavorites, id];
            
            const updatedRoutines = state.sharedRoutines.map((r) =>
              r.id === id ? { ...r, isFavorite: !isFav } : r
            );
            
            return {
              sharedRoutineFavorites: newFavorites,
              sharedRoutines: updatedRoutines,
            };
          });
        } else {
          set((state) => ({
            localRoutines: state.localRoutines.map((r) =>
              r.id === id
                ? { ...r, isFavorite: !r.isFavorite, updatedAt: new Date().toISOString() }
                : r
            ),
          }));
        }
      },

      toggleRoutineEnabled: (id) => {
        const isShared = id.startsWith("automation.");
        
        if (isShared) {
          const client = useHAStore.getState().client;
          if (client) {
            const routine = get().sharedRoutines.find((r) => r.id === id);
            if (routine) {
              const service = routine.enabled ? "automation.turn_off" : "automation.turn_on";
              client.callService("automation", routine.enabled ? "turn_off" : "turn_on", {}, { entity_id: id });
            }
          }
          
          set((state) => ({
            sharedRoutines: state.sharedRoutines.map((r) =>
              r.id === id ? { ...r, enabled: !r.enabled } : r
            ),
          }));
        } else {
          set((state) => ({
            localRoutines: state.localRoutines.map((r) =>
              r.id === id
                ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() }
                : r
            ),
          }));
        }
      },

      reorderRoutines: (orderedIds) => {
        set((state) => {
          const allRoutines = [...state.localRoutines, ...state.sharedRoutines];
          const reorderedLocal: NeoliaRoutine[] = [];
          const reorderedShared: NeoliaRoutine[] = [];
          
          orderedIds.forEach((id, index) => {
            const routine = allRoutines.find((r) => r.id === id);
            if (routine) {
              const updated = { ...routine, order: index };
              if (routine.scope === "shared") {
                reorderedShared.push(updated);
              } else {
                reorderedLocal.push(updated);
              }
            }
          });
          
          return {
            localRoutines: reorderedLocal,
            sharedRoutines: reorderedShared,
          };
        });
      },
    }),
    {
      name: "neolia-routines",
      version: 1,
      partialize: (state) => ({
        localRoutines: state.localRoutines,
        sharedRoutineFavorites: state.sharedRoutineFavorites,
      }),
    }
  )
);
