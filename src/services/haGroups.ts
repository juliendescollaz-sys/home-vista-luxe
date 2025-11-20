/**
 * Service pour la gestion des groupes Home Assistant
 */

import { getHaConfig } from "./haConfig";
import type { HaGroupDomain, NeoliaGroup } from "@/types/groups";

/**
 * Helper générique pour appeler un service Home Assistant
 */
async function callHAService(
  domain: string,
  service: string,
  data: Record<string, any>
): Promise<any> {
  const config = await getHaConfig();
  if (!config) {
    throw new Error("Configuration Home Assistant introuvable");
  }

  const response = await fetch(`${config.localHaUrl}/api/services/${domain}/${service}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur HA (${response.status}): ${errorText}`);
  }

  return response.json();
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

  // Appel à l'API Home Assistant
  await callHAService("group", "set", {
    object_id: objectId,
    name: name.trim(),
    entities: entityIds,
  });

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
  await callHAService("group", "remove", {
    object_id: objectId,
  });
}

/**
 * Allume un groupe
 */
export async function turnOnGroup(haEntityId: string, domain: HaGroupDomain): Promise<void> {
  await callHAService(domain, "turn_on", {
    entity_id: haEntityId,
  });
}

/**
 * Éteint un groupe
 */
export async function turnOffGroup(haEntityId: string, domain: HaGroupDomain): Promise<void> {
  await callHAService(domain, "turn_off", {
    entity_id: haEntityId,
  });
}

/**
 * Ouvre un groupe (covers)
 */
export async function openGroup(haEntityId: string): Promise<void> {
  await callHAService("cover", "open_cover", {
    entity_id: haEntityId,
  });
}

/**
 * Ferme un groupe (covers)
 */
export async function closeGroup(haEntityId: string): Promise<void> {
  await callHAService("cover", "close_cover", {
    entity_id: haEntityId,
  });
}
