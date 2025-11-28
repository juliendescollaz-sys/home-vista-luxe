// src/utils/sceneDevices.ts

const ALLOWED_DOMAINS = [
  "light",
  "switch",
  "media_player",
  "cover",
  "fan",
  "climate",
  "lock",
  "remote",
];

const BLOCKED_KEYWORDS = [
  "crossfade",
  "caisson",
  "sub",
  "subwoofer",
  "bass",
  "treble",
  "surround",
  "dialog",
  "dialogue",
  "night",
  "mode_nuit",
  "touch",
  "controls",
  "control",
  "enhancement",
  "enhancer",
  "loudness",
  "lumiere d'etat",
  "lumière d'état",
  "state_light",
  "status_light",
  "status light",
];

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
  name?: string;
}

export interface DeviceRegistryEntry {
  id: string;
  area_id?: string;
}

/**
 * Retourne true si l'entité peut être utilisée dans une scène.
 */
export function isSceneEligibleEntity(
  entityId: string,
  friendlyName: string,
): boolean {
  const domain = entityId.split(".")[0];
  const id = entityId.toLowerCase();
  const name = (friendlyName || "").toLowerCase();

  // 1) Domaine autorisé uniquement
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return false;
  }

  // 2) Mots-clés à bannir (options Sonos & co)
  for (const kw of BLOCKED_KEYWORDS) {
    if (id.includes(kw) || name.includes(kw)) {
      return false;
    }
  }

  return true;
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
