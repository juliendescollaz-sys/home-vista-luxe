import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SmartAutomation, SmartTrigger, SmartAction, ConditionBlock } from "@/types/smart";
import { useHAStore } from "./useHAStore";

interface SmartStore {
  automations: SmartAutomation[];
  automationFavorites: string[];
  isLoading: boolean;

  addAutomation: (automation: Omit<SmartAutomation, "id" | "createdAt" | "updatedAt">) => Promise<SmartAutomation>;
  updateAutomation: (id: string, updates: Partial<SmartAutomation>) => Promise<void>;
  deleteAutomation: (id: string) => Promise<void>;
  toggleAutomationFavorite: (id: string) => void;
  toggleAutomationEnabled: (id: string) => void;
  reorderAutomations: (orderedIds: string[]) => void;
  loadAutomations: () => Promise<void>;
}

/** =========================
 *  NEOLIA META (stored in HA description)
 *  ========================= */
type NeoliaMeta = {
  v: 1;
  icon?: string;
};

const META_START = "[NEOLIA_SMART]";
const META_END = "[/NEOLIA_SMART]";
const META_REGEX = /\[NEOLIA_SMART\][\s\S]*?\[\/NEOLIA_SMART\]/g;

function stripNeoliaMeta(description?: string): string | undefined {
  if (!description) return description;
  return description.replace(META_REGEX, "").trim() || undefined;
}

function extractNeoliaMeta(description?: string): NeoliaMeta | null {
  if (!description) return null;
  const match = description.match(/\[NEOLIA_SMART\]([\s\S]*?)\[\/NEOLIA_SMART\]/);
  if (!match || !match[1]) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed && parsed.v === 1) return parsed as NeoliaMeta;
    return null;
  } catch {
    return null;
  }
}

function attachNeoliaMeta(description: string | undefined, meta: NeoliaMeta): string {
  const clean = stripNeoliaMeta(description);
  const metaBlock = `${META_START}${JSON.stringify(meta)}${META_END}`;
  if (!clean) return metaBlock;
  return `${clean}\n\n${metaBlock}`;
}

/** =========================
 *  ICON MAPPING (MDI <-> Lucide)
 *  ========================= */
const ICON_MAPPING: Record<string, string> = {
  "robot": "Bot",
  "home-automation": "Bot",
  "weather-sunrise": "Sunrise",
  "weather-sunset": "Sunset",
  "sun": "Sun",
  "weather-sunny": "Sun",
  "moon": "Moon",
  "weather-night": "Moon",
  "clock": "Clock",
  "clock-outline": "Clock",
  "timer": "Timer",
  "timer-sand": "Timer",
  "calendar": "Calendar",
  "flash": "Zap",
  "lightning-bolt": "Zap",
  "thermometer": "Thermometer",
  "water": "Droplets",
  "weather-windy": "Wind",
  "weather-rainy": "CloudRain",
  "gauge": "Gauge",
  "lightbulb": "Lightbulb",
  "lamp": "Lamp",
  "fan": "Fan",
  "radiator": "Heater",
  "snowflake": "Snowflake",
  "television": "Tv",
  "speaker": "Speaker",
  "lock": "Lock",
  "door-open": "DoorOpen",
  "camera": "Camera",
  "blinds": "Blinds",
  "power": "Power",
  "shield": "Shield",
  "shield-check": "ShieldCheck",
  "shield-alert": "ShieldAlert",
  "alert": "AlertTriangle",
  "bell": "Bell",
  "bell-ring": "BellRing",
  "home": "Home",
  "login": "LogIn",
  "logout": "LogOut",
  "account": "User",
  "account-group": "Users",
  "map-marker": "MapPin",
  "star": "Star",
  "cog": "Settings",
};

const LUCIDE_TO_MDI: Record<string, string> = {
  "Bot": "robot",
  "Sunrise": "weather-sunrise",
  "Sunset": "weather-sunset",
  "Sun": "weather-sunny",
  "Moon": "weather-night",
  "Clock": "clock-outline",
  "Timer": "timer-sand",
  "Calendar": "calendar",
  "Zap": "flash",
  "Thermometer": "thermometer",
  "Droplets": "water",
  "Wind": "weather-windy",
  "CloudRain": "weather-rainy",
  "Gauge": "gauge",
  "Lightbulb": "lightbulb",
  "Lamp": "lamp",
  "Fan": "fan",
  "Heater": "radiator",
  "Snowflake": "snowflake",
  "Tv": "television",
  "Speaker": "speaker",
  "Lock": "lock",
  "DoorOpen": "door-open",
  "Camera": "camera",
  "Blinds": "blinds",
  "Power": "power",
  "Shield": "shield",
  "ShieldCheck": "shield-check",
  "ShieldAlert": "shield-alert",
  "AlertTriangle": "alert",
  "Bell": "bell",
  "BellRing": "bell-ring",
  "Home": "home",
  "LogIn": "login",
  "LogOut": "logout",
  "User": "account",
  "Users": "account-group",
  "MapPin": "map-marker",
  "Star": "star",
  "Settings": "cog",
};

