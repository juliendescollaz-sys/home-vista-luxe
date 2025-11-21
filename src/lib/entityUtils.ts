import { HAEntity, EntityDomain } from "@/types/homeassistant";

/**
 * Extrait le domaine d'une entity_id
 */
export function getEntityDomain(entityId: string): EntityDomain {
  return entityId.split(".")[0] as EntityDomain;
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
