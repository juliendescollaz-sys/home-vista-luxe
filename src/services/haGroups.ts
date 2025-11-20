/**
 * Service pour la gestion des groupes Home Assistant
 */

import { useHAStore } from "@/store/useHAStore";
import type { HaGroupDomain, NeoliaGroup } from "@/types/groups";

/**
 * Helper pour obtenir le client HA
 */
function getHAClient() {
  const client = useHAStore.getState().client;
  if (!client) {
    throw new Error("Client Home Assistant non connecté");
  }
  return client;
}

/**
 * Helper générique pour appeler un service Home Assistant via WebSocket
 */
async function callHAService(
  domain: string,
  service: string,
  serviceData: Record<string, any> = {}
): Promise<any> {
  const client = getHAClient();
  
  try {
    const result = await client.callService(domain, service, serviceData);
    return result;
  } catch (error: any) {
    console.error(`Erreur lors de l'appel ${domain}.${service}:`, error);
    throw new Error(error.message || `Échec de l'appel à ${domain}.${service}`);
  }
}

/**
 * Slugifie un nom pour créer un object_id
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Crée ou met à jour un groupe dans Home Assistant
 */
export async function createOrUpdateHaGroup(params: {
  name: string;
  domain: HaGroupDomain;
  entityIds: string[];
}): Promise<NeoliaGroup> {
  const { name, domain, entityIds } = params;

  // Validation
  if (!name || name.trim().length < 3) {
    throw new Error("Le nom doit contenir au moins 3 caractères");
  }

  if (entityIds.length === 0) {
    throw new Error("Au moins une entité doit être sélectionnée");
  }

  // Vérifier que toutes les entités sont du bon domaine
  const invalidEntities = entityIds.filter((id) => !id.startsWith(`${domain}.`));
  if (invalidEntities.length > 0) {
    throw new Error(
      `Entités invalides pour le domaine ${domain}: ${invalidEntities.join(", ")}`
    );
  }

  const slug = slugify(name);
  const objectId = `neolia_${slug}`;
  const haEntityId = `group.${objectId}`;

  // Appel à l'API Home Assistant via WebSocket
  try {
    await callHAService("group", "set", {
      object_id: objectId,
      name: name.trim(),
      entities: entityIds,
    });
  } catch (error: any) {
    console.error("Erreur lors de la création du groupe:", error);
    throw new Error(
      `Impossible de créer le groupe dans Home Assistant. Vérifiez que l'intégration Group est active.`
    );
  }

  // Créer l'objet NeoliaGroup
  const group: NeoliaGroup = {
    id: objectId,
    name: name.trim(),
    domain,
    entityIds,
    haEntityId,
    isShared: true,
  };

  return group;
}

/**
 * Supprime un groupe dans Home Assistant
 */
export async function deleteHaGroup(objectId: string): Promise<void> {
  try {
    await callHAService("group", "remove", {
      object_id: objectId,
    });
  } catch (error: any) {
    console.error("Erreur lors de la suppression du groupe:", error);
    throw new Error("Impossible de supprimer le groupe");
  }
}

/**
 * Allume un groupe
 */
export async function turnOnGroup(haEntityId: string, domain: HaGroupDomain): Promise<void> {
  try {
    await callHAService(domain, "turn_on", {
      entity_id: haEntityId,
    });
  } catch (error: any) {
    console.error("Erreur lors de l'activation du groupe:", error);
    throw new Error("Impossible d'activer le groupe");
  }
}

/**
 * Éteint un groupe
 */
export async function turnOffGroup(haEntityId: string, domain: HaGroupDomain): Promise<void> {
  try {
    await callHAService(domain, "turn_off", {
      entity_id: haEntityId,
    });
  } catch (error: any) {
    console.error("Erreur lors de la désactivation du groupe:", error);
    throw new Error("Impossible de désactiver le groupe");
  }
}

/**
 * Ouvre un groupe (covers)
 */
export async function openGroup(haEntityId: string): Promise<void> {
  try {
    await callHAService("cover", "open_cover", {
      entity_id: haEntityId,
    });
  } catch (error: any) {
    console.error("Erreur lors de l'ouverture:", error);
    throw new Error("Impossible d'ouvrir les stores");
  }
}

/**
 * Ferme un groupe (covers)
 */
export async function closeGroup(haEntityId: string): Promise<void> {
  try {
    await callHAService("cover", "close_cover", {
      entity_id: haEntityId,
    });
  } catch (error: any) {
    console.error("Erreur lors de la fermeture:", error);
    throw new Error("Impossible de fermer les stores");
  }
}

/**
 * Lance la lecture d'un groupe de media players
 */
export async function playMediaGroup(entityIds: string[]): Promise<void> {
  try {
    await callHAService("media_player", "media_play", {
      entity_id: entityIds,
    });
  } catch (error: any) {
    console.error("Erreur lors de la lecture:", error);
    throw new Error("Impossible de lancer la lecture");
  }
}

/**
 * Met en pause un groupe de media players
 */
export async function pauseMediaGroup(entityIds: string[]): Promise<void> {
  try {
    await callHAService("media_player", "media_pause", {
      entity_id: entityIds,
    });
  } catch (error: any) {
    console.error("Erreur lors de la pause:", error);
    throw new Error("Impossible de mettre en pause");
  }
}

/**
 * Définit le volume d'un groupe de media players
 */
export async function setGroupVolume(entityIds: string[], volume: number): Promise<void> {
  try {
    await callHAService("media_player", "volume_set", {
      entity_id: entityIds,
      volume_level: volume,
    });
  } catch (error: any) {
    console.error("Erreur lors du réglage du volume:", error);
    throw new Error("Impossible de régler le volume");
  }
}

/**
 * Récupère tous les groupes partagés depuis Home Assistant
 * (groupes avec entity_id commençant par group.neolia_)
 */
export async function fetchSharedGroupsFromHA(): Promise<NeoliaGroup[]> {
  const client = getHAClient();
  
  try {
    const states = await client.getStates();
    
    return states
      .filter((s: any) => 
        typeof s.entity_id === "string" && 
        s.entity_id.startsWith("group.neolia_")
      )
      .map((s: any) => {
        const entityId: string = s.entity_id;
        const attrs = s.attributes || {};
        const members: string[] = attrs.entity_id || [];
        
        // Déduire le domaine à partir du premier membre
        const first = members[0] as string | undefined;
        const domain = first && first.includes(".") 
          ? (first.split(".")[0] as HaGroupDomain) 
          : "light";
        
        return {
          id: entityId.replace("group.", ""),
          name: attrs.friendly_name || entityId,
          domain,
          entityIds: members,
          haEntityId: entityId,
          isShared: true,
        } as NeoliaGroup;
      });
  } catch (error: any) {
    console.error("Erreur lors de la récupération des groupes partagés:", error);
    throw new Error("Impossible de récupérer les groupes partagés");
  }
}
