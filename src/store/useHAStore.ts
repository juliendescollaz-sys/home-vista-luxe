import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HAConnection, HAEntity, HAArea, HAFloor, HADevice } from "@/types/homeassistant";
import type { HAClient } from "@/lib/haClient";

interface EntityRegistry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  platform: string;
}

interface HAStore {
  connection: HAConnection | null;
  client: HAClient | null;
  entities: HAEntity[];
  entityRegistry: EntityRegistry[];
  areas: HAArea[];
  floors: HAFloor[];
  devices: HADevice[];
  favorites: string[];
  isConnected: boolean;
  areaPhotos: Record<string, string>;
  areaOrder: string[];
  weatherEntity: string | null;
  selectedCity: { label: string; lat: number; lon: number } | null;
  
  setConnection: (connection: HAConnection) => void;
  setClient: (client: HAClient | null) => void;
  setEntities: (entities: HAEntity[]) => void;
  setEntityRegistry: (registry: EntityRegistry[]) => void;
  setAreas: (areas: HAArea[]) => void;
  setFloors: (floors: HAFloor[]) => void;
  setDevices: (devices: HADevice[]) => void;
  toggleFavorite: (entityId: string) => void;
  setConnected: (connected: boolean) => void;
  setAreaPhoto: (areaId: string, photoUrl: string) => void;
  setAreaOrder: (order: string[]) => void;
  setWeatherEntity: (entityId: string | null) => void;
  setSelectedCity: (city: { label: string; lat: number; lon: number } | null) => void;
  disconnect: () => void;
}

export const useHAStore = create<HAStore>()(
  persist(
    (set) => ({
      connection: null,
      client: null,
      entities: [],
      entityRegistry: [],
      areas: [],
      floors: [],
      devices: [],
      favorites: [],
      isConnected: false,
      areaPhotos: {},
      areaOrder: [],
      weatherEntity: null,
      selectedCity: null,

      setConnection: (connection) => set({ connection }),
      setClient: (client) => set({ client }),
      setEntities: (entities) => set({ entities }),
      setEntityRegistry: (registry) => set({ entityRegistry: registry }),
      setAreas: (areas) => set({ areas }),
      setFloors: (floors) => set({ floors }),
      setDevices: (devices) => set({ devices }),
      setConnected: (isConnected) => set({ isConnected }),
      
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

      setAreaOrder: (order) => set({ areaOrder: order }),

      setWeatherEntity: (entityId) => set({ weatherEntity: entityId }),

      setSelectedCity: (city) => set({ selectedCity: city }),
      
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
        // Persister les favoris, les photos des pièces, l'ordre et l'entité météo
        favorites: state.favorites,
        areaPhotos: state.areaPhotos,
        areaOrder: state.areaOrder,
        weatherEntity: state.weatherEntity,
        selectedCity: state.selectedCity,
      }),
      version: 4,
    }
  )
);
