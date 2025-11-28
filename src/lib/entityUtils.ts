import { HAEntity, EntityDomain, HADevice } from "@/types/homeassistant";

/**
 * Domaines de contrôle qui doivent apparaître en tuiles
 */
export const CONTROL_DOMAINS: EntityDomain[] = [
  "media_player",
  "light",
  "switch",
  "cover",
  "climate",
  "fan",
  "lock",
  "scene",
  "script",
];

/**
 * Domaines multi-canaux : on garde TOUTES les entités valides par device
 * (ex: double relais = 2 switches visibles)
 */
const MULTI_CHANNEL_DOMAINS: EntityDomain[] = [
  "switch",
  "light",
  "cover",
  "fan",
];

/**
 * Domaines à entité unique : une seule entité principale par device
 * (ex: Sonos = 1 seule tuile media_player)
 */
const SINGLE_PRIMARY_DOMAINS: EntityDomain[] = [
  "media_player",
  "climate",
  "lock",
  "scene",
  "script",
];

/**
 * Priorité des domaines pour déterminer l'entité principale (SINGLE_PRIMARY_DOMAINS uniquement)
 */
const DOMAIN_PRIORITY: EntityDomain[] = [
  "media_player",
  "climate",
  "lock",
  "scene",
  "script",
];

/**
 * Interface pour les entrées du registry d'entités
 */
export interface EntityRegistryEntry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  disabled_by?: string | null;
  entity_category?: "diagnostic" | "config" | null;
  hidden_by?: string | null;
}

/**
 * Vérifie si une entité est visible pour l'utilisateur (non cachée, non désactivée, non technique)
 * À utiliser comme filtre de base avant tout autre filtre métier.
 */
export function isEntityVisibleForUser(
  entity: HAEntity,
  reg?: EntityRegistryEntry | null
): boolean {
  const domain = getEntityDomain(entity.entity_id);

  // On ne considère que les domaines "pilotables"
  if (!CONTROL_DOMAINS.includes(domain)) return false;

  // Filtrage registry
  if (reg?.hidden_by) return false; // Cachée par intégration ou utilisateur
  if (reg?.entity_category === "config" || reg?.entity_category === "diagnostic") return false;
  if (reg?.disabled_by) return false;

  return true;
}

// ============================================================================
// FILTRAGE CENTRALISÉ DES ENTITÉS CONTRÔLABLES (Appareils actifs, Groupes, etc.)
// ============================================================================

/**
 * Domaines binaires contrôlables pour les groupes mixtes
 * Ces domaines supportent turn_on/turn_off via homeassistant.turn_on/off
 */
export const BINARY_CONTROLLABLE_DOMAINS = [
  "light",
  "switch",
  "fan",
  "valve",
  "cover",
];

/**
 * Filtre les entités pour ne garder que celles vraiment contrôlables (binaires)
 * Utilisé pour les groupes mixtes afin d'éviter d'envoyer des sensors à HA
 */
export function getControllableBinaryEntities(
  entityIds: string[],
  allEntities: HAEntity[]
): HAEntity[] {
  return entityIds
    .map((id) => allEntities.find((e) => e.entity_id === id))
    .filter((e): e is HAEntity => !!e)
    .filter((e) => BINARY_CONTROLLABLE_DOMAINS.includes(getEntityDomain(e.entity_id)));
}

/**
 * Vérifie si une entité est pertinente pour le suivi de l'état d'un groupe
 * (pour filtrer les state_changed events)
 */
export function isRelevantForGroupPending(entity: HAEntity): boolean {
  return BINARY_CONTROLLABLE_DOMAINS.includes(getEntityDomain(entity.entity_id));
}

/**
 * Calcule l'état global d'un groupe mixte (ON si au moins une entité contrôlable est allumée)
 */
export function getMixedGroupState(
  entityIds: string[],
  allEntities: HAEntity[]
): "on" | "off" {
  const entities = getControllableBinaryEntities(entityIds, allEntities);

  if (!entities.length) return "off";

  // Un seul appareil "on" ou "open" => le groupe est considéré "on"
  const anyOn = entities.some((e) => e.state === "on" || e.state === "open");

  return anyOn ? "on" : "off";
}

/**
 * Domaines contrôlables pour les appareils actifs et les groupes
 */
export const CONTROLLABLE_DOMAINS = [
  "light",
  "switch",
  "cover",
  "fan",
  "valve",
  "media_player",
  "climate",
  "lock",
];

/**
 * Whitelist pour les entités spéciales mal classées par HA
 */
