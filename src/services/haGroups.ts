/**
 * Service pour la gestion des groupes Home Assistant
 */

import { useHAStore } from "@/store/useHAStore";
import type { HaGroupDomain, NeoliaGroup } from "@/types/groups";

/** =========================
 *  ICON MAPPING (MDI <-> Lucide)
 *  ========================= */

const MDI_TO_LUCIDE: Record<string, string> = {
  // Appareils
  "lightbulb": "Lightbulb", "lightbulb-outline": "Lightbulb", "lightbulb-group": "Lightbulb",
  "lamp": "Lamp", "floor-lamp": "Lamp", "desk-lamp": "Lamp",
  "ceiling-light": "Lightbulb", "track-light": "Lightbulb", "led-strip": "Lightbulb",
  "television": "Tv", "tv": "Tv", "monitor": "Monitor",
  "speaker": "Speaker", "speaker-wireless": "Speaker", "cast-audio": "Speaker",
  "fan": "Fan", "fan-off": "Fan",
  "air-conditioner": "AirVent", "hvac": "AirVent",
  "thermometer": "Thermometer", "temperature-celsius": "Thermometer",
  "power-plug": "Plug", "power-socket": "Plug", "power": "Power",
  "blinds": "Blinds", "blinds-horizontal": "Blinds", "blinds-vertical": "Blinds",
  "window-shutter": "Blinds", "roller-shade": "Blinds",
  "garage": "Warehouse", "garage-open": "Warehouse",
  "door": "DoorOpen", "door-open": "DoorOpen", "door-closed": "DoorClosed",
  "lock": "Lock", "lock-open": "Unlock",
  
  // Maison
  "home": "Home", "home-outline": "Home", "home-automation": "Home",
  "sofa": "Sofa", "bed": "Bed", "shower": "ShowerHead", "bathtub": "Bath",
  "fridge": "Refrigerator", "washing-machine": "WashingMachine", "dishwasher": "UtensilsCrossed",
  "stove": "CookingPot", "microwave": "Microwave", "coffee": "Coffee",
  "pool": "Waves", "hot-tub": "Waves",
  
  // Actions/États
  "play": "Play", "pause": "Pause", "stop": "Square",
  "volume-high": "Volume2", "volume-medium": "Volume1", "volume-low": "Volume",
  "bell": "Bell", "bell-ring": "BellRing",
  "timer": "Timer", "clock": "Clock", "alarm": "Alarm",
  "calendar": "Calendar", "calendar-clock": "CalendarClock",
  "sun": "Sun", "weather-sunny": "Sun", "moon": "Moon", "weather-night": "Moon",
  "sunrise": "Sunrise", "sunset": "Sunset",
  
  // Général
  "star": "Star", "heart": "Heart", "bookmark": "Bookmark",
  "cog": "Settings", "settings": "Settings", "wrench": "Wrench",
  "information": "Info", "alert": "AlertTriangle", "check": "Check",
  "layers": "Layers", "group": "Layers", "folder": "Folder",
  "package": "Package", "box": "Box",
  "zap": "Zap", "flash": "Zap", "lightning-bolt": "Zap",
  "fire": "Flame", "flame": "Flame",
  "water": "Droplet", "water-outline": "Droplet",
  "leaf": "Leaf", "tree": "TreeDeciduous", "flower": "Flower2",
  "car": "Car", "bike": "Bike", "walk": "PersonStanding",
  "wifi": "Wifi", "bluetooth": "Bluetooth", "cast": "Cast",
  "camera": "Camera", "video": "Video", "music": "Music",
  "palette": "Palette", "brush": "Paintbrush",
  "sparkles": "Sparkles", "auto-fix": "Sparkles",
  "party-popper": "PartyPopper", "confetti": "PartyPopper",
  "crown": "Crown", "gem": "Gem", "diamond": "Gem",
};