function mapMdiToLucide(mdiIcon: string): string {
  const normalized = mdiIcon.toLowerCase().replace(/^mdi:/, "");
  return ICON_MAPPING[normalized] || "Bot";
}

function lucideToMdi(lucideIcon: string): string {
  const mdiName = LUCIDE_TO_MDI[lucideIcon];
  if (mdiName) return `mdi:${mdiName}`;
  return `mdi:${lucideIcon.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

/** =========================
 *  HA AUTOMATION CONVERSION
 *  ========================= */

function haAutomationToSmartAutomation(
  entity: any,
  favorites: string[],
  haConfig?: any,
  existing?: SmartAutomation
): SmartAutomation {
  const entityId = entity.entity_id;
  const friendlyName = entity.attributes?.friendly_name || entityId.replace("automation.", "");
  const rawDescription = entity.attributes?.description || "";
  
  // Extract icon from meta or HA attribute
  const meta = extractNeoliaMeta(rawDescription);
  let icon = existing?.icon || "Bot";
  if (meta?.icon) {
    icon = meta.icon;
  } else if (entity.attributes?.icon) {
    icon = mapMdiToLucide(entity.attributes.icon);
  }

  const cleanDescription = stripNeoliaMeta(rawDescription);

  // Parse triggers, conditions, actions from HA config if available
  const triggers = parseHATriggers(haConfig?.trigger || haConfig?.triggers || []);
  const conditions = parseHAConditions(haConfig?.condition || haConfig?.conditions || []);
  const actions = parseHAActions(haConfig?.action || haConfig?.actions || []);

  return {
    id: entityId,
    name: friendlyName,
    icon,
    description: cleanDescription,
    triggers: triggers.length > 0 ? triggers : (existing?.triggers || []),
    conditions: conditions.groups.length > 0 ? conditions : (existing?.conditions || { rootOperator: "and", groups: [] }),
    actions: actions.length > 0 ? actions : (existing?.actions || []),
    enabled: entity.state === "on",
    order: existing?.order,
    isFavorite: favorites.includes(entityId),
    mode: haConfig?.mode || existing?.mode || "single",
    createdAt: existing?.createdAt || entity.last_changed || new Date().toISOString(),
    updatedAt: entity.last_updated || existing?.updatedAt || new Date().toISOString(),
  };
}

function parseHATriggers(rawTriggers: any): SmartTrigger[] {
  const triggers = Array.isArray(rawTriggers) ? rawTriggers : [rawTriggers].filter(Boolean);
  const result: SmartTrigger[] = [];

  for (const t of triggers) {
    if (!t) continue;

    if (t.platform === "state") {
      result.push({
        type: "state",
        entityId: t.entity_id || "",
        from: t.from,
        to: t.to,
        for: t.for,
      });
    } else if (t.platform === "time") {
      result.push({
        type: "time",
        at: typeof t.at === "string" ? t.at.substring(0, 5) : "00:00",
      });
    } else if (t.platform === "sun") {
      result.push({
        type: "sun",
        event: t.event || "sunset",
        offset: t.offset ? parseOffset(t.offset) : undefined,
      });
    } else if (t.platform === "numeric_state") {
      result.push({
        type: "numeric",
        entityId: t.entity_id || "",
        above: t.above,
        below: t.below,
        attribute: t.attribute,
      });
    } else if (t.platform === "zone") {
      result.push({
        type: "zone",
        entityId: t.entity_id || "",
        zone: t.zone || "zone.home",
        event: t.event || "enter",
      });
    }
  }

  return result;
}

function parseHAConditions(rawConditions: any): ConditionBlock {
  const conditions = Array.isArray(rawConditions) ? rawConditions : [rawConditions].filter(Boolean);
  const block: ConditionBlock = { rootOperator: "and", groups: [] };

  if (conditions.length === 0) return block;

  // Simple case: all conditions in one AND group
  const group = {
    id: crypto.randomUUID(),
    operator: "and" as const,
    conditions: [] as any[],
  };

  for (const c of conditions) {
    if (!c) continue;

    if (c.condition === "state") {
      group.conditions.push({
        type: "state",
        entityId: c.entity_id || "",
        state: c.state || "",
      });
    } else if (c.condition === "time") {
      group.conditions.push({
        type: "time",
        after: c.after,
        before: c.before,
        weekday: c.weekday ? parseWeekdays(c.weekday) : undefined,
      });
    } else if (c.condition === "sun") {
      group.conditions.push({
        type: "sun",
        after: c.after_offset !== undefined ? (c.after || "sunrise") : undefined,
        afterOffset: c.after_offset ? parseOffset(c.after_offset) : undefined,
        before: c.before_offset !== undefined ? (c.before || "sunset") : undefined,
        beforeOffset: c.before_offset ? parseOffset(c.before_offset) : undefined,
      });
    } else if (c.condition === "numeric_state") {
      group.conditions.push({
        type: "numeric",
        entityId: c.entity_id || "",
        above: c.above,
        below: c.below,
        attribute: c.attribute,
      });
    } else if (c.condition === "zone") {
      group.conditions.push({
        type: "zone",
        entityId: c.entity_id || "",
        zone: c.zone || "zone.home",
      });
    } else if (c.condition === "template") {
      group.conditions.push({
        type: "template",
        template: c.value_template || "",
      });
    } else if (c.condition === "and" || c.condition === "or") {
      // Handle nested AND/OR
      const nestedGroup = {
        id: crypto.randomUUID(),
        operator: c.condition as "and" | "or",
        conditions: [] as any[],
      };
      // Recursively parse (simplified - just add raw for now)
      block.groups.push(nestedGroup);
    }
  }

  if (group.conditions.length > 0) {
    block.groups.push(group);
  }

  return block;
}

function parseHAActions(rawActions: any): SmartAction[] {
  const actions = Array.isArray(rawActions) ? rawActions : [rawActions].filter(Boolean);
  const result: SmartAction[] = [];

  for (const a of actions) {
    if (!a) continue;

    if (a.service || a.action) {
      const service = a.service || a.action;
      const entityId = a.target?.entity_id || a.entity_id || a.data?.entity_id;
      
      result.push({
        type: "service",
        service,
        entityId: Array.isArray(entityId) ? entityId[0] : entityId,
        data: a.data,
      });
    } else if (a.delay) {
      const delay = typeof a.delay === "object" 
        ? (a.delay.seconds || 0) + (a.delay.minutes || 0) * 60 + (a.delay.hours || 0) * 3600
        : parseInt(a.delay) || 0;
      result.push({
        type: "delay",
        delaySeconds: delay,
      });
    }
  }

  return result;
}

function parseOffset(offset: string | number): number {
  if (typeof offset === "number") return offset;
  // Parse "+00:30:00" or "-00:15:00" format
  const match = offset.match(/([+-]?)(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const sign = match[1] === "-" ? -1 : 1;
    return sign * (parseInt(match[2]) * 60 + parseInt(match[3]));
  }
  return 0;
}

function parseWeekdays(weekdays: string[]): number[] {
  const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  return weekdays.map(d => dayMap[d.toLowerCase()]).filter(d => d !== undefined);
}

/** =========================
 *  BUILD HA AUTOMATION CONFIG
 *  ========================= */

function buildHATriggers(triggers: SmartTrigger[]): any[] {
  return triggers.map(t => {
    switch (t.type) {
      case "state":
        return {
          platform: "state",
          entity_id: t.entityId,
          ...(t.from && { from: t.from }),
          ...(t.to && { to: t.to }),
          ...(t.for && { for: t.for }),
        };
      case "time":
        return {
          platform: "time",
          at: t.at,
        };
      case "sun":
        return {
          platform: "sun",
          event: t.event,
          ...(t.offset && { offset: formatOffset(t.offset) }),
        };
      case "numeric":
        return {
          platform: "numeric_state",
          entity_id: t.entityId,
          ...(t.above !== undefined && { above: t.above }),
          ...(t.below !== undefined && { below: t.below }),
          ...(t.attribute && { attribute: t.attribute }),
        };
      case "zone":
        return {
          platform: "zone",
          entity_id: t.entityId,
          zone: t.zone,
          event: t.event,
        };
      default:
        return null;
    }
  }).filter(Boolean);
}

function buildHAConditions(conditionBlock: ConditionBlock): any[] {
  if (conditionBlock.groups.length === 0) return [];

  const builtGroups = conditionBlock.groups.map(group => {
    const conditions = group.conditions.map(c => {
      switch (c.type) {
        case "state":
          return {
            condition: "state",
            entity_id: c.entityId,
            state: c.state,
          };
        case "time":
          return {
            condition: "time",
            ...(c.after && { after: c.after }),
            ...(c.before && { before: c.before }),
            ...(c.weekday && { weekday: c.weekday.map(d => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d]) }),
          };
        case "sun": {
          // HA requires at least one of before or after for sun condition
          if (!c.after && !c.before) {
            // Default to "after sunset" if neither is specified
            return {
              condition: "sun",
              after: "sunset",
            };
          }
          return {
            condition: "sun",
            ...(c.after && { after: c.after, after_offset: c.afterOffset ? formatOffset(c.afterOffset) : undefined }),
            ...(c.before && { before: c.before, before_offset: c.beforeOffset ? formatOffset(c.beforeOffset) : undefined }),
          };
        }
        case "numeric":
          return {
            condition: "numeric_state",
            entity_id: c.entityId,
            ...(c.above !== undefined && { above: c.above }),
            ...(c.below !== undefined && { below: c.below }),
            ...(c.attribute && { attribute: c.attribute }),
          };
        case "zone":
          return {
            condition: "zone",
            entity_id: c.entityId,
            zone: c.zone,
          };
        case "template":
          return {
            condition: "template",
            value_template: c.template,
          };
        default:
          return null;
      }
    }).filter(Boolean);

    if (conditions.length === 1) return conditions[0];
    return {
      condition: group.operator,
      conditions,
    };
  });

  if (builtGroups.length === 1) return [builtGroups[0]];
  
  return [{
    condition: conditionBlock.rootOperator,
    conditions: builtGroups,
  }];
}

function buildHAActions(actions: SmartAction[]): any[] {
  return actions.map(a => {
    switch (a.type) {
      case "service":
        return {
          action: a.service,
          ...(a.entityId && { target: { entity_id: a.entityId } }),
          ...(a.data && { data: a.data }),
        };
      case "delay":
        return {
          delay: { seconds: a.delaySeconds || 0 },
        };
      case "device":
        return {
          action: "homeassistant.turn_on",
          target: { entity_id: a.entityId },
          ...(a.data && { data: a.data }),
        };
      case "scene":
        return {
          action: "scene.turn_on",
          target: { entity_id: a.entityId },
        };
      default:
        return null;
    }
  }).filter(Boolean);
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** =========================
 *  EDGE FUNCTION CALLS
 *  ========================= */

async function callAutomationManager(
  action: "create" | "update" | "delete" | "get",
  automationId: string,
  config?: any
): Promise<any> {
  const haStore = useHAStore.getState();
  const connection = haStore.connection;
  
  if (!connection?.url || !connection?.token) {
    throw new Error("Home Assistant non connecté");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/ha-automation-manager`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      haBaseUrl: connection.url,
      haToken: connection.token,
      action,
      automationId,
      automationConfig: config,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erreur API: ${text}`);
  }

  return response.json();
}

/** =========================
 *  STORE
 *  ========================= */

export const useSmartStore = create<SmartStore>()(
  persist(
    (set, get) => ({
      automations: [],
      automationFavorites: [],
      isLoading: false,

      loadAutomations: async () => {
        set({ isLoading: true });

        try {
          const haStore = useHAStore.getState();
          const entities = haStore.entities;
          const client = haStore.client;
          const favorites = get().automationFavorites;
          const existing = get().automations;

          // Filter for automation entities only
          const automationEntities = entities.filter((e) =>
            e.entity_id.startsWith("automation.")
          );

          // Build map of existing automations for faster lookup
          const existingMap = new Map(existing.map((a) => [a.id, a]));

          const results: SmartAutomation[] = [];

          for (const entity of automationEntities) {
            const entityId = entity.entity_id;
            const automationId = entityId.replace("automation.", "");
            const existingAutomation = existingMap.get(entityId);

            // Determine whether this automation belongs to the Smart page
            // Prefer checking the stored HA config (source of truth), fall back to entity attributes.
            let haConfig: any = null;
            let hasSmartMarker = false;

            if (client) {
              try {
                const response: any = await callAutomationManager("get", automationId);

                // Edge function may return either { config: {...} } or the config object directly.
                haConfig = response?.config ?? response;

                if (!response?.notFound && haConfig) {
                  const description = haConfig.description || "";
                  hasSmartMarker = description.includes(META_START);
                }
              } catch {
                // Ignore and fall back to entity attributes
              }
            }

            if (!hasSmartMarker) {
              const entityDescription = entity.attributes?.description || "";
              hasSmartMarker = entityDescription.includes(META_START);
            }

            // Only add automations that have the Neolia Smart marker (category = "smart")
            if (hasSmartMarker) {
              results.push(
                haAutomationToSmartAutomation(
                  entity,
                  favorites,
                  haConfig,
                  existingAutomation
                )
              );
            }
          }

          set({ automations: results });
        } finally {
          set({ isLoading: false });
        }
      },

      addAutomation: async (automation) => {
        set({ isLoading: true });
        
        const id = automation.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "");
        
        const description = attachNeoliaMeta(automation.description, {
          v: 1,
          icon: automation.icon,
        });

        const config = {
          alias: automation.name,
          description,
          mode: automation.mode || "single",
          trigger: buildHATriggers(automation.triggers),
          condition: buildHAConditions(automation.conditions),
          action: buildHAActions(automation.actions),
        };

        await callAutomationManager("create", id, config);
        
        const newAutomation: SmartAutomation = {
          ...automation,
          id: `automation.${id}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set(state => ({
          automations: [...state.automations, newAutomation],
          isLoading: false,
        }));

        return newAutomation;
      },

      updateAutomation: async (id, updates) => {
        set({ isLoading: true });
        
        const current = get().automations.find(a => a.id === id);
        if (!current) {
          set({ isLoading: false });
          throw new Error("Automation not found");
        }

        const merged = { ...current, ...updates };
        const automationId = id.replace("automation.", "");
        
        const description = attachNeoliaMeta(merged.description, {
          v: 1,
          icon: merged.icon,
        });

        const config = {
          alias: merged.name,
          description,
          mode: merged.mode || "single",
          trigger: buildHATriggers(merged.triggers),
          condition: buildHAConditions(merged.conditions),
          action: buildHAActions(merged.actions),
        };

        await callAutomationManager("update", automationId, config);

        set(state => ({
          automations: state.automations.map(a =>
            a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
          ),
          isLoading: false,
        }));
      },

      deleteAutomation: async (id) => {
        const automationId = id.replace("automation.", "");
        await callAutomationManager("delete", automationId);
        
        set(state => ({
          automations: state.automations.filter(a => a.id !== id),
          automationFavorites: state.automationFavorites.filter(f => f !== id),
        }));
      },

      toggleAutomationFavorite: (id) => {
        set(state => {
          const isFavorite = state.automationFavorites.includes(id);
          const newFavorites = isFavorite
            ? state.automationFavorites.filter(f => f !== id)
            : [...state.automationFavorites, id];
          
          return {
            automationFavorites: newFavorites,
            automations: state.automations.map(a =>
              a.id === id ? { ...a, isFavorite: !isFavorite } : a
            ),
          };
        });
      },

      toggleAutomationEnabled: async (id) => {
        const haStore = useHAStore.getState();
        const client = haStore.client;
        
        if (!client) return;

        const automation = get().automations.find(a => a.id === id);
        if (!automation) return;

        const service = automation.enabled ? "turn_off" : "turn_on";
        
        // Optimistic update
        set(state => ({
          automations: state.automations.map(a =>
            a.id === id ? { ...a, enabled: !a.enabled } : a
          ),
        }));

        try {
          await client.callService("automation", service, undefined, { entity_id: id });
        } catch {
          // Rollback on error
          set(state => ({
            automations: state.automations.map(a =>
              a.id === id ? { ...a, enabled: automation.enabled } : a
            ),
          }));
        }
      },

      reorderAutomations: (orderedIds) => {
        set(state => {
          const reordered = orderedIds
            .map((id, index) => {
              const automation = state.automations.find(a => a.id === id);
              return automation ? { ...automation, order: index } : null;
            })
            .filter(Boolean) as SmartAutomation[];
          
          return { automations: reordered };
        });
      },
    }),
    {
      name: "neolia-smart-store",
      partialize: (state) => ({
        automationFavorites: state.automationFavorites,
      }),
    }
  )
);