const CONTROLLABLE_WHITELIST = [
  "light.home_assistant_connect_zwa_2_led"
];

/**
 * Mots-clés bloquants pour exclure les entités de mesure/état/feedback
 */
const CONTROLLABLE_BLOCKED_KEYWORDS = [
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
  "volt",
  "battery",
  "batterie",
  "signal",
  "rssi",
  // Sonos advanced controls
  "crossfade",
  "touch_controls",
  "contrôles tactiles",
  "night_sound",
  "night sound",
  "mode_nuit",
  "mode nuit",
  "son mode nuit",
  "dialogue_enhancement",
  "dialogue enhancement",
  "amélioration des dialogues",
  "surround",
  "sub_enabled",
  "sub enabled",
  "bass_boost",
  "bass boost",
  "treble",
  "speech_enhancement",
  "speech enhancement",
];

/**
 * Vérifie si une entité est contrôlable (pour Appareils actifs, Groupes, etc.)
 * Cette fonction est la source unique de vérité pour déterminer si une entité
 * peut être affichée comme appareil contrôlable.
 */
export function isControllableEntity(
  entity: HAEntity,
  reg?: EntityRegistryEntry | null
): boolean {
  const entityId = entity.entity_id;
  const domain = getEntityDomain(entityId);

  // Whitelist explicite - toujours autoriser
  if (CONTROLLABLE_WHITELIST.includes(entityId)) return true;

  // Domaine contrôlable uniquement
  if (!CONTROLLABLE_DOMAINS.includes(domain)) return false;

  // Entité cachée ou désactivée = exclure
  if (reg?.hidden_by) return false;
  if (reg?.disabled_by) return false;

  // Pas d'unités de mesure (sensor déguisé)
  if (entity.attributes?.unit_of_measurement) {
    return false;
  }

  // Pour les switches, exclure les entités config/diagnostic (options avancées Sonos, etc.)
  if (domain === "switch" && (reg?.entity_category === "config" || reg?.entity_category === "diagnostic")) {
    return false;
  }

  // Filtre sur le friendly_name ET l'entity_id
  const name = (entity.attributes?.friendly_name || "").toLowerCase();
  const idLower = entityId.toLowerCase();
  
  if (CONTROLLABLE_BLOCKED_KEYWORDS.some((k) => name.includes(k) || idLower.includes(k))) {
    return false;
  }

  return true;
}

/**
 * Vérifie si une entité est dans un état "actif"
 */
export function isEntityActive(entity: HAEntity): boolean {
  const domain = getEntityDomain(entity.entity_id) as string;
  const state = entity.state;

  switch (domain) {
    case "light":
    case "switch":
    case "fan":
    case "valve":
    case "lock":
      return state === "on";

    case "cover":
      return state !== "closed";

    case "climate":
      return state !== "off";

    case "media_player":
      return state === "playing";

    default:
      return false;
  }
}

/**
 * Extrait le domaine d'une entity_id
 */
export function getEntityDomain(entityId: string): EntityDomain {
  return entityId.split(".")[0] as EntityDomain;
}

/**
 * Détermine si une entité est l'entité de contrôle principale pour affichage en tuile.
 * 
 * Critères d'exclusion :
 * - Entités désactivées (disabled_by)
 * - Entités avec entity_category = "diagnostic" ou "config"
 * - Domaines non-contrôlables (hors CONTROL_DOMAINS)
 * 
 * Pour les devices avec plusieurs entités, seule l'entité avec la meilleure
 * priorité de domaine est considérée comme "principale".
 */
