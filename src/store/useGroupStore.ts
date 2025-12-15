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

// État runtime éphémère pour chaque groupe (non persisté)
export type GroupRuntimeState = {
  isPending: boolean;
  lastError: string | null;
  timeoutId?: number | null;
};

interface GroupStore {
  groups: NeoliaGroup[];
  groupFavorites: string[];
  groupOrder: Record<string, string[]>;
  isSaving: boolean;
  error: string | null;
  
  // Runtime state (non persisté)
  runtime: Record<string, GroupRuntimeState>;

  // Actions
  syncSharedGroupsFromHA: () => Promise<void>;
  setGroupPending: (groupId: string, pending: boolean, timeoutId?: number | null) => void;
  setGroupError: (groupId: string, message: string | null) => void;
  clearGroupRuntime: (groupId: string) => void;
  createOrUpdateGroup: (params: {
    name: string;
    icon?: string;
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

const TIMEOUT_MS = 8000;

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      groups: [],
      groupFavorites: [],
      groupOrder: {},
      isSaving: false,
      error: null,
      runtime: {},

      setGroupPending: (groupId, pending, timeoutId = null) =>
        set((state) => {
          const prev = state.runtime[groupId] ?? { isPending: false, lastError: null };
          return {
            runtime: {
              ...state.runtime,
              [groupId]: { ...prev, isPending: pending, timeoutId },
            },
          };
        }),

      setGroupError: (groupId, message) =>
        set((state) => {
          const prev = state.runtime[groupId] ?? { isPending: false, lastError: null };
          return {
            runtime: {
              ...state.runtime,
              [groupId]: { ...prev, lastError: message },
            },
          };
        }),

      clearGroupRuntime: (groupId) =>
        set((state) => {
          const prev = state.runtime[groupId];
          if (prev?.timeoutId) {
            window.clearTimeout(prev.timeoutId);
          }
          const { [groupId]: _, ...rest } = state.runtime;
          return { runtime: rest };
        }),

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
        const { name, icon, domain, domains, mode, entityIds, scope, existingId } = params;
        const effectiveDomains = domains && domains.length > 0 ? domains : [domain];
        const effectiveMode: GroupMode = mode || (effectiveDomains.length > 1 ? "mixedBinary" : "singleDomain");
        
        // Dédupliquer les entityIds pour éviter les doublons
        const uniqueEntityIds = [...new Set(entityIds)];

        console.log("[GroupStore] createOrUpdateGroup called:", { name, icon, domain, domains, mode, entityIds: uniqueEntityIds, scope, existingId, effectiveMode });

        // Validation
        if (!name || name.trim().length < 3) {
          set({ error: "Le nom doit contenir au moins 3 caractères" });
          return;
        }

        if (uniqueEntityIds.length === 0) {
          set({ error: "Au moins une entité doit être sélectionnée" });
          return;
        }

        // Validation selon le mode
        if (effectiveMode === "singleDomain") {
          const targetDomain = effectiveDomains[0];
          const invalidEntities = uniqueEntityIds.filter((id) => {
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
          // Importer BINARY_CONTROLLABLE_DOMAINS depuis entityUtils
          const { BINARY_CONTROLLABLE_DOMAINS } = await import("@/lib/entityUtils");
          const invalidEntities = uniqueEntityIds.filter((id) => {
            const entityDomain = id.split(".")[0];
            return !BINARY_CONTROLLABLE_DOMAINS.includes(entityDomain);
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
          const existingGroup = existingId ? get().groups.find((g) => g.id === existingId) : null;
          const originalScope = existingGroup ? getGroupScope(existingGroup) : null;
          
          console.log("[GroupStore] Existing group:", existingGroup);
          console.log("[GroupStore] Original scope:", originalScope, "-> New scope:", scope);

          let newGroup: NeoliaGroup;

          // Cas 1: Vers "shared" (domaine unique seulement)
          if (scope === "shared" && effectiveMode === "singleDomain") {
            console.log("[GroupStore] Creating/updating shared group in HA...");
            
            try {
              newGroup = await createOrUpdateHaGroup({ name, domain, entityIds: uniqueEntityIds });
              newGroup.scope = "shared";
              newGroup.mode = "singleDomain";
              newGroup.domains = effectiveDomains;
              newGroup.icon = icon;
              console.log("[GroupStore] HA group created:", newGroup);
            } catch (haError: any) {
              console.error("[GroupStore] Failed to create HA group:", haError);
              set({ error: haError.message || "Erreur lors de la création dans Home Assistant", isSaving: false });
              throw haError;
            }
            
            // Mettre à jour le store
            set((state) => {
              const updatedGroups = existingId
                ? state.groups.map((g) => g.id === existingId ? newGroup : g)
                : [...state.groups, newGroup];
              console.log("[GroupStore] Updated groups (shared):", updatedGroups);
              return { groups: updatedGroups, isSaving: false };
            });
            return;
          }
          
          // Cas 2: Transition shared → local
          if (originalScope === "shared" && scope === "local" && existingGroup?.haEntityId) {
            console.log("[GroupStore] Transitioning shared -> local, deleting from HA...");
            try {
              await deleteHaGroup(existingGroup.id);
            } catch (e) {
              console.warn("[GroupStore] Error deleting HA group:", e);
            }
            
            const localId = `neolia_local_${Date.now()}`;
            newGroup = {
              id: localId,
              name: name.trim(),
              icon,
              domain,
              domains: effectiveDomains,
              mode: effectiveMode,
              entityIds: uniqueEntityIds,
              scope: "local",
              haEntityId: undefined,
            };
            
            set((state) => ({
              groups: state.groups.map((g) => g.id === existingId ? newGroup : g),
              isSaving: false,
            }));
            return;
          }
          
          // Cas 3: Groupe local (création ou mise à jour)
          const objectId = existingId || `neolia_local_${Date.now()}`;
          newGroup = {
            id: objectId,
            name: name.trim(),
            icon,
            domain,
            domains: effectiveDomains,
            mode: effectiveMode,
            entityIds: uniqueEntityIds,
            scope: effectiveMode === "mixedBinary" ? "local" : scope,
            haEntityId: undefined,
          };
          console.log("[GroupStore] Creating/updating local group:", newGroup);

          set((state) => {
            const updatedGroups = existingId
              ? state.groups.map((g) => g.id === existingId ? newGroup : g)
              : [...state.groups, newGroup];
            return { groups: updatedGroups, isSaving: false };
          });
        } catch (error: any) {
          const errorMessage = error.message || "Erreur lors de la création du groupe";
          console.error("[GroupStore] Error:", errorMessage, error);
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

        const { setGroupPending, setGroupError, runtime } = get();

        // Si déjà en cours, ignorer
        if (runtime[groupId]?.isPending) {
          console.log("[Neolia] toggleGroup ignored - already pending", groupId);
          return;
        }

        set({ error: null });
        setGroupError(groupId, null);

        // Timeout de sécurité
        const timeoutId = window.setTimeout(() => {
          setGroupPending(groupId, false, null);
          setGroupError(
            groupId,
            "Temps de réponse dépassé pour ce groupe. Vérifiez la connexion ou l'état des appareils."
          );
        }, TIMEOUT_MS);

        setGroupPending(groupId, true, timeoutId);

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
            // Groupe mixte binaire : direction explicite basée sur l'état actuel calculé
            const { useHAStore: HAStore } = await import("@/store/useHAStore");
            const { getControllableBinaryEntities, getMixedGroupState } = await import("@/lib/entityUtils");
            
            const haStore = HAStore.getState();
            const client = haStore.client;
            
            if (!client) {
              window.clearTimeout(timeoutId);
              setGroupPending(groupId, false, null);
              setGroupError(groupId, "Client Home Assistant non connecté.");
              throw new Error("Client non connecté");
            }
            
            // Filtrer pour ne garder que les entités vraiment contrôlables (pas les sensors)
            const allEntities = Object.values(haStore.entities);
            const controllableEntities = getControllableBinaryEntities(group.entityIds, allEntities);
            const controllableIds = controllableEntities.map((e) => e.entity_id);
            
            if (controllableIds.length === 0) {
              window.clearTimeout(timeoutId);
              setGroupPending(groupId, false, null);
              setGroupError(groupId, "Aucun appareil contrôlable trouvé pour ce groupe.");
              console.warn("[Neolia] Aucun entity_id contrôlable pour le groupe", group.id);
              return;
            }
            
            // Calcul fiable de l'état global du groupe mixte
            const currentMixedState = getMixedGroupState(group.entityIds, allEntities);
            // Si actuellement ON → on veut éteindre (turn_off), sinon on veut allumer (turn_on)
            const direction = currentMixedState === "on" ? "off" : "on";
            const service = direction === "on" ? "turn_on" : "turn_off";
            
            console.log(`[Neolia] Mixed group ${group.id} => ${direction.toUpperCase()}`, {
              currentState: currentMixedState,
              direction,
              service: `homeassistant.${service}`,
              entityIds: controllableIds,
            });
            
            // Commande générique homeassistant.turn_on/off uniquement sur les entités filtrées
            await client.callService("homeassistant", service, {}, { entity_id: controllableIds });
          } else {
            // Groupe privé domaine unique : gérer manuellement toutes les entités membres
            const { useHAStore: HAStore } = await import("@/store/useHAStore");
            const client = HAStore.getState().client;
            
            if (!client) {
              window.clearTimeout(timeoutId);
              setGroupPending(groupId, false, null);
              setGroupError(groupId, "Client Home Assistant non connecté.");
              throw new Error("Client non connecté");
            }
            
            const service = isOn ? "turn_off" : "turn_on";
            
            for (const entityId of group.entityIds) {
              const entityDomain = entityId.split(".")[0];
              await client.callService(entityDomain, service, {}, { entity_id: entityId });
            }
          }

          // Succès immédiat (pas d'attente state_changed)
          window.clearTimeout(timeoutId);
          setGroupPending(groupId, false, null);
        } catch (error: any) {
          window.clearTimeout(timeoutId);
          setGroupPending(groupId, false, null);
          const errorMsg = error.message || "Erreur lors de l'envoi de la commande au groupe.";
          setGroupError(groupId, errorMsg);
          console.error("Erreur toggleGroup:", error);
          set({ error: errorMsg });
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
