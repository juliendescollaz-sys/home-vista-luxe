import { logger } from "@/lib/logger";
import type { HAFloor } from "@/types/homeassistant";

export interface NeoliaFloorAsset {
  floorId: string;
  floorName: string;
  jsonAvailable: boolean;
  pngAvailable: boolean;
}

/**
 * Normalise l'URL de base Home Assistant
 */
function normalizeBaseUrl(baseUrl: string): string {
  // Enlever les trailing slashes
  let normalized = baseUrl.replace(/\/+$/, "");
  
  // Si c'est une URL WebSocket, la convertir en HTTP(S)
  if (normalized.startsWith("wss://")) {
    normalized = normalized.replace("wss://", "https://");
  } else if (normalized.startsWith("ws://")) {
    normalized = normalized.replace("ws://", "http://");
  }
  
  // Enlever /api/websocket si présent
  normalized = normalized.replace(/\/api\/websocket$/, "");
  
  return normalized;
}

/**
 * Vérifie la disponibilité d'un asset Neolia via GET
 */
async function checkAssetAvailability(
  url: string,
  token: string,
  assetType: string,
  floorId: string
): Promise<boolean> {
  console.debug(`🔍 Vérification ${assetType} pour ${floorId}:`, url);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // Utiliser cache pour éviter de télécharger le fichier complet
      cache: "no-cache",
    });
    
    const available = response.status === 200;
    
    if (available) {
      console.debug(`✅ ${assetType} disponible pour ${floorId} (${response.status})`);
    } else {
      console.debug(`❌ ${assetType} non disponible pour ${floorId} (${response.status})`);
    }
    
    return available;
  } catch (error) {
    console.warn(`⚠️ Erreur lors de la vérification ${assetType} pour ${floorId}:`, error);
    return false;
  }
}

/**
 * Vérifie la disponibilité des assets Neolia pour un étage donné
 */
export async function checkNeoliaAssetsForFloor(
  floorId: string,
  baseUrl: string,
  token: string
): Promise<{ floorId: string; jsonAvailable: boolean; pngAvailable: boolean }> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  
  console.debug(`🏠 Vérification assets Neolia pour l'étage: ${floorId}`);
  console.debug(`📍 Base URL normalisée: ${normalizedBaseUrl}`);

  const jsonUrl = `${normalizedBaseUrl}/local/neolia/${floorId}.json`;
  const pngUrl = `${normalizedBaseUrl}/local/neolia/${floorId}.png`;

  // Vérifier les deux assets en parallèle
  const [jsonAvailable, pngAvailable] = await Promise.all([
    checkAssetAvailability(jsonUrl, token, "JSON", floorId),
    checkAssetAvailability(pngUrl, token, "PNG", floorId),
  ]);

  return {
    floorId,
    jsonAvailable,
    pngAvailable,
  };
}

/**
 * Vérifie la disponibilité des assets Neolia pour tous les étages
 */
export async function checkAllFloorsNeoliaAssets(
  floors: HAFloor[],
  baseUrl: string,
  token: string
): Promise<NeoliaFloorAsset[]> {
  if (!baseUrl || !token) {
    console.warn("⚠️ BaseURL ou token manquant pour la vérification des assets Neolia");
    return [];
  }

  if (!floors || floors.length === 0) {
    console.debug("ℹ️ Aucun étage à vérifier");
    return [];
  }

  console.log(`🔄 Vérification des assets Neolia pour ${floors.length} étage(s)...`);

  const results = await Promise.all(
    floors.map(async (floor) => {
      const { jsonAvailable, pngAvailable } = await checkNeoliaAssetsForFloor(
        floor.floor_id,
        baseUrl,
        token
      );

      return {
        floorId: floor.floor_id,
        floorName: floor.name,
        jsonAvailable,
        pngAvailable,
      };
    })
  );

  console.log("✅ Vérification des assets Neolia terminée");
  console.table(results);
  
  return results;
}
