import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NeoliaRoutine, RoutineAction, RoutineSchedule } from "@/types/routines";
import { useHAStore } from "./useHAStore";

interface RoutineStore {
  // All routines are Home Assistant automations (shared)
  sharedRoutines: NeoliaRoutine[];
  // Local favorites for HA routines (favorites remain local)
  sharedRoutineFavorites: string[];

  isLoadingShared: boolean;

  addRoutine: (routine: Omit<NeoliaRoutine, "id" | "createdAt" | "updatedAt">) => Promise<NeoliaRoutine>;
  updateRoutine: (id: string, updates: Partial<NeoliaRoutine>) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  toggleRoutineFavorite: (id: string) => void;
  toggleRoutineEnabled: (id: string) => void;
  reorderRoutines: (orderedIds: string[]) => void;

  loadSharedRoutines: () => Promise<void>;
}

/** =========================
 *  NEOLIA META (stored in HA)
 *  ========================= */
type NeoliaMeta = {
  v: 1;
  icon?: string; // Lucide icon name (e.g. "Tv", "Coffee", "Clock")
};

const META_START = "[NEOLIA_META]";
const META_END = "[/NEOLIA_META]";
const META_REGEX = /\[NEOLIA_META\][\s\S]*?\[\/NEOLIA_META\]/g;

function stripNeoliaMeta(description?: string): string | undefined {
  if (!description) return description;
  return description.replace(META_REGEX, "").trim() || undefined;
}

function extractNeoliaMeta(description?: string): NeoliaMeta | null {
  if (!description) return null;
  const match = description.match(/\[NEOLIA_META\]([\s\S]*?)\[\/NEOLIA_META\]/);
  if (!match || !match[1]) return null;

  try {
    const parsed = JSON.parse(match[1]);
    if (parsed && parsed.v === 1) return parsed as NeoliaMeta;
    return null;
  } catch {
    return null;
  }
}

function attachNeoliaMeta(description: string | undefined, meta: NeoliaMeta): string | undefined {
  const clean = stripNeoliaMeta(description);
  const metaBlock = `${META_START}${JSON.stringify(meta)}${META_END}`;
  if (!clean) return metaBlock;
  return `${clean}\n\n${metaBlock}`;
}

