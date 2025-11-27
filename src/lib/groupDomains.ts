/**
 * Configuration centralisée des domaines pour les groupes
 */
import { Lightbulb, Blinds, Power, Fan, Music, Thermometer, Lock, Droplet } from "lucide-react";
import type { HAEntity, HAArea, HAFloor, HADevice } from "@/types/homeassistant";

export interface GroupDomainConfig {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isBinary: boolean; // true si l'appareil fonctionne en ON/OFF
}

/**
 * Liste des domaines supportés pour les groupes
 * isBinary = true signifie que le domaine peut être groupé avec d'autres domaines binaires
 */
export const GROUP_DOMAIN_CONFIGS: GroupDomainConfig[] = [
  { value: "light", label: "Éclairages", icon: Lightbulb, isBinary: true },
  { value: "switch", label: "Interrupteurs", icon: Power, isBinary: true },
  { value: "cover", label: "Stores / Volets", icon: Blinds, isBinary: false },
  { value: "fan", label: "Ventilateurs", icon: Fan, isBinary: true },
  { value: "valve", label: "Vannes", icon: Droplet, isBinary: true },
  { value: "media_player", label: "Lecteurs média", icon: Music, isBinary: false },
  { value: "climate", label: "Climatisation", icon: Thermometer, isBinary: false },
  { value: "lock", label: "Serrures", icon: Lock, isBinary: false },
];

/**
 * Récupère la config d'un domaine
 */
export function getDomainConfig(domain: string): GroupDomainConfig | undefined {
  return GROUP_DOMAIN_CONFIGS.find((c) => c.value === domain);
}

/**
 * Filtre les domaines pour ne garder que ceux qui ont au moins une entité
 */
export function getAvailableDomains(entities: HAEntity[]): GroupDomainConfig[] {
  const existingDomains = new Set<string>();
  
  for (const entity of entities) {
    const domain = entity.entity_id.split(".")[0];
    existingDomains.add(domain);
  }
  
  return GROUP_DOMAIN_CONFIGS.filter((config) => existingDomains.has(config.value));
}

/**
 * Vérifie si tous les domaines sélectionnés sont binaires (pour les groupes mixtes)
 */
export function areAllDomainsBinary(domains: string[]): boolean {
  return domains.every((d) => {
    const config = getDomainConfig(d);
    return config?.isBinary ?? false;
  });
}

/**
 * Liste des domaines binaires uniquement
 */
export function getBinaryDomains(): GroupDomainConfig[] {
  return GROUP_DOMAIN_CONFIGS.filter((c) => c.isBinary);
}

/**
 * Info enrichie d'un appareil pour l'affichage dans le wizard
 */
export interface DeviceDisplayInfo {
  entityId: string;
  friendlyName: string;
  floorName: string | null;
  areaName: string | null;
  domain: string;
}

interface EntityRegistry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  platform: string;
  entity_category?: string;
  hidden_by?: string;
  disabled_by?: string;
}

/**
 * Vérifie si une entité est contrôlable et principale (pas diagnostic/config/mesure)
 */
function isControllablePrimaryEntity(
  entity: HAEntity,
  reg?: EntityRegistry
): boolean {
  const domain = entity.entity_id.split(".")[0];

  // 1) Domaine contrôlable (actuateurs)
  const controllableDomains = ["light", "switch", "cover", "fan", "valve", "climate", "media_player", "lock"];
  if (!controllableDomains.includes(domain)) return false;

  // 2) Ne pas filtrer les actuateurs sur entity_category
  // On ne filtre entity_category que pour les domaines techniques (sensor, binary_sensor, etc.)
  // Les actuateurs comme light, switch, cover restent visibles même s'ils ont entity_category = "config"
  
  // 3) Entité cachée ou désactivée = exclure
  if (reg?.hidden_by) return false;
  if (reg?.disabled_by) return false;

  // 4) Exclure les mesures (power, energy, temperature, etc.) basé sur le nom
  const lowerName = (entity.attributes?.friendly_name || entity.entity_id).toLowerCase();
  const measureKeywords = [
    "power", "énergie", "energy", "consommation", "puissance",
    "température", "temperature", "voltage", "current", "courant",
    "watt", "kwh", "ampere"
  ];
  if (measureKeywords.some((kw) => lowerName.includes(kw))) return false;

  return true;
}

