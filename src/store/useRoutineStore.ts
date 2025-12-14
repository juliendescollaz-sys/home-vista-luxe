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

// Complete bidirectional mapping for all icons in ROUTINE_ICON_CATEGORIES
// (Same comprehensive mapping as scenes)
const ICON_MAPPING: Record<string, string> = {
  // Temps
  "clock": "Clock",
  "clock-outline": "Clock",
  "timer": "Timer",
  "timer-outline": "Timer",
  "timer-sand": "Timer",
  "calendar": "Calendar",
  "calendar-month": "Calendar",
  "calendar-days": "CalendarDays",
  "calendar-week": "CalendarDays",
  "calendar-clock": "CalendarClock",
  "alarm": "Alarm",
  "alarm-clock": "Alarm",
  "hourglass": "Hourglass",
  "hourglass-empty": "Hourglass",
  "hourglass-half": "Hourglass",
  "watch": "Watch",
  "sunrise": "Sunrise",
  "weather-sunrise": "Sunrise",
  "sunset": "Sunset",
  "weather-sunset": "Sunset",
  "sun": "Sun",
  "weather-sunny": "Sun",
  "moon": "Moon",
  "weather-night": "Moon",
  
  // Actions
  "play": "Play",
  "play-circle": "Play",
  "power": "Power",
  "power-plug": "Power",
  "zap": "Zap",
  "flash": "Zap",
  "lightning-bolt": "Zap",
  "refresh-cw": "RefreshCw",
  "refresh": "RefreshCw",
  "rotate-cw": "RotateCw",
  "rotate-right": "RotateCw",
  "arrow-right": "ArrowRight",
  "chevron-right": "ArrowRight",
  "check": "Check",
  "check-circle": "CheckCircle",
  "check-circle-outline": "CheckCircle",
  "bell": "Bell",
  "bell-outline": "Bell",
  "bell-ring": "BellRing",
  "bell-ring-outline": "BellRing",
  "megaphone": "Megaphone",
  "bullhorn": "Megaphone",
  "send": "Send",
  
  // Ambiances
  "sparkles": "Sparkles",
  "star-four-points": "Sparkles",
  "auto-fix": "Sparkles",
  "stars": "Stars",
  "star-shooting": "Stars",
  "heart": "Heart",
  "flame": "Flame",
  "fire": "Flame",
  "cloud-moon": "CloudMoon",
  "weather-night-partly-cloudy": "CloudMoon",
  "lamp": "Lamp",
  "lightbulb": "Lightbulb",
  "light-bulb": "Lightbulb",
  "palette": "Palette",
  "gem": "Gem",
  "diamond-stone": "Gem",
  "crown": "Crown",
  "party-popper": "PartyPopper",
  "confetti": "PartyPopper",
  "music": "Music",
  "music-note": "Music",
  
  // Maison
  "home": "Home",
  "home-automation": "Home",
  "door-open": "DoorOpen",
  "door": "DoorOpen",
  "door-closed": "DoorClosed",
  "lock": "Lock",
  "lock-closed": "Lock",
  "unlock": "Unlock",
  "lock-open": "Unlock",
  "lock-open-variant": "Unlock",
  "shield": "Shield",
  "shield-check": "ShieldCheck",
  "shield-check-outline": "ShieldCheck",
  "log-in": "LogIn",
  "login": "LogIn",
  "log-out": "LogOut",
  "logout": "LogOut",
  "exit-run": "LogOut",
  "car": "Car",
  "plane": "Plane",
  "airplane": "Plane",
  "bed": "Bed",
  
  // Climat
  "thermometer": "Thermometer",
  "thermometer-sun": "ThermometerSun",
  "thermometer-high": "ThermometerSun",
  "thermometer-snowflake": "ThermometerSnowflake",
  "thermometer-low": "ThermometerSnowflake",
  "fan": "Fan",
  "snowflake": "Snowflake",
  "wind": "Wind",
  "weather-windy": "Wind",
  "droplets": "Droplets",
  "water": "Droplets",
  "cloud-rain": "CloudRain",
  "weather-rainy": "CloudRain",
  "weather-pouring": "CloudRain",
  "heater": "Heater",
  "radiator": "Heater",
  "heating-coil": "Heater",
  "waves": "Waves",
  
  // Extras from scene icons that could be used
  "star": "Star",
  "sofa": "Sofa",
  "coffee": "Coffee",
  "tv": "Tv",
  "television": "Tv",
  "gamepad": "Gamepad2",
  "gamepad-variant": "Gamepad2",
  "briefcase": "Briefcase",
  "camera": "Camera",
  "bike": "Bike",
  "bicycle": "Bike",
  "settings": "Settings",
  "cog": "Settings",
  "wifi": "Wifi",
  "map-pin": "MapPin",
  "map-marker": "MapPin",
};