/** =========================
 *  ICON MAPPING (MDI <-> Lucide)
 *  ========================= */

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

  // Extras
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
  if (mdiName) return `mdi:${mdiName}`;
  return `mdi:${lucideIcon.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

/** =========================
 *  HA <-> Routine conversion
 *  ========================= */

function haAutomationToNeoliaRoutine(entity: any, favorites: string[], existing?: NeoliaRoutine): NeoliaRoutine {
  const entityId = entity.entity_id;
  const friendlyName = entity.attributes?.friendly_name || entityId.replace("automation.", "");

  // Base: use HA description if present, but strip NEOLIA meta for display.
  const rawDescription = entity.attributes?.description || existing?.description;
  const cleanDescription = stripNeoliaMeta(rawDescription);

  return {
    id: entityId,
    name: friendlyName,
    // Icon will be filled from HA config meta if available; fallback here
    icon: existing?.icon || "Clock",
    description: cleanDescription,
    scope: "shared",
    // schedule/actions rebuilt from HA config when possible; fallback here
    actions: existing?.actions || [],
    schedule: existing?.schedule || { frequency: "daily", time: "00:00", daysOfWeek: [1, 2, 3, 4, 5, 6, 0] },
    enabled: entity.state === "on",
    order: existing?.order,
    isFavorite: favorites.includes(entityId),
    createdAt: existing?.createdAt || entity.last_changed || new Date().toISOString(),
    updatedAt: entity.last_updated || existing?.updatedAt || new Date().toISOString(),
  };
}

/** =========================
 *  Build HA automation triggers/conditions/actions
 *  ========================= */

function buildHATrigger(schedule: RoutineSchedule): any[] {
  const triggers: any[] = [];

  let timeFormatted = schedule.time;
  if (timeFormatted && !timeFormatted.includes(":")) {
    timeFormatted = `${timeFormatted}:00:00`;
  } else if (timeFormatted && timeFormatted.split(":").length === 2) {
    timeFormatted = `${timeFormatted}:00`;
  }

  triggers.push({
    platform: "time",
    at: timeFormatted,
  });

  return triggers;
}

function buildHAConditions(schedule: RoutineSchedule): any[] {
  const conditions: any[] = [];

  switch (schedule.frequency) {
    case "once":
      if (schedule.date) {
        conditions.push({
          condition: "template",
          value_template: `{{ now().strftime('%Y-%m-%d') == '${schedule.date}' }}`,
        });
      }
      break;
    case "daily":
      if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0 && schedule.daysOfWeek.length < 7) {
        const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const selectedDays = schedule.daysOfWeek.map((d) => dayNames[d]);
        conditions.push({
          condition: "time",
          weekday: selectedDays,
        });
      }
      break;
    case "weekly":
      if (schedule.dayOfWeek !== undefined) {
        const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        conditions.push({
          condition: "time",
          weekday: [dayNames[schedule.dayOfWeek]],
        });
      }
      break;
    case "monthly":
      if (schedule.dayOfMonth) {
        conditions.push({
          condition: "template",
          value_template: `{{ now().day == ${schedule.dayOfMonth} }}`,
        });
      }
      break;
    case "yearly":
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

/**
 * Parse HA automation config to reconstruct schedule
 * Robust against: trigger.at not a string, or Edge Function wrapping, or time_pattern triggers.
 */
function parseHAConfigToSchedule(config: any): RoutineSchedule | null {
  if (!config) return null;

  // HA can return either singular (trigger/condition) or plural (triggers/conditions)
  // depending on API/version/wrapping.
  const triggerLike = (config as any).trigger ?? (config as any).triggers;
  if (!triggerLike) return null;

  const normalizeAtToTime = (at: any): string => {
    if (!at) return "00:00";

    if (typeof at === "string") {
      const parts = at.split(":");
      if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
      return "00:00";
    }

    if (typeof at === "object") {
      const h = at.hours ?? at.hour;
      const m = at.minutes ?? at.minute;
      if (typeof h === "number" && typeof m === "number") {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }

    try {
      const s = String(at);
      const parts = s.split(":");
      if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    } catch {
      // ignore
    }
    return "00:00";
  };

  try {
    const triggers = Array.isArray(triggerLike) ? triggerLike : [triggerLike];
    const rawConditions = (config as any).condition ?? (config as any).conditions ?? [];
    const conditions = Array.isArray(rawConditions) ? rawConditions : [rawConditions];

    // Prefer "time" triggers (your model)
    const timeTrigger = triggers.find((t: any) => t?.platform === "time");
    const timePatternTrigger = triggers.find((t: any) => t?.platform === "time_pattern");

    // If it is time_pattern, it doesn't map to your RoutineSchedule cleanly.
    // Returning null avoids showing a wrong "00:00".
    if (!timeTrigger && timePatternTrigger) {
      return null;
    }

    let time = "00:00";
    if (timeTrigger?.at) {
      time = normalizeAtToTime(timeTrigger.at);
    }

    // Once: date template condition
    const dateCondition = conditions.find(
      (c: any) =>
        c.condition === "template" &&
        typeof c.value_template === "string" &&
        c.value_template.includes("now().strftime('%Y-%m-%d')")
    );
    if (dateCondition) {
      const dateMatch = dateCondition.value_template?.match(/'(\d{4}-\d{2}-\d{2})'/);
      return {
        frequency: "once",
        time,
        date: dateMatch?.[1] || new Date().toISOString().split("T")[0],
      };
    }

    // Weekday condition
    const timeCondition = conditions.find((c: any) => c.condition === "time" && c.weekday);
    if (timeCondition?.weekday) {
      const dayNameMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
      const weekdays = Array.isArray(timeCondition.weekday) ? timeCondition.weekday : [timeCondition.weekday];

      const daysOfWeek = weekdays
        .map((d: string) => dayNameMap[String(d).toLowerCase()])
        .filter((d: number) => d !== undefined);

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

    // Monthly (day of month)
    const monthlyCondition = conditions.find(
      (c: any) =>
        c.condition === "template" &&
        typeof c.value_template === "string" &&
        c.value_template.includes("now().day ==") &&
        !c.value_template.includes("now().month")
    );
    if (monthlyCondition) {
      const dayMatch = monthlyCondition.value_template?.match(/now\(\)\.day == (\d+)/);
      return {
        frequency: "monthly",
        time,
        dayOfMonth: dayMatch ? parseInt(dayMatch[1], 10) : 1,
      };
    }

    // Yearly (month and day)
    const yearlyCondition = conditions.find(
      (c: any) =>
        c.condition === "template" &&
        typeof c.value_template === "string" &&
        c.value_template.includes("now().month ==")
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

    // Default: daily all days
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
  if (!config) return [];

  // HA can return either singular (action) or plural (actions)
  const actionLike = (config as any).action ?? (config as any).actions;
  if (!actionLike) return [];

  const actions = Array.isArray(actionLike) ? actionLike : [actionLike];
  const result: RoutineAction[] = [];

  for (const haAction of actions) {
    const service: string = haAction.service || "";
    const target = haAction.target || {};
    
    // HA can have entity_id in target.entity_id (new syntax) or haAction.entity_id (legacy syntax)
    // Also can be haAction.data.entity_id in some cases
    let rawEntityId = target.entity_id ?? haAction.entity_id ?? haAction.data?.entity_id;
    const entityId = Array.isArray(rawEntityId) ? rawEntityId[0] : rawEntityId;

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
      haActions.push({ service: "scene.turn_on", target: { entity_id: action.id } });
    } else if (action.type === "group") {
      haActions.push({
        service: action.groupState === "on" ? "homeassistant.turn_on" : "homeassistant.turn_off",
        target: { entity_id: action.id },
      });
    } else if (action.type === "device") {
      const domain = action.id.split(".")[0];
      const targetState = action.targetState;

      if (targetState?.state === "off") {
        haActions.push({ service: `${domain}.turn_off`, target: { entity_id: action.id } });
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

/** =========================
 *  Store
 *  ========================= */

export const useRoutineStore = create<RoutineStore>()(
  persist(
    (set, get) => ({
      sharedRoutines: [],
      sharedRoutineFavorites: [],
      isLoadingShared: false,

      loadSharedRoutines: async () => {
        set({ isLoadingShared: true });

        try {
          const entities = useHAStore.getState().entities;
          const entityRegistry = useHAStore.getState().entityRegistry;
          const client = useHAStore.getState().client;

          const favorites = get().sharedRoutineFavorites;
          const existingRoutines = get().sharedRoutines;

          // Filter visible automation.* entities
          const automationEntities = entities.filter((e) => {
            if (!e.entity_id.startsWith("automation.")) return false;

            const regEntry = entityRegistry.find((r) => r.entity_id === e.entity_id) as any;
            if (regEntry?.hidden_by) return false;

            if (e.attributes?.hidden === true) return false;

            return true;
          });

          const haAutomations: NeoliaRoutine[] = [];

          for (const entity of automationEntities) {
            const existing = existingRoutines.find((r) => r.id === entity.entity_id);

            // Start from HA state entity
            const routine = haAutomationToNeoliaRoutine(entity, favorites, existing);

            // If we have HA client, enrich from HA automation config (schedule/actions/meta icon/description)
            if (client) {
              try {
                const automationId = entity.entity_id.replace("automation.", "");
                const result = await client.getAutomationConfig(automationId);

                // Normalisation: Edge Function can wrap the config
                const cfg =
                  (result as any)?.config?.config ??
                  (result as any)?.config?.automation ??
                  (result as any)?.config ??
                  (result as any);

                if (cfg && !(result as any)?.notFound) {
                  // Description + meta icon from config.description (most reliable)
                  const cfgDesc: string | undefined = cfg.description ?? routine.description;
                  const meta = extractNeoliaMeta(cfgDesc);
                  const cleanDesc = stripNeoliaMeta(cfgDesc);

                  if (cleanDesc !== undefined) routine.description = cleanDesc;

                  // Icon: from HA meta first, else keep existing (legacy local), else fallback
                  if (meta?.icon) {
                    routine.icon = meta.icon;
                  } else {
                    routine.icon = existing?.icon || routine.icon || "Clock";
                  }

                  // Schedule: parse from HA config when possible
                  const parsedSchedule = parseHAConfigToSchedule(cfg);
                  if (parsedSchedule) {
                    routine.schedule = parsedSchedule;
                  }

                  // Actions: parse from HA config when possible
                  const parsedActions = parseHAActionsToRoutineActions(cfg);
                  if (parsedActions.length > 0) {
                    routine.actions = parsedActions;
                  }
                }
              } catch (error) {
                console.warn("[RoutineStore] Could not fetch automation config:", entity.entity_id, error);
              }
            }

            haAutomations.push(routine);
          }

          set({ sharedRoutines: haAutomations });
          console.log("[RoutineStore] Loaded", haAutomations.length, "visible HA automations");
        } finally {
          set({ isLoadingShared: false });
        }
      },

      addRoutine: async (routineData) => {
        const client = useHAStore.getState().client;
        if (!client) throw new Error("Non connecté à Home Assistant");

        const automationId = routineData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "");

        const conditions = buildHAConditions(routineData.schedule);

        // Store icon in HA description meta (shared)
        const descriptionWithMeta = attachNeoliaMeta(routineData.description, {
          v: 1,
          icon: routineData.icon,
        });

        await client.createAutomation({
          id: automationId,
          alias: routineData.name,
          description: descriptionWithMeta,
          trigger: buildHATrigger(routineData.schedule),
          condition: conditions.length > 0 ? conditions : undefined,
          action: buildHAActions(routineData.actions),
        });

        const newRoutine: NeoliaRoutine = {
          ...routineData,
          description: stripNeoliaMeta(routineData.description),
          id: `automation.${automationId}`,
          scope: "shared",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Optimistic add
        set((state) => ({
          sharedRoutines: [...state.sharedRoutines, newRoutine],
        }));

        // Reload from HA (will pull schedule/actions/meta)
        setTimeout(() => get().loadSharedRoutines(), 500);

        return newRoutine;
      },

      updateRoutine: async (id, updates) => {
        const client = useHAStore.getState().client;
        if (!client) throw new Error("Non connecté à Home Assistant");

        const automationId = id.replace("automation.", "");
        const current = get().sharedRoutines.find((r) => r.id === id);

        const conditions = updates.schedule ? buildHAConditions(updates.schedule) : undefined;

        // If user updated icon or description, re-attach meta into HA description
        let descriptionWithMeta: string | undefined = undefined;

        const newIcon = updates.icon ?? current?.icon;
        const newDesc = updates.description ?? current?.description;

        if (updates.icon !== undefined || updates.description !== undefined) {
          descriptionWithMeta = attachNeoliaMeta(newDesc, { v: 1, icon: newIcon });
        }

        await client.updateAutomation({
          id: automationId,
          alias: updates.name,
          description: descriptionWithMeta, // only when changed
          trigger: updates.schedule ? buildHATrigger(updates.schedule) : undefined,
          condition: conditions && conditions.length > 0 ? conditions : undefined,
          action: updates.actions ? buildHAActions(updates.actions) : undefined,
        });

        set((state) => ({
          sharedRoutines: state.sharedRoutines.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...updates,
                  description: updates.description ? stripNeoliaMeta(updates.description) : r.description,
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        }));

        setTimeout(() => get().loadSharedRoutines(), 500);
      },

      deleteRoutine: async (id) => {
        const client = useHAStore.getState().client;
        if (!client) throw new Error("Non connecté à Home Assistant");

        const automationId = id.replace("automation.", "");
        const result = await client.deleteAutomation(automationId);

        if (result.cannotDelete) {
          throw new Error(
            "Cette routine a été créée via Home Assistant (YAML ou interface) et ne peut pas être supprimée depuis l'application."
          );
        }

        set((state) => ({
          sharedRoutines: state.sharedRoutines.filter((r) => r.id !== id),
          sharedRoutineFavorites: state.sharedRoutineFavorites.filter((f) => f !== id),
        }));
      },

      toggleRoutineFavorite: (id) => {
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
          sharedRoutines: state.sharedRoutines.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
        }));
      },

      reorderRoutines: (orderedIds) => {
        set((state) => {
          const reorderedShared: NeoliaRoutine[] = [];

          orderedIds.forEach((id, index) => {
            const routine = state.sharedRoutines.find((r) => r.id === id);
            if (routine) reorderedShared.push({ ...routine, order: index });
          });

          return { sharedRoutines: reorderedShared };
        });
      },
    }),
    {
      name: "neolia-routines",
      version: 4,
      partialize: (state) => ({
        // Persist routines and favorites locally to avoid flash of empty state on reload
        sharedRoutines: state.sharedRoutines,
        sharedRoutineFavorites: state.sharedRoutineFavorites,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<RoutineStore>;
        return {
          ...currentState,
          sharedRoutines: persisted.sharedRoutines ?? currentState.sharedRoutines,
          sharedRoutineFavorites: persisted.sharedRoutineFavorites ?? currentState.sharedRoutineFavorites,
        };
      },
    }
  )
);
