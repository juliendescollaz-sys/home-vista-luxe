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
 */
export function getEntitiesForDomains(
  entities: HAEntity[],
  domains: string[],
  entityRegistry: EntityRegistry[],
  devices: HADevice[],
  areas: HAArea[],
  floors: HAFloor[]
): DeviceDisplayInfo[] {
  return entities
    .filter((e) => {
      const domain = e.entity_id.split(".")[0];
      return domains.includes(domain);
    })
    .map((e) => getDeviceDisplayInfo(e, entityRegistry, devices, areas, floors))
    .sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));
}