/**
 * Filtre les entités pour gérer les double-modules (multi-canaux)
 * Garde les canaux individuels, ignore l'entité "maître" si des canaux existent
 */
function filterDoubleModuleEntities(
  entities: HAEntity[],
  entityRegistry: EntityRegistry[]
): HAEntity[] {
  // Regrouper par device_id
  const byDevice = new Map<string, HAEntity[]>();

  for (const e of entities) {
    const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
    const deviceId = reg?.device_id || "__no_device__";
    if (!byDevice.has(deviceId)) byDevice.set(deviceId, []);
    byDevice.get(deviceId)!.push(e);
  }

  const result: HAEntity[] = [];

  for (const [deviceId, deviceEntities] of byDevice.entries()) {
    if (deviceId === "__no_device__") {
      // Pas de device_id, on garde tout
      result.push(...deviceEntities);
      continue;
    }

    // Détecter les entités "canal" (patterns: _1, _2, _channel_1, _ch1, etc.)
    const channelPattern = /(_channel_?\d+|_ch\d+|_[1-4])$/i;
    const channelEntities = deviceEntities.filter((e) => channelPattern.test(e.entity_id));

    if (channelEntities.length > 1) {
      // Multi-canal détecté : garder uniquement les canaux individuels
      result.push(...channelEntities);
    } else {
      // Pas de multi-canal ou un seul canal : garder tout
      result.push(...deviceEntities);
    }
  }

  return result;
}

/**
 * Enrichit une entité avec les infos de localisation (étage, pièce)
 */
export function getDeviceDisplayInfo(
  entity: HAEntity,
  entityRegistry: EntityRegistry[],
  devices: HADevice[],
  areas: HAArea[],
  floors: HAFloor[]
): DeviceDisplayInfo {
  const domain = entity.entity_id.split(".")[0];
  const friendlyName = entity.attributes.friendly_name || entity.entity_id;
  
  // Trouver l'area via le registry ou le device
  const reg = entityRegistry.find((r) => r.entity_id === entity.entity_id);
  let areaId = reg?.area_id;
  
  // Si pas d'area directe, chercher via le device
  if (!areaId && reg?.device_id) {
    const device = devices.find((d) => d.id === reg.device_id);
    areaId = device?.area_id;
  }
  
  const area = areaId ? areas.find((a) => a.area_id === areaId) : null;
  const floor = area?.floor_id ? floors.find((f) => f.floor_id === area.floor_id) : null;
  
  return {
    entityId: entity.entity_id,
    friendlyName,
    floorName: floor?.name || null,
    areaName: area?.name || null,
    domain,
  };
}

/**
 * Filtre les entités par domaines et retourne les infos d'affichage
 * Applique le filtrage des entités contrôlables et la gestion des double-modules
 */
export function getEntitiesForDomains(
  entities: HAEntity[],
  domains: string[],
  entityRegistry: EntityRegistry[],
  devices: HADevice[],
  areas: HAArea[],
  floors: HAFloor[]
): DeviceDisplayInfo[] {
  // 1) Filtrer par domaines sélectionnés
  const domainFiltered = entities.filter((e) => {
    const domain = e.entity_id.split(".")[0];
    return domains.includes(domain);
  });

  // 2) Filtrer les entités contrôlables principales (pas diagnostic/config/mesures)
  const controllableFiltered = domainFiltered.filter((e) => {
    const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
    return isControllablePrimaryEntity(e, reg);
  });

  // 3) Gérer les double-modules (garder canaux individuels, ignorer maître)
  const finalFiltered = filterDoubleModuleEntities(controllableFiltered, entityRegistry);

  // 4) Enrichir avec infos de localisation et trier
  return finalFiltered
    .map((e) => getDeviceDisplayInfo(e, entityRegistry, devices, areas, floors))
    .sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));
}
