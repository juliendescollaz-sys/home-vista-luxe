import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NeoliaRoutine, RoutineAction, RoutineSchedule } from "@/types/routines";
import { useHAStore } from "./useHAStore";

interface RoutineStore {
  // All routines are now shared (Home Assistant automations) - local routines removed
  sharedRoutines: NeoliaRoutine[];
  // Local favorites for HA routines (favorites are still stored locally)
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
  loadSharedRoutines: () => Promise<void>;
}

// Convert HA automation entity to NeoliaRoutine
function haAutomationToNeoliaRoutine(entity: any, favorites: string[], existing?: NeoliaRoutine): NeoliaRoutine {
  const entityId = entity.entity_id;
  const friendlyName = entity.attributes?.friendly_name || entityId.replace("automation.", "");
  const rawIcon = entity.attributes?.icon || "";
  const cleanIcon = rawIcon.replace(/^(mdi:)+/, "") || "";
  
  // Prioritize existing local data over HA data for icon, schedule, and actions
  // HA doesn't expose detailed schedule/actions via states API, so local data is the source of truth
  const haIcon = cleanIcon ? mapMdiToLucide(cleanIcon) : null;
  
  return {
    id: entityId,
    name: friendlyName,
    // Use existing icon if available, otherwise use HA icon, otherwise default to Clock
    icon: existing?.icon || haIcon || "Clock",
    description: entity.attributes?.description || existing?.description,
    scope: "shared",
    // Always preserve existing actions and schedule - HA states API doesn't expose them
    actions: existing?.actions || [],
    schedule: existing?.schedule || { frequency: "daily", time: "00:00", daysOfWeek: [1, 2, 3, 4, 5, 6, 0] },
    enabled: entity.state === "on",
    order: existing?.order,
    isFavorite: favorites.includes(entityId),
    createdAt: existing?.createdAt || entity.last_changed || new Date().toISOString(),
    updatedAt: entity.last_updated || existing?.updatedAt || new Date().toISOString(),
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
  
  // Ensure time is in HH:MM:SS format (HA requires HH:MM or HH:MM:SS)
  let timeFormatted = schedule.time;
  if (timeFormatted && !timeFormatted.includes(":")) {
    timeFormatted = `${timeFormatted}:00:00`;
  } else if (timeFormatted && timeFormatted.split(":").length === 2) {
    timeFormatted = `${timeFormatted}:00`;
  }
  
  // All schedules use time trigger with conditions added separately
  triggers.push({
    platform: "time",
    at: timeFormatted,
  });
  
  return triggers;
}

// Build HA automation conditions from schedule
function buildHAConditions(schedule: RoutineSchedule): any[] {
  const conditions: any[] = [];
  
  switch (schedule.frequency) {
    case "once":
      // Add date condition for one-time execution
      if (schedule.date) {
        conditions.push({
          condition: "template",
          value_template: `{{ now().strftime('%Y-%m-%d') == '${schedule.date}' }}`,
        });
      }
      break;
    case "daily":
      // Add weekday condition if specific days selected
      if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0 && schedule.daysOfWeek.length < 7) {
        const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const selectedDays = schedule.daysOfWeek.map(d => dayNames[d]);
        conditions.push({
          condition: "time",
          weekday: selectedDays,
        });
      }
      break;
    case "weekly":
      // Specific day of week
      if (schedule.dayOfWeek !== undefined) {
        const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        conditions.push({
          condition: "time",
          weekday: [dayNames[schedule.dayOfWeek]],
        });
      }
      break;
    case "monthly":
      // Specific day of month
      if (schedule.dayOfMonth) {
        conditions.push({
          condition: "template",
          value_template: `{{ now().day == ${schedule.dayOfMonth} }}`,
        });
      }
      break;
    case "yearly":
      // Specific month and day
      if (schedule.month && schedule.dayOfMonthYearly) {
        conditions.push({
          condition: "template",
          value_template: `{{ now().month == ${schedule.month} and now().day == ${schedule.dayOfMonthYearly} }}`,
        });
      }
      break;
  }
  
  return conditions;
}