export function isPrimaryControlEntity(
  entity: HAEntity,
  entityRegistry: EntityRegistryEntry[],
  devices: HADevice[],
  allEntities: HAEntity[]
): boolean {
  const entityId = entity.entity_id;
  const domain = getEntityDomain(entityId);
  
  // 1) Exclure les domaines non-contrôlables
  if (!CONTROL_DOMAINS.includes(domain)) {
    return false;
  }
  
  // 2) Chercher l'entrée registry
  const reg = entityRegistry.find((r) => r.entity_id === entityId);
  
  // 3) Exclure les entités désactivées
  if (reg?.disabled_by) {
    return false;
  }
  
  // 4) Exclure les entités diagnostic ou config
  if (reg?.entity_category === "diagnostic" || reg?.entity_category === "config") {
    return false;
  }
  
  // 5) Exclure les entités cachées
  if (reg?.hidden_by) {
    return false;
  }
  
  // 6) Pour les domaines multi-canaux (switch, light, cover, fan),
  //    on garde TOUTES les entités valides du device (double relais, multi-circuits)
  if (MULTI_CHANNEL_DOMAINS.includes(domain)) {
    return true;
  }
  
  // 7) Pour les domaines à entité unique (media_player, climate, lock, scene, script),
  //    appliquer la règle "une seule entité principale par device"
  if (SINGLE_PRIMARY_DOMAINS.includes(domain)) {
    const deviceId = reg?.device_id;
    
    // Sans device_id, l'entité est considérée comme principale
    if (!deviceId) {
      return true;
    }
    
    // Trouver toutes les entités SINGLE_PRIMARY du même device
    const deviceEntities = allEntities.filter((e) => {
      const eReg = entityRegistry.find((r) => r.entity_id === e.entity_id);
      if (eReg?.device_id !== deviceId) return false;
      if (eReg?.disabled_by) return false;
      if (eReg?.entity_category === "diagnostic" || eReg?.entity_category === "config") return false;
      if (eReg?.hidden_by) return false;
      const eDomain = getEntityDomain(e.entity_id);
      return SINGLE_PRIMARY_DOMAINS.includes(eDomain);
    });
    
    if (deviceEntities.length === 0) {
      return false;
    }
    
    // Trouver l'entité avec la meilleure priorité parmi SINGLE_PRIMARY_DOMAINS
    let bestEntity = deviceEntities[0];
    let bestPriority = DOMAIN_PRIORITY.indexOf(getEntityDomain(bestEntity.entity_id));
    if (bestPriority === -1) bestPriority = DOMAIN_PRIORITY.length;
    
    for (const e of deviceEntities) {
      const ePriority = DOMAIN_PRIORITY.indexOf(getEntityDomain(e.entity_id));
      const effectivePriority = ePriority === -1 ? DOMAIN_PRIORITY.length : ePriority;
      if (effectivePriority < bestPriority) {
        bestPriority = effectivePriority;
        bestEntity = e;
      }
    }
    
    // Cette entité est principale si c'est celle avec la meilleure priorité
    return entity.entity_id === bestEntity.entity_id;
  }
  
  // Fallback pour tout autre domaine dans CONTROL_DOMAINS
  return true;
}

/**
 * Filtre une liste d'entités pour ne garder que les entités de contrôle principales
 */
export function filterPrimaryControlEntities(
  entities: HAEntity[],
  entityRegistry: EntityRegistryEntry[],
  devices: HADevice[]
): HAEntity[] {
  return entities.filter((entity) => 
    isPrimaryControlEntity(entity, entityRegistry, devices, entities)
  );
}

/**
 * Vérifie si une entité supporte une feature spécifique
 */
export function supportsFeature(entity: HAEntity, feature: number): boolean {
  const supportedFeatures = entity.attributes.supported_features || 0;
  return (supportedFeatures & feature) !== 0;
}

/**
 * Constantes de features pour chaque domaine
 */
export const LIGHT_FEATURES = {
  SUPPORT_BRIGHTNESS: 1,
  SUPPORT_COLOR_TEMP: 2,
  SUPPORT_EFFECT: 4,
  SUPPORT_FLASH: 8,
  SUPPORT_COLOR: 16,
  SUPPORT_TRANSITION: 32,
  SUPPORT_WHITE_VALUE: 128,
};

export const COVER_FEATURES = {
  SUPPORT_OPEN: 1,
  SUPPORT_CLOSE: 2,
  SUPPORT_SET_POSITION: 4,
  SUPPORT_STOP: 8,
  SUPPORT_OPEN_TILT: 16,
  SUPPORT_CLOSE_TILT: 32,
  SUPPORT_STOP_TILT: 64,
  SUPPORT_SET_TILT_POSITION: 128,
};

export const CLIMATE_FEATURES = {
  SUPPORT_TARGET_TEMPERATURE: 1,
  SUPPORT_TARGET_TEMPERATURE_RANGE: 2,
  SUPPORT_TARGET_HUMIDITY: 4,
  SUPPORT_FAN_MODE: 8,
  SUPPORT_PRESET_MODE: 16,
  SUPPORT_SWING_MODE: 32,
  SUPPORT_AUX_HEAT: 64,
};

export const FAN_FEATURES = {
  SUPPORT_SET_SPEED: 1,
  SUPPORT_OSCILLATE: 2,
  SUPPORT_DIRECTION: 4,
  SUPPORT_PRESET_MODE: 8,
};

/**
 * Détermine si une entité est contrôlable
 */
