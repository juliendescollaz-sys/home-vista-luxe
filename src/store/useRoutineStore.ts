import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NeoliaRoutine, RoutineAction, RoutineSchedule } from "@/types/routines";
import { useHAStore } from "./useHAStore";

interface RoutineStore {
  sharedRoutines: NeoliaRoutine[];
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

/* =========================
   NEOLIA META (stored in HA)
   ========================= */

type NeoliaMeta = {
  v: 1;
  icon?: string;
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
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function attachNeoliaMeta(description: string | undefined, meta: NeoliaMeta): string {
  const clean = stripNeoliaMeta(description);
  const metaBlock = `${META_START}${JSON.stringify(meta)}${META_END}`;
  return clean ? `${clean}\n\n${metaBlock}` : metaBlock;
}

/* =========================
   ICON MAPPING
   ========================= */

const ICON_MAPPING: Record<string, string> = {
  clock: "Clock",
  timer: "Timer",
  calendar: "Calendar",
  alarm: "Alarm",
  play: "Play",
  power: "Power",
  sparkles: "Sparkles",
  home: "Home",
  flame: "Flame",
  coffee: "Coffee",
  tv: "Tv",
};

const LUCIDE_TO_MDI: Record<string, string> = {
  Clock: "clock-outline",
  Timer: "timer-sand",
  Calendar: "calendar",
  Alarm: "alarm",
  Play: "play",
  Power: "power",
  Sparkles: "star-four-points",
  Home: "home",
  Flame: "fire",
  Coffee: "coffee",
  Tv: "television",
};

function mapMdiToLucide(mdi: string): string {
  return ICON_MAPPING[mdi.replace("mdi:", "").toLowerCase()] || "Clock";
}

function lucideToMdi(lucide: string): string {
  return `mdi:${LUCIDE_TO_MDI[lucide] || lucide.toLowerCase()}`;
}

/* =========================
   HA → Routine
   ========================= */

function haAutomationToNeoliaRoutine(entity: any, favorites: string[], existing?: NeoliaRoutine): NeoliaRoutine {
  const rawDesc = entity.attributes?.description || existing?.description;
  return {
    id: entity.entity_id,
    name: entity.attributes?.friendly_name || entity.entity_id.replace("automation.", ""),
    icon: existing?.icon || "Clock",
    description: stripNeoliaMeta(rawDesc),
    scope: "shared",
    actions: existing?.actions || [],
    schedule: existing?.schedule || { frequency: "daily", time: "00:00", daysOfWeek: [0,1,2,3,4,5,6] },
    enabled: entity.state === "on",
    order: existing?.order,
    isFavorite: favorites.includes(entity.entity_id),
    createdAt: existing?.createdAt || entity.last_changed || new Date().toISOString(),
    updatedAt: entity.last_updated || existing?.updatedAt || new Date().toISOString(),
  };
}

/* =========================
   Store
   ========================= */

export const useRoutineStore = create<RoutineStore>()(
  persist(
    (set, get) => ({
      sharedRoutines: [],
      sharedRoutineFavorites: [],
      isLoadingShared: false,

      loadSharedRoutines: async () => {
        set({ isLoadingShared: true });

        try {
          const { entities, entityRegistry, client } = useHAStore.getState();
          const favorites = get().sharedRoutineFavorites;
          const existing = get().sharedRoutines;

          const automations = entities.filter(e => {
            if (!e.entity_id.startsWith("automation.")) return false;
            const reg = entityRegistry.find(r => r.entity_id === e.entity_id) as any;
            if (reg?.hidden_by || e.attributes?.hidden) return false;
            return true;
          });

          const result: NeoliaRoutine[] = [];

          for (const entity of automations) {
            const prev = existing.find(r => r.id === entity.entity_id);
            const routine = haAutomationToNeoliaRoutine(entity, favorites, prev);

            if (client) {
              try {
                const id = entity.entity_id.replace("automation.", "");
                const res = await client.getAutomationConfig(id);
                if (res?.config && !res.notFound) {
                  const meta = extractNeoliaMeta(res.config.description);
                  if (meta?.icon) routine.icon = meta.icon;
                }
              } catch {
                /* noop */
              }
            }

            result.push(routine);
          }

          set({ sharedRoutines: result });
        } finally {
          set({ isLoadingShared: false });
        }
      },

      addRoutine: async (data) => {
        const client = useHAStore.getState().client;
        if (!client) throw new Error("Non connecté à Home Assistant");

        const id = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const description = attachNeoliaMeta(data.description, { v: 1, icon: data.icon });

        await client.createAutomation({
          id,
          alias: data.name,
          description,
          trigger: [{ platform: "time", at: data.schedule.time }],
          action: [],
        });

        const routine: NeoliaRoutine = {
          ...data,
          id: `automation.${id}`,
          description: stripNeoliaMeta(data.description),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set(s => ({ sharedRoutines: [...s.sharedRoutines, routine] }));
        setTimeout(() => get().loadSharedRoutines(), 300);
        return routine;
      },

      updateRoutine: async () => {},
      deleteRoutine: async () => {},
      toggleRoutineFavorite: () => {},
      toggleRoutineEnabled: () => {},
      reorderRoutines: () => {},
    }),
    {
      name: "neolia-routines",
      version: 4,
      partialize: s => ({ sharedRoutineFavorites: s.sharedRoutineFavorites }),
    }
  )
);