const LUCIDE_TO_MDI: Record<string, string> = {
  // Appareils
  "Lightbulb": "mdi:lightbulb", "Lamp": "mdi:lamp", "LampDesk": "mdi:desk-lamp",
  "Tv": "mdi:television", "Monitor": "mdi:monitor", "Speaker": "mdi:speaker",
  "Fan": "mdi:fan", "AirVent": "mdi:air-conditioner", "Thermometer": "mdi:thermometer",
  "Plug": "mdi:power-plug", "Power": "mdi:power",
  "Blinds": "mdi:blinds", "Warehouse": "mdi:garage",
  "DoorOpen": "mdi:door-open", "DoorClosed": "mdi:door-closed",
  "Lock": "mdi:lock", "Unlock": "mdi:lock-open",
  
  // Maison
  "Home": "mdi:home", "Sofa": "mdi:sofa", "Bed": "mdi:bed",
  "ShowerHead": "mdi:shower", "Bath": "mdi:bathtub",
  "Refrigerator": "mdi:fridge", "WashingMachine": "mdi:washing-machine",
  "CookingPot": "mdi:stove", "Coffee": "mdi:coffee",
  "Waves": "mdi:pool",
  
  // Actions/États
  "Play": "mdi:play", "Pause": "mdi:pause", "Square": "mdi:stop",
  "Volume2": "mdi:volume-high", "Volume1": "mdi:volume-medium", "Volume": "mdi:volume-low",
  "Bell": "mdi:bell", "BellRing": "mdi:bell-ring",
  "Timer": "mdi:timer", "Clock": "mdi:clock", "Alarm": "mdi:alarm",
  "Calendar": "mdi:calendar", "CalendarClock": "mdi:calendar-clock",
  "Sun": "mdi:sun", "Moon": "mdi:moon", "Sunrise": "mdi:sunrise", "Sunset": "mdi:sunset",
  
  // Général
  "Star": "mdi:star", "Heart": "mdi:heart", "Bookmark": "mdi:bookmark",
  "Settings": "mdi:cog", "Wrench": "mdi:wrench",
  "Info": "mdi:information", "AlertTriangle": "mdi:alert", "Check": "mdi:check",
  "Layers": "mdi:layers", "Folder": "mdi:folder",
  "Package": "mdi:package", "Box": "mdi:box",
  "Zap": "mdi:flash", "Flame": "mdi:fire",
  "Droplet": "mdi:water", "Leaf": "mdi:leaf", "TreeDeciduous": "mdi:tree", "Flower2": "mdi:flower",
  "Car": "mdi:car", "Bike": "mdi:bike", "PersonStanding": "mdi:walk",
  "Wifi": "mdi:wifi", "Bluetooth": "mdi:bluetooth", "Cast": "mdi:cast",
  "Camera": "mdi:camera", "Video": "mdi:video", "Music": "mdi:music",
  "Palette": "mdi:palette", "Paintbrush": "mdi:brush",
  "Sparkles": "mdi:sparkles", "PartyPopper": "mdi:party-popper",
  "Crown": "mdi:crown", "Gem": "mdi:gem",
};

/** Convert MDI icon to Lucide icon name */
function mdiToLucide(mdiIcon?: string): string | undefined {
  if (!mdiIcon) return undefined;
  const iconName = mdiIcon.replace("mdi:", "");
  return MDI_TO_LUCIDE[iconName];
}

/** Convert Lucide icon name to MDI format */
function lucideToMdi(lucideIcon?: string): string | undefined {
  if (!lucideIcon) return undefined;
  return LUCIDE_TO_MDI[lucideIcon];
}

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
  icon?: string; // Lucide icon name
}): Promise<NeoliaGroup> {
  const { name, domain, entityIds, icon } = params;

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

  // Build service data with optional icon
  const serviceData: Record<string, any> = {
    object_id: objectId,
    name: name.trim(),
    entities: entityIds,
  };

  // Convert Lucide icon to MDI and add to service data
  const mdiIcon = lucideToMdi(icon);
  if (mdiIcon) {
    serviceData.icon = mdiIcon;
  }

  // Appel à l'API Home Assistant via WebSocket
  try {
    await callHAService("group", "set", serviceData);
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
    scope: "shared",
    icon, // Store Lucide icon name
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
        
        // Convert MDI icon to Lucide
        const lucideIcon = mdiToLucide(attrs.icon);
        
        return {
          id: entityId.replace("group.", ""),
          name: attrs.friendly_name || entityId,
          domain,
          entityIds: members,
          haEntityId: entityId,
          scope: "shared",
          icon: lucideIcon, // Lucide icon from HA
        } as NeoliaGroup;
      });
  } catch (error: any) {
    console.error("Erreur lors de la récupération des groupes partagés:", error);
    throw new Error("Impossible de récupérer les groupes partagés");
  }
}
