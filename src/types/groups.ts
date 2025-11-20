/**
 * Types pour la gestion des groupes d'appareils
 */

export type HaGroupDomain = "light" | "cover" | "switch" | "fan" | "media_player";

export interface NeoliaGroup {
  id: string;
  name: string;
  domain: HaGroupDomain;
  entityIds: string[];
  haEntityId: string; // ex: group.neolia_salon
}

export interface GroupWizardState {
  step: number;
  domain?: HaGroupDomain;
  name: string;
  selectedEntityIds: string[];
}
