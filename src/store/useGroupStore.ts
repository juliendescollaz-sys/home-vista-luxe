import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NeoliaGroup, HaGroupDomain, GroupScope, GroupMode } from "@/types/groups";
import { getGroupScope, getGroupMode } from "@/types/groups";
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
    domains?: string[];
    mode?: GroupMode;
    entityIds: string[];
    scope: GroupScope;
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
          const privateGroups = current.filter((g) => getGroupScope(g) === "local");
          set({ groups: [...privateGroups, ...sharedFromHA] });
        } catch (error: any) {
          console.error("Erreur sync groupes partagés:", error);
        }
      },

      createOrUpdateGroup: async (params) => {
        const { name, domain, domains, mode, entityIds, scope, existingId } = params;
        const effectiveDomains = domains && domains.length > 0 ? domains : [domain];
        const effectiveMode: GroupMode = mode || (effectiveDomains.length > 1 ? "mixedBinary" : "singleDomain");

        // Validation
        if (!name || name.trim().length < 3) {
          set({ error: "Le nom doit contenir au moins 3 caractères" });
          return;
        }

        if (entityIds.length === 0) {
          set({ error: "Au moins une entité doit être sélectionnée" });
          return;
        }

        // Validation selon le mode
        if (effectiveMode === "singleDomain") {
          // Mode domaine unique : toutes les entités doivent être du même domaine
          const targetDomain = effectiveDomains[0];
          const invalidEntities = entityIds.filter((id) => {
            const entityDomain = id.split(".")[0];
            return entityDomain !== targetDomain;
          });
          if (invalidEntities.length > 0) {
            set({
              error: `Entités invalides pour le domaine ${targetDomain}: ${invalidEntities.join(", ")}`,
            });
            return;
          }
        } else {
          // Mode mixte binaire : vérifier que tous les domaines des entités sont binaires
          const binaryDomains = ["light", "switch", "valve", "fan"];
          const invalidEntities = entityIds.filter((id) => {
            const entityDomain = id.split(".")[0];
            return !binaryDomains.includes(entityDomain);
          });
          if (invalidEntities.length > 0) {
            set({
              error: `Les groupes mixtes ne peuvent contenir que des appareils binaires (ON/OFF). Entités invalides: ${invalidEntities.join(", ")}`,
            });
            return;
          }
        }

        set({ isSaving: true, error: null });

        try {
          // Récupérer le groupe existant pour détecter les transitions de scope
          const existingGroup = existingId ? get().groups.find((g) => g.id === existingId) : null;
          const originalScope = existingGroup ? getGroupScope(existingGroup) : null;
          
          let newGroup: NeoliaGroup;

          // Cas 1: Création ou mise à jour vers "shared" (domaine unique seulement)
          if (scope === "shared" && effectiveMode === "singleDomain") {
            // Si transition local → shared, supprimer l'ancienne entrée locale
            if (originalScope === "local" && existingGroup?.haEntityId) {
              // L'ancien groupe n'avait pas de haEntityId, on crée dans HA
            }
            
            // Créer/mettre à jour dans Home Assistant
            newGroup = await createOrUpdateHaGroup({ name, domain, entityIds });
            newGroup.scope = "shared";
            newGroup.mode = "singleDomain";
            newGroup.domains = effectiveDomains;
            
            // Si c'était une mise à jour depuis local, on remplace l'entrée
            if (existingId && originalScope === "local") {
              set((state) => ({
                groups: state.groups.map((g) =>
                  g.id === existingId ? newGroup : g
                ),
                isSaving: false,
              }));
              return;
            }
          } 
          // Cas 2: Transition shared → local
          else if (originalScope === "shared" && scope === "local" && existingGroup?.haEntityId) {
            // Supprimer le groupe de Home Assistant
            try {
              await deleteHaGroup(existingGroup.id);
            } catch (e) {
              console.warn("Erreur lors de la suppression du groupe HA:", e);
            }
            
            // Créer une version locale
            const localId = `neolia_local_${Date.now()}`;
            newGroup = {
              id: localId,
              name: name.trim(),
              domain,
              domains: effectiveDomains,
              mode: effectiveMode,
              entityIds,
              scope: "local",
              haEntityId: undefined,
            };
            
            // Remplacer l'ancien groupe partagé par le nouveau local
            set((state) => ({
              groups: state.groups.map((g) =>
                g.id === existingId ? newGroup : g
              ),
              isSaving: false,
            }));
            return;
          }
          // Cas 3: Groupe local/mixte (création ou mise à jour sans changement de scope)
          else {
            const objectId = existingId || `neolia_local_${Date.now()}`;
            newGroup = {
              id: objectId,
              name: name.trim(),
              domain,
              domains: effectiveDomains,
              mode: effectiveMode,
              entityIds,
              scope: effectiveMode === "mixedBinary" ? "local" : scope,
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
          if (getGroupScope(group) === "shared") {
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
          const scope = getGroupScope(group);
          const mode = getGroupMode(group);
          
          // Groupe partagé domaine unique : utiliser triggerEntityToggle via HA
          if (scope === "shared" && group.haEntityId && mode === "singleDomain") {
            const { useHAStore: HAStore } = await import("@/store/useHAStore");
            const haStore = HAStore.getState();
            
            await haStore.triggerEntityToggle(
              group.haEntityId,
              targetState,
              async () => {
                if (isOn) {
                  await turnOffGroup(group.haEntityId!, domain);
                } else {
                  await turnOnGroup(group.haEntityId!, domain);
                }
              }
            );
          } else if (mode === "mixedBinary") {
            // Groupe mixte binaire : utiliser homeassistant.turn_on/off sur toutes les entités
            const { useHAStore: HAStore } = await import("@/store/useHAStore");
            const client = HAStore.getState().client;
            
            if (!client) {
              throw new Error("Client non connecté");
            }
            
            const service = isOn ? "turn_off" : "turn_on";
            // Commande générique homeassistant.turn_on/off pour tous les domaines
            await client.callService("homeassistant", service, {}, { entity_id: group.entityIds });
          } else {
            // Groupe privé domaine unique : gérer manuellement toutes les entités membres
            const { useHAStore: HAStore } = await import("@/store/useHAStore");
            const client = HAStore.getState().client;
            
            if (!client) {
              throw new Error("Client non connecté");
            }
            
            const service = isOn ? "turn_off" : "turn_on";
            
            for (const entityId of group.entityIds) {
              const entityDomain = entityId.split(".")[0];
              await client.callService(entityDomain, service, {}, { entity_id: entityId });
            }
          }
        } catch (error: any) {
          console.error("Erreur toggleGroup:", error);
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
