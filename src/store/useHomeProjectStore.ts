import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface HomeLevel {
  id: string;
  name: string;
  type: "interior" | "exterior";
  order: number;
}

export interface HomeRoom {
  id: string;
  levelId: string;
  name: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface HomeProject {
  id: string;
  name: string;
  levels: HomeLevel[];
  rooms: HomeRoom[];
  createdAt: string;
  updatedAt: string;
}

interface HomeProjectStore {
  project: HomeProject | null;
  isSetupComplete: boolean;
  currentWizardStep: number;
  
  // Actions
  setProject: (project: HomeProject) => void;
  updateProject: (updates: Partial<HomeProject>) => void;
  addLevel: (level: Omit<HomeLevel, "id">) => string;
  updateLevel: (id: string, updates: Partial<HomeLevel>) => void;
  removeLevel: (id: string) => void;
  reorderLevels: (levels: HomeLevel[]) => void;
  addRoom: (room: Omit<HomeRoom, "id">) => string;
  updateRoom: (id: string, updates: Partial<HomeRoom>) => void;
  removeRoom: (id: string) => void;
  setWizardStep: (step: number) => void;
  completeSetup: () => void;
  resetProject: () => void;
}

export const useHomeProjectStore = create<HomeProjectStore>()(
  persist(
    (set, get) => ({
      project: null,
      isSetupComplete: false,
      currentWizardStep: 0,

      setProject: (project) => set({ project }),

      updateProject: (updates) =>
        set((state) => ({
          project: state.project
            ? { ...state.project, ...updates, updatedAt: new Date().toISOString() }
            : null,
        })),

      addLevel: (level) => {
        const id = crypto.randomUUID();
        const newLevel = { ...level, id };
        set((state) => ({
          project: state.project
            ? {
                ...state.project,
                levels: [...state.project.levels, newLevel],
                updatedAt: new Date().toISOString(),
              }
            : null,
        }));
        return id;
      },

      updateLevel: (id, updates) =>
        set((state) => ({
          project: state.project
            ? {
                ...state.project,
                levels: state.project.levels.map((l) =>
                  l.id === id ? { ...l, ...updates } : l
                ),
                updatedAt: new Date().toISOString(),
              }
            : null,
        })),

      removeLevel: (id) =>
        set((state) => ({
          project: state.project
            ? {
                ...state.project,
                levels: state.project.levels.filter((l) => l.id !== id),
                rooms: state.project.rooms.filter((r) => r.levelId !== id),
                updatedAt: new Date().toISOString(),
              }
            : null,
        })),

      reorderLevels: (levels) =>
        set((state) => ({
          project: state.project
            ? {
                ...state.project,
                levels,
                updatedAt: new Date().toISOString(),
              }
            : null,
        })),

      addRoom: (room) => {
        const id = crypto.randomUUID();
        const newRoom = { ...room, id };
        set((state) => ({
          project: state.project
            ? {
                ...state.project,
                rooms: [...state.project.rooms, newRoom],
                updatedAt: new Date().toISOString(),
              }
            : null,
        }));
        return id;
      },

      updateRoom: (id, updates) =>
        set((state) => ({
          project: state.project
            ? {
                ...state.project,
                rooms: state.project.rooms.map((r) =>
                  r.id === id ? { ...r, ...updates } : r
                ),
                updatedAt: new Date().toISOString(),
              }
            : null,
        })),

      removeRoom: (id) =>
        set((state) => ({
          project: state.project
            ? {
                ...state.project,
                rooms: state.project.rooms.filter((r) => r.id !== id),
                updatedAt: new Date().toISOString(),
              }
            : null,
        })),

      setWizardStep: (step) => set({ currentWizardStep: step }),

      completeSetup: () => set({ isSetupComplete: true, currentWizardStep: 0 }),

      resetProject: () =>
        set({ project: null, isSetupComplete: false, currentWizardStep: 0 }),
    }),
    {
      name: "home-project-storage",
    }
  )
);
