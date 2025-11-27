/**
 * Types pour la gestion des groupes d'appareils
 */

export type HaGroupDomain = "light" | "cover" | "switch" | "fan" | "media_player";

export type GroupScope = "local" | "shared";

export interface NeoliaGroup {
  id: string;
  name: string;
  domain: HaGroupDomain;
  entityIds: string[];
  haEntityId?: string; // ex: group.neolia_salon (seulement pour les groupes partagés)
  scope: GroupScope; // "local" = utilisé uniquement dans l'app locale
                     // "shared" = groupe partagé pour tous les utilisateurs
  
  // Compat legacy: si isShared existe, on le convertit en scope
  isShared?: boolean;
}

export interface GroupWizardState {
  step: number;
  domain?: HaGroupDomain;
  name: string;
  selectedEntityIds: string[];
}

/**
 * Helper pour obtenir le scope depuis un groupe (gère la migration isShared → scope)
 */
export function getGroupScope(group: NeoliaGroup): GroupScope {
  if (group.scope) return group.scope;
  // Migration legacy
  return group.isShared ? "shared" : "local";
}