// Reverse mapping: Lucide -> MDI (primary MDI name)
const LUCIDE_TO_MDI: Record<string, string> = {
  // Temps
  "Clock": "clock-outline",
  "Timer": "timer-sand",
  "Calendar": "calendar",
  "CalendarDays": "calendar-week",
  "CalendarClock": "calendar-clock",
  "Alarm": "alarm",
  "Hourglass": "hourglass-half",
  "Watch": "watch",
  "Sunrise": "weather-sunrise",
  "Sunset": "weather-sunset",
  "Sun": "weather-sunny",
  "Moon": "weather-night",
  
  // Actions
  "Play": "play",
  "Power": "power",
  "Zap": "flash",
  "RefreshCw": "refresh",
  "RotateCw": "rotate-right",
  "ArrowRight": "arrow-right",
  "Check": "check",
  "CheckCircle": "check-circle-outline",
  "Bell": "bell",
  "BellRing": "bell-ring",
  "Megaphone": "bullhorn",
  "Send": "send",
  
  // Ambiances
  "Sparkles": "star-four-points",
  "Stars": "star-shooting",
  "Heart": "heart",
  "Flame": "fire",
  "CloudMoon": "weather-night-partly-cloudy",
  "Lamp": "lamp",
  "Lightbulb": "lightbulb",
  "Palette": "palette",
  "Gem": "diamond-stone",
  "Crown": "crown",
  "PartyPopper": "party-popper",
  "Music": "music",
  
  // Maison
  "Home": "home",
  "DoorOpen": "door-open",
  "DoorClosed": "door-closed",
  "Lock": "lock",
  "Unlock": "lock-open-variant",
  "Shield": "shield",
  "ShieldCheck": "shield-check",
  "LogIn": "login",
  "LogOut": "logout",
  "Car": "car",
  "Plane": "airplane",
  "Bed": "bed",
  
  // Climat
  "Thermometer": "thermometer",
  "ThermometerSun": "thermometer-high",
  "ThermometerSnowflake": "thermometer-low",
  "Fan": "fan",
  "Snowflake": "snowflake",
  "Wind": "weather-windy",
  "Droplets": "water",
  "CloudRain": "weather-rainy",
  "Heater": "radiator",
  "Waves": "waves",
  
  // Extras
  "Star": "star",
  "Sofa": "sofa",
  "Coffee": "coffee",
  "Tv": "television",
  "Gamepad2": "gamepad-variant",
  "Briefcase": "briefcase",
  "Camera": "camera",
  "Bike": "bike",
  "Settings": "cog",
  "Wifi": "wifi",
  "MapPin": "map-marker",
};

function mapMdiToLucide(mdiIcon: string): string {
  const normalized = mdiIcon.toLowerCase().replace(/^mdi:/, "");
  return ICON_MAPPING[normalized] || "Clock";
}

