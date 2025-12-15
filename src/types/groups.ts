/**
 * Types pour la gestion des groupes d'appareils
 */

// Domaines binaires supportés pour les groupes mixtes
export type HaGroupDomain = "light" | "cover" | "switch" | "fan" | "media_player" | "valve" | "climate" | "lock";

export type GroupScope = "local" | "shared";

// Mode du groupe : domaine unique ou mixte binaire
export type GroupMode = "singleDomain" | "mixedBinary";

export interface NeoliaGroup {
  id: string;
  name: string;
  icon?: string; // Icône Lucide (ex: "Lightbulb", "Blinds")
  domain: HaGroupDomain; // Domaine principal (pour compat legacy)
  domains?: string[]; // Liste des domaines si groupe mixte
  mode?: GroupMode; // "singleDomain" ou "mixedBinary" (default: singleDomain pour compat)
  entityIds: string[];
  haEntityId?: string; // ex: group.neolia_salon (seulement pour les groupes partagés)
  scope: GroupScope; // "local" = utilisé uniquement dans l'app locale
                     // "shared" = groupe partagé pour tous les utilisateurs
  
  // Compat legacy: si isShared existe, on le convertit en scope
  isShared?: boolean;
}

export interface GroupWizardState {
  step: number;
  domains: string[]; // Support multi-domaines
  name: string;
  selectedEntityIds: string[];
  isMixedMode: boolean; // Mode groupe mixte binaire
}

/**
 * Helper pour obtenir le scope depuis un groupe (gère la migration isShared → scope)
 */
export function getGroupScope(group: NeoliaGroup): GroupScope {
  if (group.scope) return group.scope;
  // Migration legacy
  return group.isShared ? "shared" : "local";
}

/**
 * Helper pour obtenir les domaines d'un groupe (gère la migration domain → domains)
 */
export function getGroupDomains(group: NeoliaGroup): string[] {
  if (group.domains && group.domains.length > 0) return group.domains;
  return [group.domain];
}

/**
 * Helper pour obtenir le mode d'un groupe (gère la migration vers mode)
 */
export function getGroupMode(group: NeoliaGroup): GroupMode {
  if (group.mode) return group.mode;
  // Legacy: si domains > 1, c'est mixedBinary, sinon singleDomain
  if (group.domains && group.domains.length > 1) return "mixedBinary";
  return "singleDomain";
}
