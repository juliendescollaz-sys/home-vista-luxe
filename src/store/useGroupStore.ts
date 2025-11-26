import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NeoliaGroup, HaGroupDomain } from "@/types/groups";
import {
  createOrUpdateHaGroup,
  deleteHaGroup,
  turnOnGroup,
  turnOffGroup,
  openGroup,
  closeGroup,
} from "@/services/haGroups";

interface GroupStore {
  groups: NeoliaGroup[];
  groupFavorites: string[];
  groupOrder: Record<string, string[]>;
  isSaving: boolean;
  error: string | null;

  // Actions
  syncSharedGroupsFromHA: () => Promise<void>;
  createOrUpdateGroup: (params: {
    name: string;
    domain: HaGroupDomain;
    entityIds: string[];
    isShared: boolean;
    existingId?: string;
  }) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  toggleGroup: (groupId: string, currentState: string, domain: HaGroupDomain) => Promise<void>;
  openCover: (groupId: string) => Promise<void>;
  closeCover: (groupId: string) => Promise<void>;
  toggleGroupFavorite: (groupId: string) => void;
  setGroupOrder: (contextId: string, order: string[]) => void;
  clearError: () => void;
}

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      groups: [],
      groupFavorites: [],
      groupOrder: {},
      isSaving: false,
      error: null,

      syncSharedGroupsFromHA: async () => {
        try {
          const { fetchSharedGroupsFromHA } = await import("@/services/haGroups");
          const sharedFromHA = await fetchSharedGroupsFromHA();
          const current = get().groups;
          const privateGroups = current.filter((g) => !g.isShared);
          set({ groups: [...privateGroups, ...sharedFromHA] });
        } catch (error: any) {
          console.error("Erreur sync groupes partagés:", error);
        }
      },

      createOrUpdateGroup: async (params) => {
        const { name, domain, entityIds, isShared, existingId } = params;

        // Validation
        if (!name || name.trim().length < 3) {
          set({ error: "Le nom doit contenir au moins 3 caractères" });
          return;
        }

        if (entityIds.length === 0) {
          set({ error: "Au moins une entité doit être sélectionnée" });
          return;
        }

        // Vérifier l'homogénéité du domaine
        const invalidEntities = entityIds.filter((id) => !id.startsWith(`${domain}.`));
        if (invalidEntities.length > 0) {
          set({
            error: `Toutes les entités doivent être du type ${domain}`,
          });
          return;
        }

        set({ isSaving: true, error: null });

        try {
          let newGroup: NeoliaGroup;

          if (isShared) {
            // Groupe partagé : créer dans Home Assistant
            newGroup = await createOrUpdateHaGroup({ name, domain, entityIds });
          } else {
            // Groupe privé : créer uniquement localement
            const objectId = `neolia_local_${Date.now()}`;
            newGroup = {
              id: objectId,
              name: name.trim(),
              domain,
              entityIds,
              isShared: false,
              haEntityId: undefined,
            };
          }

          set((state) => {
            // Si on met à jour un groupe existant
            if (existingId) {
              const updatedGroups = state.groups.map((g) =>
                g.id === existingId ? newGroup : g
              );
              return { groups: updatedGroups, isSaving: false };
            }

            // Sinon on ajoute un nouveau groupe
            return { groups: [...state.groups, newGroup], isSaving: false };
          });
        } catch (error: any) {
          const errorMessage = error.message || "Erreur lors de la création du groupe";
          console.error("Erreur createOrUpdateGroup:", errorMessage, error);
          set({ error: errorMessage, isSaving: false });
          throw error;
        }
      },

      removeGroup: async (groupId) => {
        set({ isSaving: true, error: null });

        const group = get().groups.find((g) => g.id === groupId);
        if (!group) {
          set({ isSaving: false });
          return;
        }

        try {
          if (group.isShared) {
            // Groupe partagé : supprimer dans HA
            await deleteHaGroup(groupId);
          }
          // Dans tous les cas, retirer du store
          set((state) => ({
            groups: state.groups.filter((g) => g.id !== groupId),
            isSaving: false,
          }));
        } catch (error: any) {
          set({ error: error.message || "Erreur lors de la suppression", isSaving: false });
          throw error;
        }
      },

      toggleGroup: async (groupId, currentState, domain) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (!group) return;

        set({ error: null });

        try {
          const isOn = currentState === "on";
          const targetState = isOn ? "off" : "on";
          
          // UI optimiste si le groupe a un haEntityId (groupe partagé)
          if (group.isShared && group.haEntityId) {
            const { useHAStore: HAStore } = await import("@/store/useHAStore");
            const haStore = HAStore.getState();
            const entities = haStore.entities;
            const setPendingAction = haStore.setPendingAction;
            const clearPendingAction = haStore.clearPendingAction;
            const setEntities = haStore.setEntities;
            
            // Marquer l'action comme en attente
            setPendingAction(group.haEntityId, targetState);
            
            // Mettre à jour immédiatement l'UI locale
            const updatedEntities = entities?.map((e) =>
              e.entity_id === group.haEntityId ? { ...e, state: targetState } : e
            ) || [];
            setEntities(updatedEntities);
            
            try {
              // Groupe partagé : utiliser l'entité group
              if (isOn) {
                await turnOffGroup(group.haEntityId, domain);
              } else {
                await turnOnGroup(group.haEntityId, domain);
              }
            } catch (error) {
              // Rollback en cas d'erreur
              clearPendingAction(group.haEntityId);
              const rolledBackEntities = entities?.map((e) =>
                e.entity_id === group.haEntityId ? { ...e, state: currentState } : e
              ) || [];
              setEntities(rolledBackEntities);
              throw error;
            }
          } else {
            // Groupe privé : contrôler directement les entités via le client HA (pas d'UI optimiste)
            const { useHAStore: HAStore } = await import("@/store/useHAStore");
            const client = HAStore.getState().client;
            if (!client) throw new Error("Client non connecté");
            
            const service = isOn ? "turn_off" : "turn_on";
            await client.callService("homeassistant", service, {}, {
              entity_id: group.entityIds,
            });
          }
        } catch (error: any) {
          set({ error: error.message || "Erreur lors du contrôle du groupe" });
          throw error;
        }
      },

      openCover: async (groupId) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (!group) return;

        set({ error: null });

        try {
          await openGroup(group.haEntityId);
        } catch (error: any) {
          set({ error: error.message || "Erreur lors de l'ouverture" });
          throw error;
        }
      },

      closeCover: async (groupId) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (!group) return;

        set({ error: null });

        try {
          await closeGroup(group.haEntityId);
        } catch (error: any) {
          set({ error: error.message || "Erreur lors de la fermeture" });
          throw error;
        }
      },

      toggleGroupFavorite: (groupId) => {
        set((state) => ({
          groupFavorites: state.groupFavorites.includes(groupId)
            ? state.groupFavorites.filter((id) => id !== groupId)
            : [...state.groupFavorites, groupId],
        }));
      },

      setGroupOrder: (contextId, order) => {
        set((state) => ({
          groupOrder: {
            ...state.groupOrder,
            [contextId]: order,
          },
        }));
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "neolia-groups",
      partialize: (state) => ({
        groups: state.groups,
        groupFavorites: state.groupFavorites,
        groupOrder: state.groupOrder,
      }),
    }
  )
);
