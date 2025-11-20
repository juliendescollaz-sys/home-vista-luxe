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
  createOrUpdateGroup: (params: {
    name: string;
    domain: HaGroupDomain;
    entityIds: string[];
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

      createOrUpdateGroup: async (params) => {
        const { name, domain, entityIds, existingId } = params;

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
          const newGroup = await createOrUpdateHaGroup({ name, domain, entityIds });

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

        try {
          await deleteHaGroup(groupId);
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
          
          if (isOn) {
            await turnOffGroup(group.haEntityId, domain);
          } else {
            await turnOnGroup(group.haEntityId, domain);
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
