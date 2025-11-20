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
