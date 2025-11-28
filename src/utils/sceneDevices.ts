// src/utils/sceneDevices.ts
// Réutilise la logique centralisée de isControllableEntity pour garantir
// la cohérence avec Appareils actifs, Groupes, et page Maison.

import { isControllableEntity, EntityRegistryEntry as BaseEntityRegistryEntry } from "@/lib/entityUtils";
import type { HAEntity } from "@/types/homeassistant";

export interface NeoliaRoom {
  area_id: string;
  name: string;
  floor_id?: string;
}

export interface NeoliaFloor {
  floor_id: string;
  name: string;
}

export interface EntityRegistryEntry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  original_name?: string;
  hidden_by?: string;
  disabled_by?: string;
  entity_category?: string;
  name?: string;
}

export interface DeviceRegistryEntry {
  id: string;
  area_id?: string;
}

/**
 * Retourne true si l'entité peut être utilisée dans une scène.
 * Réutilise isControllableEntity pour garantir la cohérence avec
 * Appareils actifs, Groupes, et page Maison.
 */
export function isSceneEligibleEntity(
  entityId: string,
  friendlyName: string,
  registryEntry?: EntityRegistryEntry,
): boolean {
  // Construire un objet HAEntity minimal pour isControllableEntity
  const fakeEntity: HAEntity = {
    entity_id: entityId,
    state: "unknown",
    attributes: {
      friendly_name: friendlyName,
    },
  };

  // Convertir le registryEntry au format attendu par isControllableEntity
  const reg: BaseEntityRegistryEntry | null = registryEntry
    ? {
        entity_id: registryEntry.entity_id,
        device_id: registryEntry.device_id,
        area_id: registryEntry.area_id,
        disabled_by: registryEntry.disabled_by || null,
        hidden_by: registryEntry.hidden_by || null,
        entity_category: (registryEntry.entity_category as "diagnostic" | "config" | null) || null,
      }
    : null;

  return isControllableEntity(fakeEntity, reg);
}

/**
 * Récupère [pièce, étage] à partir des registres et de la topologie Neolia.
 */
export function getRoomAndFloorForEntity(
  entityId: string,
  entityRegistry: Record<string, EntityRegistryEntry>,
  devices: DeviceRegistryEntry[],
  areas: NeoliaRoom[],
  floors: NeoliaFloor[],
): { roomName?: string; floorName?: string } {
  const registry = entityRegistry[entityId];
  const device = devices.find((d) => d.id === registry?.device_id);
  const areaId = registry?.area_id || device?.area_id;

  if (!areaId) {
    return {};
  }

  const area = areas.find((a) => a.area_id === areaId);
  if (!area) {
    return {};
  }

  const floor = area.floor_id 
    ? floors.find((f) => f.floor_id === area.floor_id) 
    : undefined;

  return {
    roomName: area.name,
    floorName: floor?.name,
  };
}
