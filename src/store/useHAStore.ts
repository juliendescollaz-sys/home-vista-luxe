import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HAConnection, HAEntity, HAArea, HAFloor, HADevice } from "@/types/homeassistant";
import type { HAClient } from "@/lib/haClient";
import type { NeoliaFloorPlan } from "@/services/neoliaFloorPlans";
import { loadNeoliaFloorPlans } from "@/services/neoliaFloorPlans";

interface EntityRegistry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  platform: string;
}

type PendingAction = {
  targetState: string;
  timeoutId: number;
  lockUntil: number; // timestamp ms - ignore les mises à jour HA avant ce moment
};

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
  entityOrder: Record<string, string[]>;
  weatherEntity: string | null;
  selectedCity: { label: string; lat: number; lon: number } | null;
  
  // Neolia floor plans
  neoliaFloorPlans: NeoliaFloorPlan[];
  selectedFloorId: string | null;
  selectedAreaId: string | null;
  isLoadingNeoliaPlans: boolean;
  
  // Positions custom des labels de pièces sur les plans
  labelPositions: Record<string, { x: number; y: number }>;
  
  // Actions optimistes
  pendingActions: Record<string, PendingAction | undefined>;
  
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
  setEntityOrder: (contextId: string, order: string[]) => void;
  setWeatherEntity: (entityId: string | null) => void;
  setSelectedCity: (city: { label: string; lat: number; lon: number } | null) => void;
  setSelectedFloorId: (floorId: string | null) => void;
  setSelectedAreaId: (areaId: string | null) => void;
  loadNeoliaPlans: (connection: HAConnection, floors: HAFloor[]) => Promise<void>;
  setLabelPosition: (floorId: string, areaId: string, x: number, y: number) => void;
  setPendingAction: (entityId: string, targetState: string, timeoutMs?: number, lockWindowMs?: number) => void;
  clearPendingAction: (entityId: string) => void;
  disconnect: () => void;
}

export const useHAStore = create<HAStore>()(
  persist(
    (set, get) => ({
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
      entityOrder: {},
      weatherEntity: null,
      selectedCity: null,
      
      // Neolia state
      neoliaFloorPlans: [],
      selectedFloorId: null,
      selectedAreaId: null,
      isLoadingNeoliaPlans: false,
      labelPositions: {},
      
      // Actions optimistes
      pendingActions: {},

      setConnection: (connection) => set({ connection }),
      setClient: (client) => set({ client }),
      setEntities: (entities) => {
        const state = get();
        const now = Date.now();
        
        // Filtrer les entités à mettre à jour en ignorant celles en verrouillage
        const filteredEntities = entities.map((entity) => {
          const pending = state.pendingActions[entity.entity_id];
          
          // Si action en attente avec fenêtre de verrouillage active
          if (pending && now < pending.lockUntil) {
            // Ignorer la mise à jour HA, conserver l'état local optimiste
            const existingEntity = state.entities?.find((e) => e.entity_id === entity.entity_id);
            return existingEntity || entity;
          }
          
          // Sinon, vérifier si l'action est confirmée
          if (pending && entity.state === pending.targetState) {
            get().clearPendingAction(entity.entity_id);
          }
          
          return entity;
        });
        
        set({ entities: filteredEntities });
      },
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

      setEntityOrder: (contextId, order) =>
        set((state) => ({
          entityOrder: { ...state.entityOrder, [contextId]: order },
        })),

      setWeatherEntity: (entityId) => set({ weatherEntity: entityId }),

      setSelectedCity: (city) => set({ selectedCity: city }),
      
      setSelectedFloorId: (floorId) => set({ selectedFloorId: floorId }),
      
      setSelectedAreaId: (areaId) => set({ selectedAreaId: areaId }),
      
      setLabelPosition: (floorId, areaId, x, y) =>
        set((state) => {
          const key = `${floorId}:${areaId}`;
          return {
            labelPositions: {
              ...state.labelPositions,
              [key]: { x, y },
            },
          };
        }),
      
      loadNeoliaPlans: async (connection, floors) => {
        // Ne pas recharger si déjà chargé
        const state = get();
        if (state.neoliaFloorPlans.length > 0 && !state.isLoadingNeoliaPlans) {
          console.debug("[Neolia Store] Plans déjà chargés, pas de rechargement");
          return;
        }
        
        set({ isLoadingNeoliaPlans: true });
        try {
          const plans = await loadNeoliaFloorPlans(connection, floors);
          set({ 
            neoliaFloorPlans: plans,
            isLoadingNeoliaPlans: false,
            // Sélectionner le premier étage avec PNG+JSON OK
            selectedFloorId: plans.find(p => p.hasPng && p.hasJson)?.floorId || plans[0]?.floorId || null,
            selectedAreaId: null,
          });
        } catch (error) {
          console.error("[Neolia Store] Erreur lors du chargement des plans:", error);
          set({ isLoadingNeoliaPlans: false });
        }
      },
      
      setPendingAction: (entityId, targetState, timeoutMs = 5000, lockWindowMs = 400) => {
        // Nettoyer un éventuel timeout précédent
        const existing = get().pendingActions[entityId];
        if (existing) {
          window.clearTimeout(existing.timeoutId);
        }

        const lockUntil = Date.now() + lockWindowMs;

        const timeoutId = window.setTimeout(() => {
          const state = get();
          const pending = state.pendingActions[entityId];
          if (!pending) return;

          const entity = state.entities?.find((e) => e.entity_id === entityId);

          // Si après timeout l'état réel ne correspond pas à l'état cible → rollback + erreur
          if (entity && entity.state !== pending.targetState) {
            console.error("[Neolia] Action non confirmée pour", entityId);
            // Le rollback visuel se fait automatiquement via setEntities
          }

          // Dans tous les cas, on nettoie le pending
          get().clearPendingAction(entityId);
        }, timeoutMs);

        set((state) => ({
          pendingActions: {
            ...state.pendingActions,
            [entityId]: { targetState, timeoutId, lockUntil },
          },
        }));
      },

      clearPendingAction: (entityId) => {
        const pending = get().pendingActions[entityId];
        if (pending) {
          window.clearTimeout(pending.timeoutId);
        }
        set((state) => {
          const copy = { ...state.pendingActions };
          delete copy[entityId];
          return { pendingActions: copy };
        });
      },
      
      disconnect: () =>
        set({
          connection: null,
          entities: [],
          isConnected: false,
          neoliaFloorPlans: [],
          selectedFloorId: null,
          selectedAreaId: null,
          pendingActions: {},
        }),
    }),
    {
      name: "ha-storage",
      partialize: (state) => ({
        // Persister les favoris, les photos des pièces, l'ordre des entités et l'entité météo
        favorites: state.favorites,
        areaPhotos: state.areaPhotos,
        areaOrder: state.areaOrder,
        entityOrder: state.entityOrder,
        weatherEntity: state.weatherEntity,
        selectedCity: state.selectedCity,
        labelPositions: state.labelPositions,
      }),
      version: 4,
    }
  )
);