// Parse HA automation config to reconstruct schedule
function parseHAConfigToSchedule(config: any): RoutineSchedule | null {
  if (!config || !config.trigger) return null;
  
  try {
    // Normaliser trigger et conditions en tableaux (HA peut renvoyer un objet unique)
    const triggers = Array.isArray(config.trigger) ? config.trigger : [config.trigger];
    const rawConditions = config.condition ?? [];
    const conditions = Array.isArray(rawConditions) ? rawConditions : [rawConditions];

    // Get time from trigger
    const timeTrigger = triggers.find((t: any) => t.platform === "time");
    let time = "00:00";
    if (timeTrigger?.at) {
      // at can be "HH:MM:SS" or "HH:MM"
      const atStr = timeTrigger.at.toString();
      time = atStr.split(":").slice(0, 2).join(":");
    }
    
    // Check for date template (once frequency)
    const dateCondition = conditions.find((c: any) => 
      c.condition === "template" && c.value_template?.includes("now().strftime('%Y-%m-%d')")
    );
    if (dateCondition) {
      // Extract date from template like {{ now().strftime('%Y-%m-%d') == '2024-12-15' }}
      const dateMatch = dateCondition.value_template?.match(/'(\d{4}-\d{2}-\d{2})'/);
      return {
        frequency: "once",
        time,
        date: dateMatch?.[1] || new Date().toISOString().split("T")[0],
      };
    }
    
    // Check for weekday condition
    const timeCondition = conditions.find((c: any) => c.condition === "time" && c.weekday);
    if (timeCondition?.weekday) {
      const dayNameMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
      const daysOfWeek = timeCondition.weekday.map((d: string) => dayNameMap[d.toLowerCase()]).filter((d: number) => d !== undefined);
      
      if (daysOfWeek.length === 1) {
        return {
          frequency: "weekly",
          time,
          dayOfWeek: daysOfWeek[0],
        };
      }
      
      return {
        frequency: "daily",
        time,
        daysOfWeek,
      };
    }
    
    // Check for monthly (day of month)
    const monthlyCondition = conditions.find((c: any) => 
      c.condition === "template" && c.value_template?.includes("now().day ==") && !c.value_template?.includes("now().month")
    );
    if (monthlyCondition) {
      const dayMatch = monthlyCondition.value_template?.match(/now\(\)\.day == (\d+)/);
      return {
        frequency: "monthly",
        time,
        dayOfMonth: dayMatch ? parseInt(dayMatch[1], 10) : 1,
      };
    }
    
    // Check for yearly (month and day)
    const yearlyCondition = conditions.find((c: any) => 
      c.condition === "template" && c.value_template?.includes("now().month ==")
    );
    if (yearlyCondition) {
      const monthMatch = yearlyCondition.value_template?.match(/now\(\)\.month == (\d+)/);
      const dayMatch = yearlyCondition.value_template?.match(/now\(\)\.day == (\d+)/);
      return {
        frequency: "yearly",
        time,
        month: monthMatch ? parseInt(monthMatch[1], 10) : 1,
        dayOfMonthYearly: dayMatch ? parseInt(dayMatch[1], 10) : 1,
      };
    }
    
    // Default: daily with all days
    return {
      frequency: "daily",
      time,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    };
  } catch (error) {
    console.error("[RoutineStore] Error parsing HA config to schedule:", error, config);
    return null;
  }
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
      // Local routines removed - all routines are now HA automations
      sharedRoutines: [],
      sharedRoutineFavorites: [],
      isLoadingShared: false,

      loadSharedRoutines: async () => {
        const entities = useHAStore.getState().entities;
        const entityRegistry = useHAStore.getState().entityRegistry;
        const client = useHAStore.getState().client;
        const favorites = get().sharedRoutineFavorites;
        const existingRoutines = get().sharedRoutines;
        
        console.log("[RoutineStore] loadSharedRoutines - existing routines from store:", existingRoutines.length, 
          existingRoutines.map(r => ({ id: r.id, icon: r.icon, schedule: r.schedule })));
        
        // Filter automation.* entities, excluding hidden ones
        const automationEntities = entities
          .filter((e) => {
            if (!e.entity_id.startsWith("automation.")) return false;
            
            // Check entity registry for hidden_by flag
            const regEntry = entityRegistry.find((r) => r.entity_id === e.entity_id) as any;
            if (regEntry?.hidden_by) return false;
            
            // Check entity attributes for hidden flag
            if (e.attributes?.hidden === true) return false;
            
            return true;
          });
        
        // Process automations with schedule reconstruction for those without local data
        const haAutomations: NeoliaRoutine[] = [];
        
        for (const entity of automationEntities) {
          const existing = existingRoutines.find((r) => r.id === entity.entity_id);
          
          // If no existing schedule data and we have a client, try to fetch config from HA
          let reconstructedSchedule: RoutineSchedule | null = null;
          if (!existing?.schedule || (existing.schedule.frequency === "daily" && existing.schedule.time === "00:00")) {
            // This might be a routine without local data - try to reconstruct from HA
            if (client) {
              try {
                const automationId = entity.entity_id.replace("automation.", "");
                const result = await client.getAutomationConfig(automationId);
                if (result.config && !result.notFound) {
                  reconstructedSchedule = parseHAConfigToSchedule(result.config);
                  console.log("[RoutineStore] Reconstructed schedule from HA for", entity.entity_id, reconstructedSchedule);
                }
              } catch (error) {
                console.warn("[RoutineStore] Could not fetch automation config:", entity.entity_id, error);
              }
            }
          }
          
          const routine = haAutomationToNeoliaRoutine(entity, favorites, existing);
          
          // Apply reconstructed schedule if we got one and existing schedule looks like default
          if (reconstructedSchedule && (!existing?.schedule || (existing.schedule.frequency === "daily" && existing.schedule.time === "00:00"))) {
            routine.schedule = reconstructedSchedule;
          }
          
          haAutomations.push(routine);
        }
        
        set({ sharedRoutines: haAutomations });
        console.log("[RoutineStore] Loaded", haAutomations.length, "visible HA automations");
      },

      addRoutine: async (routineData) => {
        // All routines are now shared (HA automations)
        const client = useHAStore.getState().client;
        if (!client) {
          throw new Error("Non connecté à Home Assistant");
        }
        
        // Generate a unique automation ID from the name
        const automationId = routineData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "");
        
        // Build conditions from schedule
        const conditions = buildHAConditions(routineData.schedule);
        
        // Create automation via HA API
        await client.createAutomation({
          id: automationId,
          alias: routineData.name,
          description: routineData.description,
          trigger: buildHATrigger(routineData.schedule),
          condition: conditions.length > 0 ? conditions : undefined,
          action: buildHAActions(routineData.actions),
        });
        
        const newRoutine: NeoliaRoutine = {
          ...routineData,
          id: `automation.${automationId}`,
          scope: "shared",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Add to store BEFORE reload so loadSharedRoutines can preserve schedule
        set((state) => ({
          sharedRoutines: [...state.sharedRoutines, newRoutine],
        }));
        
        // Reload shared routines from HA entities
        setTimeout(() => get().loadSharedRoutines(), 500);
        
        return newRoutine;
      },

      updateRoutine: async (id, updates) => {
        // All routines are HA automations
        const client = useHAStore.getState().client;
        if (!client) {
          throw new Error("Non connecté à Home Assistant");
        }
        
        const automationId = id.replace("automation.", "");
        
        // Build conditions if schedule is being updated
        const conditions = updates.schedule ? buildHAConditions(updates.schedule) : undefined;
        
        await client.updateAutomation({
          id: automationId,
          alias: updates.name,
          description: updates.description,
          trigger: updates.schedule ? buildHATrigger(updates.schedule) : undefined,
          condition: conditions && conditions.length > 0 ? conditions : undefined,
          action: updates.actions ? buildHAActions(updates.actions) : undefined,
        });
        
        // Update in store BEFORE reload so loadSharedRoutines can preserve schedule
        set((state) => ({
          sharedRoutines: state.sharedRoutines.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          ),
        }));
        
        setTimeout(() => get().loadSharedRoutines(), 500);
      },

      deleteRoutine: async (id) => {
        // All routines are HA automations
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
      },

      toggleRoutineFavorite: (id) => {
        // Favorites are still stored locally
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
      },

      toggleRoutineEnabled: (id) => {
        const client = useHAStore.getState().client;
        if (client) {
          const routine = get().sharedRoutines.find((r) => r.id === id);
          if (routine) {
            client.callService("automation", routine.enabled ? "turn_off" : "turn_on", {}, { entity_id: id });
          }
        }
        
        set((state) => ({
          sharedRoutines: state.sharedRoutines.map((r) =>
            r.id === id ? { ...r, enabled: !r.enabled } : r
          ),
        }));
      },

      reorderRoutines: (orderedIds) => {
        set((state) => {
          const reorderedShared: NeoliaRoutine[] = [];
          
          orderedIds.forEach((id, index) => {
            const routine = state.sharedRoutines.find((r) => r.id === id);
            if (routine) {
              reorderedShared.push({ ...routine, order: index });
            }
          });
          
          return {
            sharedRoutines: reorderedShared,
          };
        });
      },
    }),
    {
      name: "neolia-routines",
      version: 2,
      partialize: (state) => ({
        // Persist favorites and routine metadata (schedule, actions, etc.) locally
        // HA reste la source de vérité pour l'état activé/désactivé via loadSharedRoutines
        sharedRoutineFavorites: state.sharedRoutineFavorites,
        sharedRoutines: state.sharedRoutines,
      }),
      // Explicit merge to correctly hydrate persisted state
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<RoutineStore>;
        return {
          ...currentState,
          sharedRoutineFavorites: persisted.sharedRoutineFavorites ?? currentState.sharedRoutineFavorites,
          sharedRoutines: persisted.sharedRoutines ?? currentState.sharedRoutines,
        };
      },
    }
  )
);
