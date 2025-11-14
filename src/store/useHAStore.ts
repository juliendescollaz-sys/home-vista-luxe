import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HAConnection, HAEntity, HAArea, HAFloor, HADevice } from "@/types/homeassistant";

interface EntityRegistry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  platform: string;
}

interface HAStore {
  connection: HAConnection | null;
  entities: HAEntity[];
  entityRegistry: EntityRegistry[];
  areas: HAArea[];
  floors: HAFloor[];
  devices: HADevice[];
  favorites: string[];
  areaPhotos: Record<string, string>;
  weatherEntity: string | null;
  selectedCity: { label: string; lat: number; lon: number } | null;
  
  setConnection: (connection: HAConnection) => void;
  setEntities: (entities: HAEntity[]) => void;
  setEntityRegistry: (registry: EntityRegistry[]) => void;
  setAreas: (areas: HAArea[]) => void;
  setFloors: (floors: HAFloor[]) => void;
  setDevices: (devices: HADevice[]) => void;
  toggleFavorite: (entityId: string) => void;
  setAreaPhoto: (areaId: string, photoUrl: string) => void;
  setWeatherEntity: (entityId: string | null) => void;
  setSelectedCity: (city: { label: string; lat: number; lon: number } | null) => void;
  disconnect: () => void;
}

export const useHAStore = create<HAStore>()(
  persist(
    (set) => ({
      connection: null,
      entities: [],
      entityRegistry: [],
      areas: [],
      floors: [],
      devices: [],
      favorites: [],
      areaPhotos: {},
      weatherEntity: null,
      selectedCity: null,

      setConnection: (connection) => set({ connection }),
      setEntities: (entities) => set({ entities }),
      setEntityRegistry: (registry) => set({ entityRegistry: registry }),
      setAreas: (areas) => set({ areas }),
      setFloors: (floors) => set({ floors }),
      setDevices: (devices) => set({ devices }),
      
      toggleFavorite: (entityId) =>
        set((state) => ({
          favorites: state.favorites.includes(entityId)
            ? state.favorites.filter((id) => id !== entityId)
            : [...state.favorites, entityId],
        })),
      
      setAreaPhoto: (areaId, photoUrl) =>
        set((state) => ({
          areaPhotos: { ...state.areaPhotos, [areaId]: photoUrl },
        })),

      setWeatherEntity: (entityId) => set({ weatherEntity: entityId }),

      setSelectedCity: (city) => set({ selectedCity: city }),
      
      disconnect: () =>
        set({
          connection: null,
          entities: [],
        }),
    }),
    {
      name: "ha-storage",
      partialize: (state) => ({
        // Persister les favoris, les photos des pièces et l'entité météo
        favorites: state.favorites,
        areaPhotos: state.areaPhotos,
        weatherEntity: state.weatherEntity,
        selectedCity: state.selectedCity,
      }),
      version: 4,
    }
  )
);
