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

// ============================================================================
// FILTRES SPÉCIFIQUES PAR DOMAINE
// ============================================================================

/**
 * Mots-clés bloquants pour les interrupteurs (switch)
 */
const SWITCH_BLOCKED_NAME_KEYWORDS = [
  "loudness",
  "volume",
  "brightness",
  "état",
  "state",
  "statut",
  "status",
  "power",
  "puissance",
  "energy",
  "énergie",
  "consommation",
  "current",
  "amp",
  "ampère",
  "voltage",
  "volt",
  "battery",
  "batterie",
  "signal",
  "rssi",
  "wifi"
];

/**
 * Mots-clés bloquants pour les lumières (light)
 */
const LIGHT_BLOCKED_KEYWORDS = [
  "loudness",
  "état",
  "state",
  "energy",
  "énergie",
  "consommation",
  "power",
  "puissance",
  "température",
  "temperature",
  "battery",
  "batterie"
];

/**
 * Whitelist pour les lumières mal classées par HA
 */
const LIGHT_WHITELIST = [
  "light.home_assistant_connect_zwa_2_led"
];

/**
 * Mots-clés bloquants génériques pour les autres domaines
 */
const GENERIC_BLOCKED_KEYWORDS = [
  "loudness",
  "état",
  "state",
  "energy",
  "énergie",
  "consommation",
  "power",
  "puissance",
  "température",
  "temperature",
  "battery",
  "batterie",
  "humidity",
  "humidite",
  "current",
  "amp",
  "volt",
  "signal",
  "noise"
];

/**
 * Filtre spécifique pour les interrupteurs (switch)
 * Exclut: états, loudness, feedback, helpers, mesures
 */
function isValidSwitchForGroup(entity: HAEntity, reg?: EntityRegistry): boolean {
  if (entity.entity_id.split(".")[0] !== "switch") return false;

  // 1) Pas de diagnostic / config pour les interrupteurs
  if (reg?.entity_category === "diagnostic" || reg?.entity_category === "config") {
    return false;
  }

  // 2) Entité cachée ou désactivée
  if (reg?.hidden_by || reg?.disabled_by) return false;

  // 3) Pas d'unités de mesure (switch sensor déguisé)
  if (entity.attributes?.unit_of_measurement) {
    return false;
  }

  // 4) Filtre sur le friendly_name
  const name = (entity.attributes?.friendly_name || "").toLowerCase();
  if (SWITCH_BLOCKED_NAME_KEYWORDS.some((k) => name.includes(k))) {
    return false;
  }

  // 5) Filtre sur certains suffixes d'id d'entité typiquement "état"
  if (/(_state|_status|_loudness|_level|_feedback)$/.test(entity.entity_id)) {
    return false;
  }

  // 6) On ne garde que les device_class attendus pour un switch
  const dc = entity.attributes?.device_class;
  const allowedDeviceClasses = [undefined, "switch", "outlet", "plug"];
  if (dc && !allowedDeviceClasses.includes(dc)) {
    return false;
  }

  return true;
}

/**
 * Filtre spécifique pour les lumières (light)
 * Autorise les LED même si entity_category = config/diagnostic
 */
function isValidLightForGroup(entity: HAEntity, reg?: EntityRegistry): boolean {
  const entityId = entity.entity_id;
  if (entityId.split(".")[0] !== "light") return false;

  // Whitelist explicite - toujours autoriser
  if (LIGHT_WHITELIST.includes(entityId)) return true;

  // DEBUG: Log pour light.spot
  if (entityId === "light.spot") {
    console.log("[Neolia DEBUG] isValidLightForGroup light.spot - registry:", reg);
    console.log("[Neolia DEBUG] isValidLightForGroup light.spot - hidden_by:", reg?.hidden_by);
    console.log("[Neolia DEBUG] isValidLightForGroup light.spot - disabled_by:", reg?.disabled_by);
  }

  // Entité cachée ou désactivée
  if (reg?.hidden_by) {
    if (entityId === "light.spot") console.log("[Neolia DEBUG] light.spot REJETÉ par hidden_by");
    return false;
  }
  if (reg?.disabled_by) {
    if (entityId === "light.spot") console.log("[Neolia DEBUG] light.spot REJETÉ par disabled_by");
    return false;
  }

  // Filtre sur le friendly_name (mais pas sur entity_category pour les lights)
  const name = (entity.attributes?.friendly_name || entityId).toLowerCase();
  if (LIGHT_BLOCKED_KEYWORDS.some((k) => name.includes(k))) {
    if (entityId === "light.spot") console.log("[Neolia DEBUG] light.spot REJETÉ par keyword:", name);
    return false;
  }

  if (entityId === "light.spot") console.log("[Neolia DEBUG] light.spot ACCEPTÉ par isValidLightForGroup");
  return true;
}

/**
 * Filtre générique pour les autres domaines contrôlables (cover, fan, valve, media_player)
 */
function isGenericControllableEntity(entity: HAEntity, reg?: EntityRegistry): boolean {
  const entityId = entity.entity_id;

  // Entité cachée ou désactivée
  if (reg?.hidden_by || reg?.disabled_by) return false;

  // Pas de diagnostic/config pour les domaines génériques
  if (reg?.entity_category === "diagnostic" || reg?.entity_category === "config") {
    return false;
  }

  // Filtre sur le friendly_name
  const name = (entity.attributes?.friendly_name || entityId).toLowerCase();
  if (GENERIC_BLOCKED_KEYWORDS.some((k) => name.includes(k))) {
    return false;
  }

  return true;
}

/**
 * Pipeline central de filtrage par domaine
 * Applique le filtre spécifique au domaine demandé
 */
export function filterEntitiesForDomain(
  domain: string,
  entities: HAEntity[],
  entityRegistry: EntityRegistry[]
): HAEntity[] {
  // 1) Garde uniquement le bon domaine
  let filtered = entities.filter((e) => e.entity_id.split(".")[0] === domain);

  // 2) Applique un filtre spécifique au domaine
  switch (domain) {
    case "switch":
      filtered = filtered.filter((e) => {
        const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
        return isValidSwitchForGroup(e, reg);
      });
      break;
    case "light":
      filtered = filtered.filter((e) => {
        const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
        return isValidLightForGroup(e, reg);
      });
      break;
    default:
      // cover, fan, valve, media_player, climate, lock
      filtered = filtered.filter((e) => {
        const reg = entityRegistry.find((r) => r.entity_id === e.entity_id);
        return isGenericControllableEntity(e, reg);
      });
  }

  return filtered;
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
 * Utilise le pipeline central de filtrage par domaine
 */
export function getEntitiesForDomains(
  entities: HAEntity[],
  domains: string[],
  entityRegistry: EntityRegistry[],
  devices: HADevice[],
  areas: HAArea[],
  floors: HAFloor[]
): DeviceDisplayInfo[] {
  // 1) Appliquer le filtre spécifique pour chaque domaine
  let filtered: HAEntity[] = [];
  for (const domain of domains) {
    const domainEntities = filterEntitiesForDomain(domain, entities, entityRegistry);
    filtered.push(...domainEntities);
  }

  // 2) Gérer les double-modules (garder canaux individuels, ignorer maître)
  const finalFiltered = filterDoubleModuleEntities(filtered, entityRegistry);

  // 3) Enrichir avec infos de localisation et trier
  return finalFiltered
    .map((e) => getDeviceDisplayInfo(e, entityRegistry, devices, areas, floors))
    .sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));
}
