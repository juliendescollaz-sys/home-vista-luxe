import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HAConnection, HAEntity, HAArea, HAFloor, HADevice } from "@/types/homeassistant";
import type { HAClient } from "@/lib/haClient";
import type { NeoliaFloorPlan } from "@/services/neoliaFloorPlans";
import { loadNeoliaFloorPlans } from "@/services/neoliaFloorPlans";
import { toast } from "sonner";

interface EntityRegistry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  platform: string;
}

type PendingAction = {
  startedAt: number;
  targetState: string;
  timeoutId: number;
  cooldownUntil?: number;
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
  triggerEntityToggle: (entityId: string, targetState: string, action: () => Promise<void>, onRollback?: () => void) => Promise<void>;
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
        
        entities.forEach((entity) => {
          const pending = state.pendingActions[entity.entity_id];
          
          // Vérifier si une action est en attente (pas déjà en cooldown)
          if (pending && !pending.cooldownUntil && entity.state === pending.targetState) {
            // Action confirmée par HA ! Annuler le timeout et mettre en cooldown
            console.info("[Neolia] Action confirmée par HA", {
              entityId: entity.entity_id,
              targetState: pending.targetState,
              actualState: entity.state,
              latency: now - pending.startedAt,
            });
            
            window.clearTimeout(pending.timeoutId);
            
            set((s) => ({
              pendingActions: {
                ...s.pendingActions,
                [entity.entity_id]: {
                  ...pending,
                  cooldownUntil: now + 50,
                },
              },
            }));
            
            // Nettoyer complètement après le cooldown
            setTimeout(() => {
              get().clearPendingAction(entity.entity_id);
            }, 50);
          }
        });
        
        set({ entities });
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
      
      triggerEntityToggle: async (entityId, targetState, action, onRollback) => {
        const state = get();
        const pending = state.pendingActions[entityId];
        const now = Date.now();
        
        // Bloquer si action en cours (pas en cooldown)
        if (pending && !pending.cooldownUntil) {
          console.info("[Neolia] Action ignorée - déjà en cours pour", entityId);
          return;
        }
        
        // Bloquer si cooldown actif
        if (pending?.cooldownUntil && now < pending.cooldownUntil) {
          console.info("[Neolia] Action ignorée - cooldown actif pour", entityId);
          return;
        }
        
        // Nettoyer un éventuel ancien pending
        if (pending) {
          window.clearTimeout(pending.timeoutId);
        }
        
        console.info("[Neolia] Démarrage action toggle", { entityId, targetState });
        
        // Créer le timeout de 2s - ne s'applique QUE si la commande est partie correctement
        const timeoutId = window.setTimeout(() => {
          const currentState = get();
          const currentPending = currentState.pendingActions[entityId];
          if (!currentPending) return;
          
          const entity = currentState.entities?.find((e) => e.entity_id === entityId);
          
          // Si après 2s l'état réel ne correspond pas à l'état cible → rollback
          if (entity && entity.state !== currentPending.targetState) {
            console.error("[Neolia] Timeout - pas de confirmation HA pour", entityId, {
              expectedState: currentPending.targetState,
              actualState: entity.state,
            });
            onRollback?.();
            toast.error("L'appareil ne répond pas (timeout)");
          } else {
            console.info("[Neolia] Timeout atteint mais état correct pour", entityId);
          }
          
          get().clearPendingAction(entityId);
        }, 2000);
        
        // Enregistrer l'action pending
        set((s) => ({
          pendingActions: {
            ...s.pendingActions,
            [entityId]: {
              startedAt: now,
              targetState,
              timeoutId,
            },
          },
        }));
        
        // Exécuter l'action
        try {
          await action();
          console.info("[Neolia] Commande envoyée avec succès pour", entityId, "- attente confirmation HA...");
        } catch (error) {
          // Erreur immédiate (WebSocket déconnecté, CORS, etc.)
          // → Annuler le timeout et rollback immédiat
          console.error("[Neolia] Erreur immédiate lors de l'envoi de la commande:", {
            entityId,
            error: error instanceof Error ? error.message : error,
          });
          window.clearTimeout(timeoutId);
          get().clearPendingAction(entityId);
          onRollback?.();
          
          // Message d'erreur explicite selon le type d'erreur
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes("WebSocket") || errorMsg.includes("connecté")) {
            toast.error("Erreur de connexion WebSocket - vérifiez votre connexion");
          } else if (errorMsg.includes("auth") || errorMsg.includes("401")) {
            toast.error("Erreur d'authentification Home Assistant");
          } else {
            toast.error("Erreur de communication avec Home Assistant");
          }
        }
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