function lucideToMdi(lucideIcon: string): string {
  const mdiName = LUCIDE_TO_MDI[lucideIcon];
  if (mdiName) {
    return `mdi:${mdiName}`;
  }
  // Fallback: convert PascalCase to kebab-case
  return `mdi:${lucideIcon.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
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

// Parse HA automation actions to reconstruct RoutineAction list
function parseHAActionsToRoutineActions(config: any): RoutineAction[] {
  if (!config || !config.action) return [];

  const actions = Array.isArray(config.action) ? config.action : [config.action];
  const result: RoutineAction[] = [];

  for (const haAction of actions) {
    const service: string = haAction.service || "";
    const target = haAction.target || {};
    const entityId = Array.isArray(target.entity_id)
      ? target.entity_id[0]
      : target.entity_id;

    if (!service || !entityId) continue;

    const [domain, svc] = service.split(".");

    if (domain === "scene" && svc === "turn_on") {
      result.push({ type: "scene", id: entityId });
      continue;
    }

    if (domain === "homeassistant" && (svc === "turn_on" || svc === "turn_off")) {
      result.push({ type: "group", id: entityId, groupState: svc === "turn_on" ? "on" : "off" });
      continue;
    }

    // Device actions
    const deviceDomain = entityId.split(".")[0];
    const data = haAction.data || {};

    const targetState: RoutineAction["targetState"] = {};

    if (svc === "turn_off") {
      targetState.state = "off";
    } else {
      targetState.state = "on";

      if (data.brightness !== undefined) targetState.brightness = data.brightness;
      if (data.color_temp !== undefined) targetState.color_temp = data.color_temp;
      if (data.rgb_color !== undefined) targetState.rgb_color = data.rgb_color;
      if (data.position !== undefined) targetState.position = data.position;
      if (data.temperature !== undefined) targetState.temperature = data.temperature;
      if (data.hvac_mode !== undefined) targetState.hvac_mode = data.hvac_mode;
      if (data.volume_level !== undefined) targetState.volume_level = data.volume_level;
    }

    // Covers use a specific service for position
    const isCoverPosition = deviceDomain === "cover" && svc === "set_cover_position";

    result.push({
      type: "device",
      id: entityId,
      targetState: {
        ...targetState,
        ...(isCoverPosition && data.position !== undefined ? { position: data.position } : {}),
      },
    });
  }

  return result;
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
        
        // Process automations with schedule and actions reconstruction for those without local data
        const haAutomations: NeoliaRoutine[] = [];
        
        for (const entity of automationEntities) {
          const existing = existingRoutines.find((r) => r.id === entity.entity_id);
          let reconstructedSchedule: RoutineSchedule | null = null;
          let reconstructedActions: RoutineAction[] = [];
          
          // If no existing detailed data, try to reconstruct from HA config via Edge Function
          const needsScheduleRebuild =
            !existing?.schedule ||
            (existing.schedule.frequency === "daily" && existing.schedule.time === "00:00");
          const needsActionsRebuild = !existing?.actions || existing.actions.length === 0;
          
          if ((needsScheduleRebuild || needsActionsRebuild) && client) {
            try {
              const automationId = entity.entity_id.replace("automation.", "");
              const result = await client.getAutomationConfig(automationId);
              if (result.config && !result.notFound) {
                if (needsScheduleRebuild) {
                  reconstructedSchedule = parseHAConfigToSchedule(result.config);
                  console.log("[RoutineStore] Reconstructed schedule from HA for", entity.entity_id, reconstructedSchedule);
                }
                if (needsActionsRebuild) {
                  reconstructedActions = parseHAActionsToRoutineActions(result.config);
                  console.log("[RoutineStore] Reconstructed actions from HA for", entity.entity_id, reconstructedActions);
                }
              }
            } catch (error) {
              console.warn("[RoutineStore] Could not fetch automation config:", entity.entity_id, error);
            }
          }
          
          const routine = haAutomationToNeoliaRoutine(entity, favorites, existing);
          
          // Apply reconstructed schedule if we got one and existing schedule looked like default
          if (reconstructedSchedule && needsScheduleRebuild) {
            routine.schedule = reconstructedSchedule;
          }
          
          // Apply reconstructed actions if we got some and existing actions were empty
          if (reconstructedActions.length > 0 && needsActionsRebuild) {
            routine.actions = reconstructedActions;
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
          icon: lucideToMdi(routineData.icon || "Clock"),
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
        const current = get().sharedRoutines.find((r) => r.id === id);
        
        // Build conditions if schedule is being updated
        const conditions = updates.schedule ? buildHAConditions(updates.schedule) : undefined;
        
        await client.updateAutomation({
          id: automationId,
          alias: updates.name,
          description: updates.description,
          trigger: updates.schedule ? buildHATrigger(updates.schedule) : undefined,
          condition: conditions && conditions.length > 0 ? conditions : undefined,
          action: updates.actions ? buildHAActions(updates.actions) : undefined,
          icon: lucideToMdi((updates.icon || current?.icon || "Clock")),
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
