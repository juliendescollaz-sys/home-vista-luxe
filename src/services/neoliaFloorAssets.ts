import { logger } from "@/lib/logger";
import type { HAFloor } from "@/types/homeassistant";

export interface NeoliaFloorAsset {
  floorId: string;
  floorName: string;
  jsonAvailable: boolean;
  pngAvailable: boolean;
}

/**
 * Vérifie la disponibilité des assets Neolia pour un étage donné
 */
export async function checkNeoliaAssetsForFloor(
  floorId: string,
  baseUrl: string,
  token: string
): Promise<{ floorId: string; jsonAvailable: boolean; pngAvailable: boolean }> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  const jsonUrl = `${normalizedBaseUrl}/local/neolia/${floorId}.json`;
  const pngUrl = `${normalizedBaseUrl}/local/neolia/${floorId}.png`;

  let jsonAvailable = false;
  let pngAvailable = false;

  // Vérifier le JSON
  try {
    const jsonResponse = await fetch(jsonUrl, {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    jsonAvailable = jsonResponse.ok;
    if (!jsonResponse.ok) {
      logger.debug(`JSON non disponible pour ${floorId}: ${jsonResponse.status}`);
    }
  } catch (error) {
    logger.warn(`Erreur lors de la vérification JSON pour ${floorId}:`, error);
    jsonAvailable = false;
  }

  // Vérifier le PNG
  try {
    const pngResponse = await fetch(pngUrl, {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    pngAvailable = pngResponse.ok;
    if (!pngResponse.ok) {
      logger.debug(`PNG non disponible pour ${floorId}: ${pngResponse.status}`);
    }
  } catch (error) {
    logger.warn(`Erreur lors de la vérification PNG pour ${floorId}:`, error);
    pngAvailable = false;
  }

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
  if (!floors || floors.length === 0) {
    logger.info("Aucun étage à vérifier");
    return [];
  }

  logger.info(`Vérification des assets Neolia pour ${floors.length} étages...`);

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

  logger.info("Vérification des assets Neolia terminée:", results);
  return results;
}
