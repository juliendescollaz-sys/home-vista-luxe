import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HAConnection, HAEntity, HAArea, HAFloor } from "@/types/homeassistant";

interface HAStore {
  connection: HAConnection | null;
  entities: HAEntity[];
  areas: HAArea[];
  floors: HAFloor[];
  favorites: string[];
  isConnected: boolean;
  
  setConnection: (connection: HAConnection) => void;
  setEntities: (entities: HAEntity[]) => void;
  setAreas: (areas: HAArea[]) => void;
  setFloors: (floors: HAFloor[]) => void;
  toggleFavorite: (entityId: string) => void;
  setConnected: (connected: boolean) => void;
  disconnect: () => void;
}

export const useHAStore = create<HAStore>()(
  persist(
    (set) => ({
      connection: null,
      entities: [],
      areas: [],
      floors: [],
      favorites: [],
      isConnected: false,

      setConnection: (connection) => set({ connection }),
      setEntities: (entities) => set({ entities }),
      setAreas: (areas) => set({ areas }),
      setFloors: (floors) => set({ floors }),
      setConnected: (isConnected) => set({ isConnected }),
      
      toggleFavorite: (entityId) =>
        set((state) => ({
          favorites: state.favorites.includes(entityId)
            ? state.favorites.filter((id) => id !== entityId)
            : [...state.favorites, entityId],
        })),
      
      disconnect: () =>
        set({
          connection: null,
          entities: [],
          isConnected: false,
        }),
    }),
    {
      name: "ha-storage",
      partialize: (state) => ({
        // Ne persister que les favoris, pas la connexion (gérée par crypto)
        favorites: state.favorites,
      }),
      version: 1,
    }
  )
);