export function isControllable(entity: HAEntity): boolean {
  const domain = getEntityDomain(entity.entity_id);
  const controllableDomains: EntityDomain[] = [
    "light",
    "switch",
    "cover",
    "climate",
    "fan",
    "lock",
    "media_player",
    "button",
    "scene",
    "script",
  ];
  return controllableDomains.includes(domain);
}

/**
 * Détermine si une entité est un capteur
 */
export function isSensor(entity: HAEntity): boolean {
  const domain = getEntityDomain(entity.entity_id);
  return domain === "sensor" || domain === "binary_sensor";
}

/**
 * Détermine si une entité est une alerte/sécurité
 */
export function isAlert(entity: HAEntity): boolean {
  if (getEntityDomain(entity.entity_id) !== "binary_sensor") return false;
  
  const deviceClass = entity.attributes.device_class;
  const alertClasses = [
    "motion",
    "door",
    "window",
    "opening",
    "smoke",
    "gas",
    "moisture",
    "problem",
    "safety",
    "tamper",
    "vibration",
  ];
  
  return alertClasses.includes(deviceClass || "");
}

/**
 * Détermine si une entité est un update (firmware OTA)
 */
export function isUpdate(entity: HAEntity): boolean {
  return getEntityDomain(entity.entity_id) === "update";
}

/**
 * Format une valeur de capteur avec son unité
 */
export function formatSensorValue(value: string | number, unit?: string): string {
  if (value === "unavailable" || value === "unknown") return "—";
  
  const numValue = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(numValue)) return String(value);
  
  // Arrondi selon le type d'unité
  let formatted: string;
  if (unit === "°C" || unit === "°F") {
    formatted = Math.round(numValue).toString();
  } else if (unit === "%") {
    formatted = Math.round(numValue).toString();
  } else if (unit === "W" || unit === "kWh") {
    formatted = numValue.toFixed(1);
  } else {
    formatted = numValue.toFixed(1);
  }
  
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Vérifie si la batterie est trop faible pour un update
 */
export function isBatteryTooLow(entity: HAEntity): boolean {
  const battery = entity.attributes.battery_level;
  if (typeof battery !== "number") return false;
  return battery < 30;
}

/**
 * Vérifie si un appareil est endormi (Z-Wave sleeping)
 */
export function isSleeping(entity: HAEntity): boolean {
  return entity.state === "unavailable" || entity.attributes.assumed_state === true;
}

/**
 * Obtient le niveau de criticité d'une alerte
 */
export function getAlertSeverity(entity: HAEntity): "critical" | "warning" | "info" {
  if (entity.state !== "on") return "info";
  
  const deviceClass = entity.attributes.device_class;
  const criticalClasses = ["smoke", "gas", "safety", "problem"];
  const warningClasses = ["motion", "door", "window", "moisture", "tamper"];
  
  if (criticalClasses.includes(deviceClass || "")) return "critical";
  if (warningClasses.includes(deviceClass || "")) return "warning";
  return "info";
}

/**
 * Détermine le meilleur widget à utiliser pour une entité
 */
export function getBestWidgetForEntity(entity: HAEntity): "tile" | "sensor" | "alert" | "update" | "control" {
  if (isUpdate(entity)) return "update";
  if (isAlert(entity)) return "alert";
  if (isSensor(entity)) return "sensor";
  if (isControllable(entity)) return "tile";
  return "control";
}

/**
 * Obtient les entités d'un device
 */
export function getDeviceEntities(
  deviceId: string,
  entities: HAEntity[],
  entityRegistry: Array<{ entity_id: string; device_id?: string }>
): HAEntity[] {
  const deviceEntityIds = entityRegistry
    .filter((reg) => reg.device_id === deviceId)
    .map((reg) => reg.entity_id);
  
  return entities.filter((entity) => deviceEntityIds.includes(entity.entity_id));
}

/**
 * Traduit les device_class en français
 */
export function translateDeviceClass(deviceClass?: string): string {
  const translations: Record<string, string> = {
    motion: "Mouvement",
    door: "Porte",
    window: "Fenêtre",
    opening: "Ouverture",
    smoke: "Fumée",
    gas: "Gaz",
    moisture: "Fuite",
    problem: "Problème",
    safety: "Sécurité",
    tamper: "Anti-sabotage",
    vibration: "Vibration",
    temperature: "Température",
    humidity: "Humidité",
    pressure: "Pression",
    battery: "Batterie",
    power: "Puissance",
    energy: "Énergie",
    illuminance: "Luminosité",
  };
  
  return translations[deviceClass || ""] || deviceClass || "Capteur";
}
