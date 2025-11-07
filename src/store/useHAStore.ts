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
        connection: state.connection,
        favorites: state.favorites,
      }),
      // Add version and migration for safety
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Reset if version mismatch or invalid data
        if (version !== 1 || !persistedState) {
          return {
            connection: null,
            favorites: [],
          };
        }
        return persistedState;
      },
      // Handle storage errors gracefully
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Failed to rehydrate store:', error);
            // Clear corrupted storage
            localStorage.removeItem('ha-storage');
          }
        };
      },
    }
  )
);
